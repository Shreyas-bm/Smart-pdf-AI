import uuid
import logging
from typing import AsyncGenerator, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.db.models import DocumentChunk, PDFDocument
from app.db.vector_store import similarity_search
from app.services.embedder import embedder_service
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class RAGEngineService:
    """
    RAG (Retrieval-Augmented Generation) Doubt-Solving Chatbot Engine.
    Queries vector store for document chunks and streams contextual responses with citations.
    """

    def get_query_embedding(self, query: str) -> List[float]:
        try:
            return embedder_service.embed_text(query)
        except Exception as e:
            logger.warning(f"Could not compute embedding with model: {e}. Using fallback vector.")
            # 1024-dim dummy vector for fallback
            return [0.01] * 1024

    def retrieve_context(
        self, db: Session, document_id: uuid.UUID, query: str, limit: int = 5
    ) -> Tuple[str, List[int], List[DocumentChunk]]:
        query_vector = self.get_query_embedding(query)
        relevant_chunks = similarity_search(db, document_id, query_vector, limit=limit)

        if not relevant_chunks:
            # Fallback: get first few chunks directly
            relevant_chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id
            ).limit(limit).all()

        context_parts = []
        page_numbers = set()

        for chunk in relevant_chunks:
            page_numbers.add(chunk.page_number)
            context_parts.append(f"[Page {chunk.page_number}]: {chunk.text_content}")

        context_str = "\n\n".join(context_parts)
        sorted_pages = sorted(list(page_numbers))
        return context_str, sorted_pages, relevant_chunks

    async def answer_query(
        self, db: Session, document: PDFDocument, query: str
    ) -> Dict[str, Any]:
        context_str, page_numbers, _ = self.retrieve_context(db, document.id, query)

        system_prompt = (
            "You are SmartPDF AI, a helpful, precise academic doubt-solving tutor. "
            "Answer the user's question accurately using ONLY the provided document context. "
            "Always include page citations when stating facts from the context."
        )

        prompt = (
            f"User Question: {query}\n\n"
            f"Retrieved Document Context:\n{context_str if context_str else 'No specific context available.'}\n\n"
            f"Instruction: Provide a concise, clear answer to the user's question based on the context above."
        )

        answer_text = await llm_service.generate_text(prompt, system_prompt)

        return {
            "answer": answer_text,
            "page_references": page_numbers
        }

    async def stream_query_answer(
        self, db: Session, document: PDFDocument, query: str
    ) -> AsyncGenerator[str, None]:
        context_str, page_numbers, _ = self.retrieve_context(db, document.id, query)

        system_prompt = (
            "You are SmartPDF AI, a helpful, precise academic doubt-solving tutor. "
            "Answer the user's question accurately using ONLY the provided document context."
        )

        prompt = (
            f"User Question: {query}\n\n"
            f"Retrieved Document Context:\n{context_str if context_str else 'No specific context available.'}\n\n"
            f"Instruction: Provide a clear answer based on the context."
        )

        async for token in llm_service.stream_text(prompt, system_prompt):
            yield token

rag_engine_service = RAGEngineService()
