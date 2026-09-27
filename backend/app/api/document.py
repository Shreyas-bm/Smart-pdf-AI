from __future__ import annotations
import logging
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from backend.app.core.session import session_manager
from backend.app.models.schemas import (
    ProcessDocumentRequest, DocumentOverviewResponse, ChapterDetailResponse,
    TopicDetailResponse, ChapterData, TopicData, DocumentMetadata
)
from backend.app.services.pdf_extractor import extract_native_pages
from backend.app.services.ocr_engine import process_scanned_pages_if_needed
from backend.app.services.normalizer import normalize_pages
from backend.app.services.chunker import chunk_document_pages
from backend.app.services.chapter_detector import detect_chapters
from backend.app.services.topic_extractor import extract_topics_for_chapters
from backend.app.services.summarizer import generate_all_summaries
from backend.app.services.retrieval_index import LocalRetrievalIndex

logger = logging.getLogger("aipdf.document_api")
router = APIRouter(prefix="/api/document", tags=["Document Intelligence"])

def run_document_processing_pipeline(session_id: str, ocr_mode: str = "auto", ocr_dpi: int = 150):
    session = session_manager.get_session(session_id)
    if not session or not session.uploaded_pdf_path or not session.metadata:
        return

    try:
        meta = session.metadata
        meta.processing_status = "extracting"
        meta.processing_progress = 15
        meta.status_message = "Extracting native text and page layouts..."

        # 1. Native Extraction
        pages = extract_native_pages(session.uploaded_pdf_path, meta.id)
        
        # 2. OCR for scanned / handwritten pages
        meta.processing_status = "ocr"
        meta.processing_progress = 35
        meta.status_message = "Scanning and OCR processing pages if needed..."
        pages = process_scanned_pages_if_needed(session.uploaded_pdf_path, pages, ocr_mode=ocr_mode, dpi=ocr_dpi)
        
        # 3. Normalization
        meta.processing_status = "structuring"
        meta.processing_progress = 55
        meta.status_message = "Normalizing content and detecting document structure..."
        pages = normalize_pages(pages)
        session.pages = pages

        # 4. Chunking
        chunks = chunk_document_pages(pages, meta.id)
        session.chunks = chunks

        # 5. Intelligent Chapter Detection (handling TOC, front-matter & authentic chapters)
        chapters, subtopics_map = detect_chapters(pages, meta.id, session.uploaded_pdf_path)

        # 6. Topic Extraction & Chunk Annotation
        meta.processing_progress = 75
        meta.status_message = "Extracting topics and sub-sections..."
        chapters, chunks, topics = extract_topics_for_chapters(
            chapters, pages, chunks, outline_subtopics_map=subtopics_map
        )
        session.chapters = chapters
        session.chunks = chunks
        session.topics = topics

        # 7. Summarization
        meta.processing_progress = 85
        meta.status_message = "Generating summaries and key concepts..."
        meta, chapters, topics = generate_all_summaries(meta, chapters, topics, chunks, pages)
        session.metadata = meta
        session.chapters = chapters
        session.topics = topics

        # 8. Indexing
        meta.processing_status = "indexing"
        meta.processing_progress = 95
        meta.status_message = "Constructing local semantic search index..."
        session.search_index = LocalRetrievalIndex(chunks)

        meta.processing_status = "ready"
        meta.processing_progress = 100
        meta.status_message = "Document ready for learning, Q&A, and Quizzes."
        logger.info(f"Pipeline complete for session {session_id}. Ready.")

    except Exception as e:
        logger.error(f"Document processing failed for session {session_id}: {e}", exc_info=True)
        if session.metadata:
            session.metadata.processing_status = "error"
            session.metadata.status_message = f"Processing error: {str(e)}"

@router.post("/{session_id}/process")
async def process_document(
    session_id: str,
    req: ProcessDocumentRequest = ProcessDocumentRequest()
):
    """Triggers the end-to-end document extraction, OCR, structural analysis, and indexing pipeline."""
    session = session_manager.get_session(session_id)
    if not session or not session.uploaded_pdf_path or not session.metadata:
        raise HTTPException(status_code=404, detail="No document uploaded for this session")

    # Run processing synchronously (or in background if preferred; running directly gives immediate response)
    run_document_processing_pipeline(session_id, ocr_mode=req.ocr_mode, ocr_dpi=req.ocr_dpi)
    
    return {
        "session_id": session_id,
        "status": session.metadata.processing_status,
        "message": session.metadata.status_message
    }

@router.get("/{session_id}/overview", response_model=DocumentOverviewResponse)
async def get_document_overview(session_id: str):
    """Retrieves document overview metadata, chapter list, and suggested questions."""
    session = session_manager.get_session(session_id)
    if not session or not session.metadata:
        raise HTTPException(status_code=404, detail="No document found for this session")

    sample_questions = []
    if session.metadata.key_topics:
        for topic_name in session.metadata.key_topics[:4]:
            sample_questions.append(f"What are the main principles of {topic_name}?")
    else:
        sample_questions = ["What is the primary topic of this document?", "Summarize the key conclusions."]

    return DocumentOverviewResponse(
        document=session.metadata,
        chapters=session.chapters,
        sample_questions=sample_questions
    )

@router.get("/{session_id}/chapters", response_model=List[ChapterData])
async def get_chapters(session_id: str):
    """Lists all detected chapters."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.chapters

@router.get("/{session_id}/chapters/{chapter_id}", response_model=ChapterDetailResponse)
async def get_chapter_detail(session_id: str, chapter_id: str):
    """Retrieves focused chapter detail for Chapter Learning Mode."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chapter = next((c for c in session.chapters if c.id == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    chapter_topics = [t for t in session.topics if t.chapter_id == chapter_id]
    key_concepts = []
    for t in chapter_topics:
        key_concepts.extend(t.key_concepts)
    key_concepts = list(dict.fromkeys(key_concepts))[:8]
    pages = list(range(chapter.start_page, chapter.end_page + 1))

    return ChapterDetailResponse(
        chapter=chapter,
        topics=chapter_topics,
        key_concepts=key_concepts,
        pages=pages
    )

@router.get("/{session_id}/topics/{topic_id}", response_model=TopicDetailResponse)
async def get_topic_detail(session_id: str, topic_id: str):
    """Retrieves deep topic information for the 'Learn This Topic' workspace view."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    topic = next((t for t in session.topics if t.id == topic_id), None)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    chapter = next((c for c in session.chapters if c.id == topic.chapter_id), None)
    chapter_title = chapter.title if chapter else "General Section"

    # Get topic explanation from relevant chunks
    chunk_map = {c.chunk_id: c for c in session.chunks}
    topic_texts = [chunk_map[cid].text for cid in topic.chunk_ids if cid in chunk_map]
    explanation = " ".join(topic_texts[:3]) if topic_texts else topic.summary

    pages = list(range(topic.start_page, topic.end_page + 1))
    sample_questions = [
        f"Explain the core concept of {topic.title}.",
        f"How does {topic.title} relate to the chapter context?",
        f"What are the key points to remember about {topic.title}?"
    ]

    return TopicDetailResponse(
        topic=topic,
        chapter_title=chapter_title,
        explanation=explanation,
        key_concepts=topic.key_concepts,
        source_pages=pages,
        sample_questions=sample_questions
    )
