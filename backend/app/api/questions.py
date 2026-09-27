import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import PDFDocument, QuestionSet, User
from app.api.auth import get_current_user
from app.services.question_generator import question_generator_service

router = APIRouter(prefix="/api/documents", tags=["Practice Quizzes"])

class QuestionSetResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    questions: Dict[str, Any]
    difficulty: str
    type: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/{document_id}/questions", response_model=QuestionSetResponse)
@router.get("/{document_id}/questions", response_model=QuestionSetResponse)
async def get_or_generate_questions(
    document_id: uuid.UUID,
    difficulty: str = Query(default="medium", pattern="^(easy|medium|hard)$"),
    q_type: str = Query(default="mixed", pattern="^(mcq|descriptive|mixed)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate or fetch practice quiz questions (MCQs and Descriptive Q&A) for a given document.
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

    q_set = await question_generator_service.generate_questions(
        db, doc, difficulty=difficulty, q_type=q_type
    )
    return q_set
