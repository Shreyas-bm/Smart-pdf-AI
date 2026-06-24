import uuid
import logging
from typing import List, Dict, Any
import numpy as np
from sqlalchemy.orm import Session
from app.db.models import DocumentChunk

logger = logging.getLogger(__name__)

def save_document_chunks(db: Session, document_id: uuid.UUID, chunks_data: List[Dict[str, Any]]) -> None:
    """
    Saves a batch of document chunks and their vector embeddings to the database.
    
    Args:
        db: SQLAlchemy database session.
        document_id: The UUID of the PDFDocument these chunks belong to.
        chunks_data: A list of dictionaries representing chunks:
            [
                {
                    "chunk_index": int,
                    "text_content": str,
                    "page_number": int,
                    "embedding": List[float]
                },
                ...
            ]
    """
    try:
        # Clear existing chunks for this document if any (to allow re-processing)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
        
        # Bulk insert new chunks
        chunks = []
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=c["chunk_index"],
                text_content=c["text_content"],
                page_number=c["page_number"],
                embedding=c["embedding"]
            )
            chunks.append(chunk)
            
        db.bulk_save_objects(chunks)
        db.commit()
        logger.info(f"Successfully saved {len(chunks)} chunks for document {document_id}.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save document chunks for {document_id}: {e}", exc_info=True)
        raise e

def similarity_search(
    db: Session,
    document_id: uuid.UUID,
    query_embedding: List[float],
    limit: int = 5
) -> List[DocumentChunk]:
    """
    Performs a similarity search using cosine distance.
    If the database dialect is SQLite, runs similarity search in-memory via numpy.
    If PostgreSQL, runs pgvector database-level query.
    
    Args:
        db: SQLAlchemy database session.
        document_id: The UUID of the PDFDocument to search within.
        query_embedding: The 1024-dimensional query vector.
        limit: Max number of relevant chunks to return.
        
    Returns:
        A list of DocumentChunk SQLAlchemy model instances.
    """
    try:
        dialect_name = db.bind.dialect.name
    except Exception:
        # Fallback to sqlite if cannot detect dialect
        dialect_name = "sqlite"

    if dialect_name == "sqlite":
        logger.debug("Executing similarity search fallback on SQLite database.")
        # Retrieve all chunks for the document
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        chunks_with_emb = [c for c in chunks if c.embedding is not None]
        if not chunks_with_emb:
            return []
            
        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []
            
        def calculate_cosine_distance(chunk: DocumentChunk) -> float:
            c_vec = np.array(chunk.embedding, dtype=np.float32)
            c_norm = np.linalg.norm(c_vec)
            if c_norm == 0:
                return 1.0
            similarity = np.dot(q_vec, c_vec) / (q_norm * c_norm)
            return float(1.0 - similarity)
            
        chunks_with_emb.sort(key=calculate_cosine_distance)
        return chunks_with_emb[:limit]
    else:
        logger.debug("Executing similarity search on PostgreSQL pgvector database.")
        # PostgreSQL pgvector similarity search
        return db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).order_by(
            DocumentChunk.embedding.cosine_distance(query_embedding)
        ).limit(limit).all()
