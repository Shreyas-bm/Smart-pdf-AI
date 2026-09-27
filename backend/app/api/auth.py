import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User
from app.services.security import hash_password, verify_password, create_access_token, decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class AuthRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/register", response_model=TokenResponse)
def register(auth_data: AuthRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == auth_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed = hash_password(auth_data.password)
    
    # Create user
    new_user = User(
        email=auth_data.email,
        password_hash=hashed
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
def login(auth_data: AuthRequest, db: Session = Depends(get_db)):
    # Retrieve user
    user = db.query(User).filter(User.email == auth_data.email).first()
    if not user or not verify_password(auth_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to retrieve the current authenticated user.
    If a valid token is provided, returns that user.
    Otherwise, returns the default local user (bypass mode).
    """
    token = None
    
    # 1. Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
        
    # 2. Try to get token from cookie
    if not token and request:
        token = request.cookies.get("better-auth.session_token")
        
    if token:
        try:
            payload = decode_access_token(token)
            if payload:
                user_id_str = payload.get("sub")
                if user_id_str:
                    user_id = uuid.UUID(str(user_id_str))
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        return user
        except Exception:
            pass

    # Default local user bypass
    default_email = "local.user@smartpdf.ai"
    default_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    user = db.query(User).filter(User.id == default_id).first()
    if not user:
        user = db.query(User).filter(User.email == default_email).first()
        if not user:
            user = User(
                id=default_id,
                email=default_email,
                password_hash="local_bypass_hash"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # The user exists. Since our custom GUID type handles 0 -> UUID conversion in
            # process_result_value, we do not need to mutate the primary key here.
            pass
    return user

