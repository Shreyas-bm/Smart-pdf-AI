import os
import sys
import uuid
import logging
from typing import List, Dict, Any
import chromadb
from sqlalchemy.orm import Session
from app.db.models import DocumentChunk

logger = logging.getLogger(__name__)

# Detect if we are running under unit tests
IS_TESTING = "unittest" in sys.modules or "pytest" in sys.modules or os.environ.get("TESTING") == "True"

if IS_TESTING:
    logger.info("Initializing Ephemeral ChromaDB client for testing...")
    chroma_client = chromadb.EphemeralClient()
else:
    CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../chroma_db"))
    os.makedirs(CHROMA_PATH, exist_ok=True)
    logger.info(f"Initializing Persistent ChromaDB client at {CHROMA_PATH}...")
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

def get_collection():
    """
    Get or create the ChromaDB collection for document chunks.
    """
    return chroma_client.get_or_create_collection(
        name="pdf_document_chunks",
        metadata={"hnsw:space": "cosine"}
    )

def save_document_chunks(db: Session, document_id: uuid.UUID, chunks_data: List[Dict[str, Any]]) -> None:
    """
    Saves a batch of document chunks to SQLite/PostgreSQL (for structured metadata queries)
    and saves their text + vector embeddings to ChromaDB.
    """
    # 1. Save chunks metadata to relational database (for summarization, bullets, etc.)
    try:
        # Clear existing SQL chunks for this document if any
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
        
        chunks = []
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=c["chunk_index"],
                text_content=c["text_content"],
                page_number=c["page_number"]
            )
            chunks.append(chunk)
            
        db.bulk_save_objects(chunks)
        db.commit()
        logger.info(f"Successfully saved {len(chunks)} chunks to SQL DB for document {document_id}.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save document chunks to SQL DB for {document_id}: {e}", exc_info=True)
        raise e

    # 2. Save embeddings and chunks to ChromaDB
    try:
        collection = get_collection()
        
        # Delete existing chunks for this document in ChromaDB
        collection.delete(where={"document_id": str(document_id)})
        
        ids = []
        documents = []
        metadatas = []
        embeddings = []
        
        for c in chunks_data:
            chunk_id = f"{document_id}_{c['chunk_index']}"
            ids.append(chunk_id)
            documents.append(c["text_content"])
            metadatas.append({
                "document_id": str(document_id),
                "chunk_index": c["chunk_index"],
                "page_number": c["page_number"]
            })
            embeddings.append(c["embedding"])
            
        if ids:
            collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings
            )
            logger.info(f"Successfully saved {len(chunks_data)} chunks to ChromaDB for document {document_id}.")
    except Exception as e:
        logger.error(f"Failed to save document chunks to ChromaDB for {document_id}: {e}", exc_info=True)
        raise e

def similarity_search(
    db: Session,
    document_id: uuid.UUID,
    query_embedding: List[float],
    limit: int = 5
) -> List[DocumentChunk]:
    """
    Performs a similarity search using ChromaDB cosine distance.
    Returns matched DocumentChunk models.
    """
    try:
        collection = get_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where={"document_id": str(document_id)}
        )
        
        chunks = []
        if results and "documents" in results and results["documents"] and len(results["documents"][0]) > 0:
            docs_list = results["documents"][0]
            meta_list = results["metadatas"][0]
            ids_list = results["ids"][0]
            
            for idx in range(len(docs_list)):
                metadata = meta_list[idx]
                chunk = DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=uuid.UUID(metadata["document_id"]),
                    chunk_index=metadata["chunk_index"],
                    text_content=docs_list[idx],
                    page_number=metadata["page_number"]
                )
                chunks.append(chunk)
                
        logger.debug(f"ChromaDB search retrieved {len(chunks)} chunks for document {document_id}.")
        return chunks
    except Exception as e:
        logger.error(f"Failed to search similarity in ChromaDB for document {document_id}: {e}", exc_info=True)
        # Fallback to local SQL chunks if ChromaDB fails
        return db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).limit(limit).all()

def delete_document_vectors(document_id: uuid.UUID) -> None:
    """
    Deletes all vector embeddings and chunks for a document from ChromaDB.
    """
    try:
        collection = get_collection()
        collection.delete(where={"document_id": str(document_id)})
        logger.info(f"Successfully deleted ChromaDB vectors for document {document_id}.")
    except Exception as e:
        logger.error(f"Failed to delete ChromaDB vectors for document {document_id}: {e}", exc_info=True)
