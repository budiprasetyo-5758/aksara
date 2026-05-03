"""
AKSARA RSCM — Authentication Service
Middleware for verifying Supabase JWTs and user roles.
"""

import asyncio
import hashlib
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from config import settings
from services.supabase_client import get_supabase_client, get_authenticated_client

security = HTTPBearer()

# Create an anon-key client specifically for JWT verification
_auth_client = None

# ── TTL Cache for user auth data ─────────────────────────
# Eliminates 2 Supabase round-trips per request within the cache window.
_user_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL_SECONDS = 60  # Safe: role changes are rare admin operations


def _get_auth_client():
    """Lazy singleton for the anon-key auth client."""
    global _auth_client
    if _auth_client is None:
        _auth_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY,
        )
    return _auth_client


def _cache_key(token: str) -> str:
    """Hash the token for use as a cache key (avoids storing raw JWTs in memory)."""
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def _verify_and_fetch_user(token: str) -> dict:
    """Synchronous helper: verify JWT + fetch profile role. Runs in a thread."""
    auth_client = _get_auth_client()
    res = auth_client.auth.get_user(token)
    user = res.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user profile to get role using an authenticated client
    auth_db = get_authenticated_client(token)
    profile_res = auth_db.table("profiles").select("role").eq("id", user.id).execute()
    role = "user"
    if profile_res.data and len(profile_res.data) > 0:
        role = profile_res.data[0].get("role", "user")

    return {
        "id": user.id,
        "email": user.email,
        "role": role,
        "access_token": token,  # Pass token for authenticated DB operations
    }


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token from Supabase and returns user info + token.
    The access_token is included so routers can create authenticated Supabase clients.

    Uses a 60s TTL cache to avoid 2 Supabase round-trips on every request.
    """
    token = credentials.credentials
    key = _cache_key(token)

    # ── Check cache first ─────────────────────────────────
    cached = _user_cache.get(key)
    if cached:
        user_data, cached_at = cached
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            # Return cached data but always update the token (it may have been refreshed)
            return {**user_data, "access_token": token}
        else:
            del _user_cache[key]  # Expired

    # ── Cache miss: verify + fetch in a thread (non-blocking) ──
    try:
        user_data = await asyncio.to_thread(_verify_and_fetch_user, token)
        _user_cache[key] = (user_data, time.time())
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(user: dict = Depends(get_current_user)):
    """
    Dependency that enforces the user has an 'admin' role.
    """
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin role required.",
        )
    return user
