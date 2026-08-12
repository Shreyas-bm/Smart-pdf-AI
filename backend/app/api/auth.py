import uuid
import logging
from typing import Optional
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.services.security import decode_access_token

logger = logging.getLogger(__name__)

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
                    user_id = uuid.UUID(user_id_str)
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
            user.id = default_id
            db.commit()
            db.refresh(user)
    return user
