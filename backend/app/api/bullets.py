import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import PDFDocument, User
from app.api.auth import get_current_user
from app.services.bullet_extractor import bullet_extractor_service

router = APIRouter(prefix="/api/documents", tags=["Bullets & Notes"])

class BulletTopic(BaseModel):
    topic: str
    bullet_points: List[str]
    formulas: List[str]

class BulletsResponse(BaseModel):
    document_id: uuid.UUID
    topics: List[BulletTopic]

@router.get("/{document_id}/bullets", response_model=BulletsResponse)
async def get_document_bullets(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extract structured revision bullet points, formulas, and key concepts from the document.
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

    topics_data = await bullet_extractor_service.extract_bullets(db, doc)
    
    # Format and validate topics
    formatted_topics = []
    for item in topics_data:
        formatted_topics.append({
            "topic": item.get("topic", "General Notes"),
            "bullet_points": item.get("bullet_points", []),
            "formulas": item.get("formulas", [])
        })

    return {
        "document_id": document_id,
        "topics": formatted_topics
    }
