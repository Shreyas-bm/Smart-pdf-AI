import uuid
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import PDFDocument, ChatConversation, ChatMessage, User
from app.api.auth import get_current_user
from app.services.rag_engine import rag_engine_service

router = APIRouter(prefix="/api/chat", tags=["Chat & Doubt Solving"])

class ChatRequest(BaseModel):
    document_id: uuid.UUID
    message: str
    conversation_id: Optional[uuid.UUID] = None

class MessageResponse(BaseModel):
    id: uuid.UUID
    sender: str
    content: str
    page_references: Optional[List[int]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

@router.get("/conversations/{document_id}", response_model=List[ConversationResponse])
def get_conversations(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chat conversations. Disabled for offline/unauthenticated mode.
    """
    return []

@router.post("", response_model=MessageResponse)
async def post_chat_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Standard synchronous chat endpoint (RAG query, no history database persistence).
    Retrieves context, generates answer, and returns response with page references.
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == body.document_id,
        PDFDocument.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # Generate RAG response directly using the retrieval and generation pipeline
    result = await rag_engine_service.answer_query(db, doc, body.message)

    return {
        "id": uuid.uuid4(),
        "sender": "ai",
        "content": result["answer"],
        "page_references": result["page_references"],
        "created_at": datetime.utcnow()
    }

@router.post("/stream")
async def stream_chat_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-Sent Events (SSE) streaming chat endpoint.
    Streams back text chunks as SSE data, finishing with page reference badges.
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == body.document_id,
        PDFDocument.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    context_str, page_numbers, _ = rag_engine_service.retrieve_context(db, doc.id, body.message)

    async def sse_event_generator():
        # Stream text response
        full_response = []
        async for token in rag_engine_service.stream_query_answer(db, doc, body.message):
            full_response.append(token)
            data_payload = json.dumps({"token": token})
            yield f"data: {data_payload}\n\n"

        # Stream meta info containing citations
        meta_payload = json.dumps({
            "done": True,
            "page_references": page_numbers
        })
        yield f"data: {meta_payload}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
