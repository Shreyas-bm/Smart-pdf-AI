import os
import uuid
import logging
from sqlalchemy.orm import Session
from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import PDFDocument
from app.services.storage import StorageService
from app.services.pdf_processor import extract_pdf_content
from app.services.embedder import embedder_service
from app.db.vector_store import save_document_chunks

logger = logging.getLogger(__name__)

@celery_app.task(name="app.workers.tasks.process_pdf_document")
def process_pdf_document(document_id: str, local_file_path: str) -> bool:
    """
    Asynchronous Celery task that processes an ingested PDF document.
    Steps:
      1. Uploads the PDF file to S3/R2 storage.
      2. Extracts page-by-page text content from the PDF.
      3. Splits the text of each page into semantic chunks.
      4. Generates embeddings for each chunk.
      5. Saves the chunks and embeddings to the database.
      6. Deletes the local temporary file.
      7. Updates document status to 'completed' or 'failed'.
    """
    logger.info(f"Starting background processing for document {document_id} (local path: {local_file_path})")
    
    db: Session = SessionLocal()
    doc_uuid = uuid.UUID(document_id)
    
    keep_local_file = False
    try:
        # Retrieve PDFDocument
        db_document = db.query(PDFDocument).filter(PDFDocument.id == doc_uuid).first()
        if not db_document:
            logger.error(f"Document {document_id} not found in database.")
            return False
            
        # Update status to processing (redundant but good practice)
        db_document.status = "processing"
        db.commit()
        
        # Verify local file exists
        if not os.path.exists(local_file_path):
            raise FileNotFoundError(f"Local temp file not found at {local_file_path}")
            
        # 1. Read file bytes
        with open(local_file_path, "rb") as f:
            file_bytes = f.read()
            
        # 2. Upload to storage
        storage = StorageService()
        s3_object_name = f"{document_id}_{db_document.filename}"
        
        try:
            storage.ensure_bucket_exists()
            object_key = storage.upload_file(local_file_path, object_name=s3_object_name)
            # Update file url with object key or presigned URL
            db_document.file_url = object_key
            logger.info(f"Uploaded document {document_id} to S3 bucket as {object_key}")
        except Exception as storage_err:
            logger.warning(f"Storage upload failed, fallback to mock path: {storage_err}")
            # Fallback for local development when MinIO is not running
            db_document.file_url = f"mock-s3://{s3_object_name}"
            keep_local_file = True
            
        # 3. Extract text content page-by-page
        logger.info(f"Extracting text from PDF document {document_id}")
        pages = extract_pdf_content(file_bytes)
        
        # 4. Chunk text and prepare for embedding
        logger.info(f"Chunking extracted text for document {document_id}")
        all_chunks = []
        
        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"]
            
            if not page_text.strip():
                continue
                
            page_chunks = embedder_service.chunk_text(page_text)
            for chunk_text in page_chunks:
                all_chunks.append((chunk_text, page_num))
                
        if not all_chunks:
            logger.warning(f"No text extracted or chunked from document {document_id}")
            
        # 5. Generate embeddings and save to database
        if all_chunks:
            logger.info(f"Generating embeddings for {len(all_chunks)} chunks of document {document_id}")
            chunk_texts = [text for text, _ in all_chunks]
            embeddings = embedder_service.embed_texts(chunk_texts)
            
            chunks_data = []
            for idx, (text, page_num) in enumerate(all_chunks):
                chunks_data.append({
                    "chunk_index": idx,
                    "text_content": text,
                    "page_number": page_num,
                    "embedding": embeddings[idx]
                })
                
            logger.info(f"Saving {len(chunks_data)} chunks to database for document {document_id}")
            save_document_chunks(db, doc_uuid, chunks_data)
            
        # 6. Update document status to completed
        db_document.status = "completed"
        db.commit()
        logger.info(f"Finished background processing successfully for document {document_id}")
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}", exc_info=True)
        # Rollback and mark document as failed
        try:
            db.rollback()
            db_document = db.query(PDFDocument).filter(PDFDocument.id == doc_uuid).first()
            if db_document:
                db_document.status = "failed"
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to set document status to failed: {db_err}")
        return False
        
    finally:
        # 7. Cleanup local temp file if S3 upload was successful, otherwise keep it for local download
        if os.path.exists(local_file_path):
            if not keep_local_file:
                try:
                    os.remove(local_file_path)
                    logger.info(f"Cleaned up temporary file {local_file_path}")
                except Exception as cleanup_err:
                    logger.warning(f"Failed to clean up temporary file {local_file_path}: {cleanup_err}")
            else:
                logger.info(f"Preserving local file {local_file_path} as fallback for frontend download/viewing")
        db.close()
        
    return True
