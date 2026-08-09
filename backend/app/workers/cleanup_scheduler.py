import logging
import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import PDFDocument, DocumentChunk, Summary, QuestionSet, ChatConversation
from app.services.storage import StorageService

logger = logging.getLogger(__name__)

def cleanup_expired_documents(max_age_days: int = 30) -> int:
    """
    Scans PDFDocument records older than max_age_days or with expired user sessions,
    deletes underlying files from object storage (R2/S3), and purges database records.
    """
    db: Session = SessionLocal()
    deleted_count = 0
    try:
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=max_age_days)
        expired_docs = db.query(PDFDocument).filter(PDFDocument.created_at < cutoff_date).all()

        if not expired_docs:
            logger.info("Cleanup task: No expired documents found.")
            return 0

        storage = StorageService()

        for doc in expired_docs:
            logger.info(f"Cleaning up expired document {doc.id} ('{doc.filename}') created at {doc.created_at}")
            
            # Delete from S3/R2 storage
            if doc.file_url and not doc.file_url.startswith("mock-s3://"):
                try:
                    storage.delete_file(doc.file_url)
                except Exception as storage_err:
                    logger.warning(f"Could not delete storage file {doc.file_url}: {storage_err}")

            # Delete from ChromaDB vector store
            try:
                from app.db.vector_store import delete_document_vectors
                delete_document_vectors(doc.id)
            except Exception as e:
                logger.error(f"Failed to delete ChromaDB vectors in cleanup task: {e}")

            db.delete(doc)
            deleted_count += 1

        db.commit()
        logger.info(f"Successfully cleaned up {deleted_count} expired documents.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error executing cleanup task: {e}", exc_info=True)
    finally:
        db.close()

    return deleted_count

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cleanup_expired_documents()
