from __future__ import annotations
from fastapi import APIRouter, HTTPException
from backend.app.core.session import session_manager
from backend.app.models.schemas import (
    QuizGenerateRequest, QuizPayload, QuizSubmitRequest, QuizResultResponse
)
from backend.app.services.quiz_generator import assemble_quiz
from backend.app.services.quiz_evaluator import evaluate_quiz_submission

router = APIRouter(prefix="/api/quiz", tags=["Quiz Assessment"])

@router.post("/{session_id}/generate", response_model=QuizPayload)
async def generate_quiz(session_id: str, req: QuizGenerateRequest):
    """Generates an assessment quiz scoped to document, chapter, or topic."""
    session = session_manager.get_session(session_id)
    if not session or not session.chunks:
        raise HTTPException(status_code=404, detail="No processed document found for this session")

    # Determine scope title
    scope_title = "Document Overview"
    if req.scope_type == "chapter" and req.scope_id:
        chapter = next((c for c in session.chapters if c.id == req.scope_id), None)
        if chapter:
            scope_title = chapter.title
    elif req.scope_type == "topic" and req.scope_id:
        topic = next((t for t in session.topics if t.id == req.scope_id), None)
        if topic:
            scope_title = topic.title

    quiz_payload, answer_keys = assemble_quiz(
        chunks=session.chunks,
        scope_type=req.scope_type,
        scope_id=req.scope_id,
        scope_title=scope_title,
        num_questions=req.num_questions,
        difficulty=req.difficulty,
        question_types=req.question_types
    )

    # Store quiz session cache
    session.active_quizzes[quiz_payload.quiz_id] = {
        "payload": quiz_payload,
        "answer_keys": answer_keys,
        "last_result": None
    }

    return quiz_payload

@router.post("/{session_id}/{quiz_id}/submit", response_model=QuizResultResponse)
async def submit_quiz(session_id: str, quiz_id: str, req: QuizSubmitRequest):
    """Submits user answers for a generated quiz, calculates scores, and returns revision recommendations."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    quiz_entry = session.active_quizzes.get(quiz_id)
    if not quiz_entry:
        raise HTTPException(status_code=404, detail="Quiz not found or expired")

    topics_map = {t.id: t for t in session.topics}
    payload: QuizPayload = quiz_entry["payload"]
    answer_keys = quiz_entry["answer_keys"]

    result = evaluate_quiz_submission(
        quiz_id=quiz_id,
        scope_type=payload.scope_type,
        scope_title=payload.scope_title,
        submissions=req.answers,
        answer_keys=answer_keys,
        topics_map=topics_map
    )

    quiz_entry["last_result"] = result
    return result

@router.get("/{session_id}/{quiz_id}/results", response_model=QuizResultResponse)
async def get_quiz_results(session_id: str, quiz_id: str):
    """Retrieves previous evaluation results for a submitted quiz."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    quiz_entry = session.active_quizzes.get(quiz_id)
    if not quiz_entry or not quiz_entry.get("last_result"):
        raise HTTPException(status_code=404, detail="No submission results found for this quiz")

    return quiz_entry["last_result"]
