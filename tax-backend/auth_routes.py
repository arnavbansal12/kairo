from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from auth import authenticate_user, create_user, update_user_preferences
from auth_dependencies import get_current_user_from_header

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None

class UpdatePreferencesRequest(BaseModel):
    preferences: Dict[str, Any]

@router.post("/login")
async def login(data: LoginRequest):
    result = authenticate_user(data.email, data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Restructure for frontend expectation
    token = result.pop("token")
    return {
        "token": token,
        "user": result
    }

@router.post("/register")
async def register(data: RegisterRequest):
    try:
        # Create user
        create_user(
            username=data.username,
            email=data.email,
            password=data.password,
            display_name=data.display_name
        )
        # Auto-login
        result = authenticate_user(data.email, data.password)
        if not result:
             raise HTTPException(status_code=500, detail="Registration successful but auto-login failed")
             
        token = result.pop("token")
        return {
            "token": token,
            "user": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
async def get_current_user_profile(user: dict = Depends(get_current_user_from_header)):
    return {"user": user}

@router.put("/preferences")
async def update_preferences_endpoint(
    data: UpdatePreferencesRequest,
    user: dict = Depends(get_current_user_from_header)
):
    success = update_user_preferences(user["id"], data.preferences)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    return {"status": "success", "preferences": data.preferences}
