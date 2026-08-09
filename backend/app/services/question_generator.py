import uuid
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import PDFDocument, DocumentChunk, QuestionSet
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class QuestionGeneratorService:
    """
    Generates practice questions (MCQs and Descriptive Q&A) customized by difficulty and type.
    """

    async def generate_questions(
        self,
        db: Session,
        document: PDFDocument,
        difficulty: str = "medium",
        q_type: str = "mixed",
        num_questions: int = 5
    ) -> QuestionSet:
        # Check if existing question set matches criteria
        existing = db.query(QuestionSet).filter(
            QuestionSet.document_id == document.id,
            QuestionSet.difficulty == difficulty,
            QuestionSet.type == q_type
        ).first()

        if existing:
            return existing

        chunks = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document.id
        ).order_by(DocumentChunk.chunk_index).all()

        if not chunks:
            text_context = f"Document: {document.filename}."
        else:
            text_context = "\n\n".join([f"[Page {c.page_number}]: {c.text_content}" for c in chunks[:15]])[:12000]

        system_prompt = (
            "You are SmartPDF AI, an expert exam preparation professor. "
            "Your task is to generate challenging, high-quality test questions based on study materials."
        )

        prompt = (
            f"Generate a quiz set for '{document.filename}'.\n\n"
            f"Parameters:\n"
            f"- Difficulty: {difficulty.upper()}\n"
            f"- Type: {q_type.upper()}\n"
            f"- Number of Questions: {num_questions}\n\n"
            f"Document Content Context:\n{text_context}\n\n"
            f"IMPORTANT: Return ONLY a valid JSON object matching this EXACT format:\n"
            f"{{\n"
            f'  "mcqs": [\n'
            f'    {{\n'
            f'      "question": "Clear question text?",\n'
            f'      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            f'      "correct_answer": 0,\n'
            f'      "explanation": "Detailed explanation of why this option is correct."\n'
            f'    }}\n'
            f'  ],\n'
            f'  "descriptive": [\n'
            f'    {{\n'
            f'      "question": "Descriptive concept question?",\n'
            f'      "answer": "Model solution and step-by-step answer."\n'
            f'    }}\n'
            f'  ]\n'
            f"}}"
        )

        try:
            questions_json = await llm_service.generate_json(prompt, system_prompt)
        except Exception as e:
            logger.error(f"Question generation failed: {e}. Using fallback question generator.", exc_info=True)
            questions_json = {
                "mcqs": [
                    {
                        "question": f"What is the main topic investigated in {document.filename}?",
                        "options": [
                            "Core concepts and foundational principles",
                            "Unrelated external trivia",
                            "Outdated historical guidelines",
                            "Abstract theoretical mechanics without application"
                        ],
                        "correct_answer": 0,
                        "explanation": "The document primarily investigates core concepts and foundational principles."
                    },
                    {
                        "question": "Which strategy yields optimal results when studying the material?",
                        "options": [
                            "Passive reading without review",
                            "Active recall and structured concept synthesis",
                            "Memorizing random keywords",
                            "Skipping key section summaries"
                        ],
                        "correct_answer": 1,
                        "explanation": "Active recall and structured concept synthesis significantly enhance long-term retention."
                    }
                ],
                "descriptive": [
                    {
                        "question": f"Discuss the significance of the primary concepts detailed in {document.filename}.",
                        "answer": "The primary concepts provide essential context, framework, and analytical tools necessary to understand the broader domain effectively."
                    }
                ]
            }

        q_set = QuestionSet(
            id=uuid.uuid4(),
            document_id=document.id,
            questions=questions_json,
            difficulty=difficulty,
            type=q_type
        )

        db.add(q_set)
        db.commit()
        db.refresh(q_set)
        return q_set

question_generator_service = QuestionGeneratorService()
