import uuid
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import PDFDocument, DocumentChunk, Summary
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class SummaryService:
    """
    Generates and persists document summaries (short, medium, detailed) with chapter breakdowns.
    """

    async def generate_summary(
        self, db: Session, document: PDFDocument, length_type: str = "medium"
    ) -> Summary:
        # Check if existing summary with same length_type exists
        existing = db.query(Summary).filter(
            Summary.document_id == document.id,
            Summary.length_type == length_type
        ).first()

        if existing:
            return existing

        # Fetch document chunks
        chunks = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document.id
        ).order_by(DocumentChunk.chunk_index).all()

        if not chunks:
            text_context = f"Document title: {document.filename}. (No text extracted yet)."
        else:
            # Combine chunk texts up to ~6000 words limit
            full_text = "\n\n".join([f"[Page {c.page_number}]: {c.text_content}" for c in chunks[:15]])
            text_context = full_text[:12000]

        system_prompt = (
            "You are SmartPDF AI, an expert academic document summarizer. "
            "Your objective is to provide structured, clear, high-yield summary material for students."
        )

        prompt = (
            f"Please generate a {length_type} summary for the document '{document.filename}'.\n\n"
            f"Requested summary detail level: {length_type.upper()}\n"
            f"Format requirements:\n"
            f"- short: 2-3 concise paragraphs summarizing the core thesis and main points.\n"
            f"- medium: Comprehensive overview with 4-5 structured sections covering main chapters/topics.\n"
            f"- detailed: Deep-dive summary with exhaustive topic breakdowns, key takeaways, and technical/academic insights.\n\n"
            f"Document Content Extracted:\n{text_context}\n\n"
            f"Provide the response as a JSON object with two fields:\n"
            f'1. "full_summary": Markdown formatted string containing the complete summary.\n'
            f'2. "chapter_summaries": JSON array of objects, each containing {{"title": "Section/Chapter Title", "summary": "Section summary content"}}.'
        )

        try:
            result = await llm_service.generate_json(prompt, system_prompt)
            full_summary = result.get("full_summary", f"Summary of {document.filename}")
            chapter_summaries = result.get("chapter_summaries", [
                {"title": "Overview", "summary": full_summary}
            ])
        except Exception as e:
            logger.error(f"LLM JSON generation for summary failed: {e}. Falling back to text prompt.", exc_info=True)
            raw_text = await llm_service.generate_text(prompt, system_prompt)
            full_summary = raw_text
            chapter_summaries = [{"title": "Document Overview", "summary": raw_text}]

        summary_obj = Summary(
            id=uuid.uuid4(),
            document_id=document.id,
            full_summary=full_summary,
            chapter_summaries={"chapters": chapter_summaries},
            length_type=length_type
        )

        db.add(summary_obj)
        db.commit()
        db.refresh(summary_obj)
        return summary_obj

summary_service = SummaryService()
