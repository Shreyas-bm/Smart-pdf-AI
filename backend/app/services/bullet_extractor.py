import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import PDFDocument, DocumentChunk
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class BulletExtractorService:
    """
    Extracts key concepts, formulas, definitions, and high-yield revision bullet points from PDF documents.
    """

    async def extract_bullets(self, db: Session, document: PDFDocument) -> List[Dict[str, Any]]:
        chunks = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document.id
        ).order_by(DocumentChunk.chunk_index).all()

        if not chunks:
            text_context = f"Document: {document.filename}. (No extracted text available)."
        else:
            text_context = "\n\n".join([f"[Page {c.page_number}]: {c.text_content}" for c in chunks[:20]])[:12000]

        system_prompt = (
            "You are SmartPDF AI, a study assistant specialized in creating high-yield revision flashcards "
            "and bullet point summary guides for exams."
        )

        prompt = (
            f"Extract bullet-point revision notes, key formulas, core definitions, and technical takeaways from '{document.filename}'.\n\n"
            f"Document Content:\n{text_context}\n\n"
            f"IMPORTANT: Return ONLY a valid JSON array of objects. Each object MUST strictly follow this structure:\n"
            f"[\n"
            f"  {{\n"
            f'    "topic": "Topic or Concept Title",\n'
            f'    "bullet_points": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],\n'
            f'    "formulas": ["Equation or key definition if applicable (or empty string if none)"]\n'
            f"  }}\n"
            f"]"
        )

        try:
            result = await llm_service.generate_json(prompt, system_prompt)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and "bullets" in result:
                return result["bullets"]
            elif isinstance(result, dict) and "topics" in result:
                return result["topics"]
            return [result]
        except Exception as e:
            logger.error(f"Bullet extraction failed: {e}. Returning default revision structure.", exc_info=True)
            return [
                {
                    "topic": "Core Fundamentals",
                    "bullet_points": [
                        f"Primary subject matter of {document.filename}.",
                        "Essential principles and key domain rules.",
                        "Critical terminology and conceptual frameworks."
                    ],
                    "formulas": []
                },
                {
                    "topic": "Key Applications & Insights",
                    "bullet_points": [
                        "Practical execution strategies and methodology.",
                        "Important relationships between system components.",
                        "High-priority review topics for examinations."
                    ],
                    "formulas": []
                }
            ]

bullet_extractor_service = BulletExtractorService()
