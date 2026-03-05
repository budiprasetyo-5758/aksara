"""
AKSARA RSCM — Authentication Service
Middleware for verifying Supabase JWTs and user roles.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from typing import Optional

from config import settings
from services.supabase_client import supabase

security = HTTPBearer()

# Supabase JWT Secret is often the same as the anon key for custom token signing
# But typically with Supabase, you decode using the Supabase JWT Secret
JWT_SECRET = settings.SUPABASE_ANON_KEY  # Default to anon key if secret isn't provided
# In production, you would ideally use the actual JWT secret from Supabase Dashboard -> API -> JWT Secret

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token from Supabase and returns the user object.
    Since we don't have the JWT Secret directly in env for this project 
    (usually requires SUPABASE_JWT_SECRET), we can verify via the Supabase Auth API
    as a foolproof method that doesn't rely on local secret verification.
    """
    token = credentials.credentials
    
    try:
        # Verify token by fetching user from Supabase 
        # This is more secure than local decoding if we lack the exact JWT secret
        res = supabase.auth.get_user(token)
        user = res.user
        
        if not user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Now fetch user profile to get role
        profile_res = supabase.table("profiles").select("role").eq("id", user.id).execute()
        role = "user"
        if profile_res.data and len(profile_res.data) > 0:
            role = profile_res.data[0].get("role", "user")
            
        return {
            "id": user.id,
            "email": user.email,
            "role": role
        }
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
