import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.services.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

security_bearer = HTTPBearer(auto_error=False)

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")

class UserLogin(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class OAuthRequest(BaseModel):
    provider: str = Field(..., description="OAuth provider: google or github")
    id_token: str = Field(..., description="OAuth credential token")

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    session_token: str
    user: UserResponse


# --- Dependency ---
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to retrieve the current authenticated user.
    Checks the 'Authorization: Bearer' header and 'better-auth.session_token' cookie.
    """
    token = None
    
    # 1. Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
        
    # 2. Try to get token from cookie
    if not token:
        token = request.cookies.get("better-auth.session_token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Missing authentication token."
        )
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token."
        )
        
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity."
        )
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token does not exist."
        )
        
    return user


# --- Endpoints ---

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, response: Response, db: Session = Depends(get_db)):
    """
    Register a new user, create session, set cookie, and return credentials.
    """
    # Normalize email
    email = user_in.email.strip().lower()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    # Create user
    password_hash = hash_password(user_in.password)
    user = User(
        email=email,
        password_hash=password_hash
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate session token
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    
    # Set cookie (valid for 7 days)
    response.set_cookie(
        key="better-auth.session_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {"session_token": token, "user": user}


@router.post("/login", response_model=AuthResponse)
def login(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate a user, generate session, set cookie, and return credentials.
    """
    email = user_in.email.strip().lower()
    
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
        
    # Generate session token
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    
    # Set cookie (valid for 7 days)
    response.set_cookie(
        key="better-auth.session_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {"session_token": token, "user": user}


@router.post("/logout")
def logout(response: Response):
    """
    Clear session cookie to sign out user.
    """
    response.delete_cookie(key="better-auth.session_token")
    return {"detail": "Successfully logged out."}


@router.get("/session", response_model=UserResponse)
def get_session(current_user: User = Depends(get_current_user)):
    """
    Retrieve user profile details for the currently active session.
    """
    return current_user


@router.post("/oauth", response_model=AuthResponse)
def oauth_login(oauth_in: OAuthRequest, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate or register a user using an OAuth provider token (Google/GitHub).
    Mock-validated for local development.
    """
    # For local development / demonstration, we extract or mock email from token
    # In production, this would call google/github APIs to verify the id_token
    token_str = oauth_in.id_token.strip()
    
    # Mocking standard oauth email extraction
    if "@" in token_str:
        email = token_str.strip().lower()
    else:
        # Fallback dummy email for mock token values
        email = f"oauth_{oauth_in.provider}_{token_str[:8]}@example.com".lower()
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create a new user since OAuth accounts are auto-registered on first login
        # Generate a random password since login is handled via OAuth
        random_password = uuid.uuid4().hex
        password_hash = hash_password(random_password)
        user = User(
            email=email,
            password_hash=password_hash
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Generate session token
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    
    # Set cookie
    response.set_cookie(
        key="better-auth.session_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        samesite="lax",
        secure=False
    )
    
    return {"session_token": token, "user": user}
