"""
AKSARA RSCM — Authentication Service
Middleware for verifying Supabase JWTs and user roles.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from config import settings
from services.supabase_client import get_supabase_client

security = HTTPBearer()

# Create an anon-key client specifically for JWT verification
# The anon client can call auth.get_user(token) to validate tokens
_auth_client = None


def _get_auth_client():
    """Lazy singleton for the anon-key auth client."""
    global _auth_client
    if _auth_client is None:
        _auth_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY or settings.effective_service_key,
        )
    return _auth_client


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token from Supabase and returns the user object.
    Uses the Supabase Auth API to validate the token.
    """
    token = credentials.credentials

    try:
        # Verify token by fetching user from Supabase Auth API
        auth_client = _get_auth_client()
        res = auth_client.auth.get_user(token)
        user = res.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Fetch user profile to get role (using service-role client to bypass RLS)
        service_client = get_supabase_client()
        profile_res = service_client.table("profiles").select("role").eq("id", user.id).execute()
        role = "user"
        if profile_res.data and len(profile_res.data) > 0:
            role = profile_res.data[0].get("role", "user")

        return {
            "id": user.id,
            "email": user.email,
            "role": role,
        }
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
