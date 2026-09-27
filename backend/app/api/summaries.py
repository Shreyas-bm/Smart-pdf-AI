import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import PDFDocument, Summary, User
from app.api.auth import get_current_user
from app.services.summarizer import summary_service

router = APIRouter(prefix="/api/documents", tags=["Summaries"])

class SummaryResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    full_summary: str
    chapter_summaries: Dict[str, Any]
    length_type: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/{document_id}/summary", response_model=SummaryResponse)
async def get_or_create_summary(
    document_id: uuid.UUID,
    length_type: str = Query(default="medium", pattern="^(short|medium|detailed)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get or generate an AI summary for the specified document with length options (short, medium, detailed).
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == document_id,
        PDFDocument.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    summary_obj = await summary_service.generate_summary(db, doc, length_type)
    return summary_obj
