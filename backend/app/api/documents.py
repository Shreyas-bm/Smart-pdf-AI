from PIL.Image import logger
from app.services.storage import StorageService
import os
import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import PDFDocument, User
from app.api.auth import get_current_user
from app.workers.tasks import process_pdf_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# --- Pydantic Schemas ---
class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_url: str
    file_size: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    status: str
    task_id: str

# --- Endpoints ---

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receives PDF file upload, saves it locally as a temporary file,
    registers it in the database with status 'processing', and triggers
    the background Celery processing pipeline.
    """
    # 1. Validate PDF file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )
        
    # 2. Read bytes to determine size
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    # 3. Enforce 50MB file size limit
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 50MB limit."
        )
        
    # 4. Generate unique document ID
    doc_id = uuid.uuid4()
    
    # 5. Write to local temporary directory inside workspace
    temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../temp_uploads"))
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{doc_id}.pdf")
    
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write temporary file: {e}"
        )
        
    # 6. Save PDFDocument record to DB
    db_document = PDFDocument(
        id=doc_id,
        user_id=current_user.id,
        filename=file.filename,
        file_url="",  # Will be populated by worker
        file_size=file_size,
        status="processing"
    )
    
    try:
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
    except Exception as e:
        # Cleanup temp file on DB insertion failure
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document record: {e}"
        )
        
    # 7. Dispatch background process task
    # process_pdf_document.delay returns an AsyncResult which has an id
    task = process_pdf_document.delay(str(doc_id), temp_file_path)
    
    return {
        "document_id": doc_id,
        "filename": file.filename,
        "status": "processing",
        "task_id": task.id
    }

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all PDF documents uploaded by the current authenticated user.
    """
    return db.query(PDFDocument).filter(
        PDFDocument.user_id == current_user.id
    ).order_by(PDFDocument.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve metadata and processing status of a specific document.
    Used for frontend progress polling.
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == document_id,
        PDFDocument.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a document record, cascade-deleting chunks/embeddings.
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == document_id,
        PDFDocument.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
        
    # Delete from storage if key is available
    if doc.file_url and not doc.file_url.startswith("mock-s3://"):
        try:
            storage = StorageService()
            storage.delete_file(doc.file_url)
        except Exception as e:
            # Log and proceed so DB record can still be cleared
            logger.error(f"Failed to delete {doc.file_url} from storage on document deletion: {e}")
            
    # Delete from ChromaDB vector store
    try:
        from app.db.vector_store import delete_document_vectors
        delete_document_vectors(document_id)
    except Exception as e:
        logger.error(f"Failed to delete ChromaDB vectors on document deletion: {e}")

    db.delete(doc)
    db.commit()
    return {"detail": "Document successfully deleted."}

from fastapi.responses import FileResponse, RedirectResponse

@router.get("/{document_id}/download")
def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Serve the actual PDF file content.
    If the document uses local mock-s3, returns the PDF from temp_uploads.
    Otherwise, generates and redirects to a presigned S3 download URL.
    """
    doc = db.query(PDFDocument).filter(
        PDFDocument.id == document_id,
        PDFDocument.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )
        
    temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../temp_uploads"))
    temp_file_path = os.path.join(temp_dir, f"{document_id}.pdf")

    # If it is mock-s3 or empty url, try to serve from local temp_uploads
    if not doc.file_url or doc.file_url.startswith("mock-s3://"):
        if os.path.exists(temp_file_path):
            return FileResponse(
                path=temp_file_path,
                filename=doc.filename,
                media_type="application/pdf"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF source file was not found on the server."
            )
    else:
        # Try to generate pre-signed URL from S3 compatible store
        try:
            storage = StorageService()
            presigned_url = storage.generate_presigned_url(doc.file_url)
            return RedirectResponse(url=presigned_url)
        except Exception as e:
            logger.error(f"Failed to generate pre-signed URL, attempting local file: {e}")
            if os.path.exists(temp_file_path):
                return FileResponse(
                    path=temp_file_path,
                    filename=doc.filename,
                    media_type="application/pdf"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve file from S3 and local fallback not found."
            )
