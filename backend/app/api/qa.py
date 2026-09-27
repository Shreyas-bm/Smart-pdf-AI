from __future__ import annotations
from fastapi import APIRouter, HTTPException
from backend.app.core.session import session_manager
from backend.app.models.schemas import QARequest, QAResponse
from backend.app.services.qa_engine import generate_grounded_answer

router = APIRouter(prefix="/api/qa", tags=["Q&A Engine"])

@router.post("/{session_id}/document", response_model=QAResponse)
async def ask_document(session_id: str, req: QARequest):
    """Answers a question scoped across the entire document."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return generate_grounded_answer(
        retrieval_index=session.search_index,
        question=req.question,
        scope_type="document",
        scope_id=None,
        top_k=req.top_k
    )

@router.post("/{session_id}/chapter/{chapter_id}", response_model=QAResponse)
async def ask_chapter(session_id: str, chapter_id: str, req: QARequest):
    """Answers a question scoped strictly within the specified chapter."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chapter = next((c for c in session.chapters if c.id == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return generate_grounded_answer(
        retrieval_index=session.search_index,
        question=req.question,
        scope_type="chapter",
        scope_id=chapter_id,
        top_k=req.top_k
    )

@router.post("/{session_id}/topic/{topic_id}", response_model=QAResponse)
async def ask_topic(session_id: str, topic_id: str, req: QARequest):
    """Answers a question scoped strictly within the specified topic."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    topic = next((t for t in session.topics if t.id == topic_id), None)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return generate_grounded_answer(
        retrieval_index=session.search_index,
        question=req.question,
        scope_type="topic",
        scope_id=topic_id,
        top_k=req.top_k
    )
