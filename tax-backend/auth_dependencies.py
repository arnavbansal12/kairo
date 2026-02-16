"""
Authentication dependency helpers for FastAPI endpoints
Provides middleware to extract and verify authenticated users from JWT tokens
"""

from fastapi import Header, HTTPException, Depends
from typing import Optional, Dict, Any
from auth import get_current_user, verify_token


def get_user_id_from_token(authorization: Optional[str] = Header(None)) -> int:
    """
    Extract user ID from Authorization header token.
    Raises 401 if token is missing or invalid.
    
    Usage in endpoints:
        @app.get("/clients")
        async def get_clients(user_id: int = Depends(get_user_id_from_token)):
            # user_id is now available
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    
    # Strip "Bearer " prefix if present
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Verify token and get payload
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload["user_id"]


def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Get complete user object from Authorization header.
    Raises 401 if token is missing or invalid.
    
    Usage in endpoints:
        @app.get("/profile")
        async def get_profile(user: dict = Depends(get_current_user_from_header)):
            # user dict is now available with id, username, email, etc.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    user = get_current_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


# For backward compatibility with existing code
async def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Alias for get_current_user_from_header"""
    return get_current_user_from_header(authorization)
