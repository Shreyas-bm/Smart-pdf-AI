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
    Get all chat conversations for a given document.
    """
    return db.query(ChatConversation).filter(
        ChatConversation.document_id == document_id,
        ChatConversation.user_id == current_user.id
    ).order_by(ChatConversation.created_at.desc()).all()

@router.post("", response_model=MessageResponse)
async def post_chat_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Standard synchronous chat endpoint.
    Retrieves context, generates answer, saves conversation history, and returns response with page references.
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

    # Get or create conversation
    conv = None
    if body.conversation_id:
        conv = db.query(ChatConversation).filter(
            ChatConversation.id == body.conversation_id,
            ChatConversation.user_id == current_user.id
        ).first()

    if not conv:
        conv = ChatConversation(
            id=uuid.uuid4(),
            user_id=current_user.id,
            document_id=body.document_id,
            title=body.message[:40] if body.message else "New Doubt Conversation"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save User message
    user_msg = ChatMessage(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender="user",
        content=body.message,
        page_references=[]
    )
    db.add(user_msg)
    db.commit()

    # Generate RAG response
    result = await rag_engine_service.answer_query(db, doc, body.message)

    # Save AI response
    ai_msg = ChatMessage(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender="ai",
        content=result["answer"],
        page_references={"pages": result["page_references"]}
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "id": ai_msg.id,
        "sender": ai_msg.sender,
        "content": ai_msg.content,
        "page_references": result["page_references"],
        "created_at": ai_msg.created_at
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
