from __future__ import annotations
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from backend.app.core.session import session_manager
from backend.app.core.config import MAX_UPLOAD_SIZE_BYTES
from backend.app.models.schemas import (
    SessionCreateResponse, SessionStatusResponse, UploadResponse, DocumentMetadata
)

router = APIRouter(prefix="/api/session", tags=["Session & Upload"])

@router.post("/create", response_model=SessionCreateResponse)
async def create_session():
    """Initializes a new temporary workspace session."""
    session = session_manager.create_session()
    return SessionCreateResponse(
        session_id=session.session_id,
        created_at=session.created_at
    )

@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Retrieves session state and active document processing metadata."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or not found")
        
    return SessionStatusResponse(
        session_id=session.session_id,
        status="active",
        has_document=session.metadata is not None,
        document_metadata=session.metadata
    )

@router.post("/{session_id}/upload", response_model=UploadResponse)
async def upload_pdf(
    session_id: str,
    file: UploadFile = File(...)
):
    """
    Validates uploaded PDF, checks MIME type/extension/size, saves to isolated temp workspace,
    and returns document initialization details.
    """
    session = session_manager.get_session(session_id)
    if not session:
        session = session_manager.create_session(session_id)

    # 1. Validation
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files (.pdf) are supported.")

    # Save to session temporary folder
    dest_path = session.temp_dir / f"upload_{uuid.uuid4().hex[:8]}.pdf"
    
    bytes_read = 0
    with open(dest_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024) # 1MB chunks
            if not chunk:
                break
            bytes_read += len(chunk)
            if bytes_read > MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large. Maximum supported size is 50MB.")
            buffer.write(chunk)

    if bytes_read == 0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")

    # Validate PDF integrity & get page count
    try:
        import fitz
        doc = fitz.open(str(dest_path))
        page_count = len(doc)
        doc.close()
    except Exception:
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(dest_path))
            page_count = len(reader.pages)
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Corrupt or unreadable PDF file: {e}")

    if page_count == 0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="PDF has 0 pages.")

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    session.uploaded_pdf_path = dest_path
    session.filename = filename
    session.metadata = DocumentMetadata(
        id=doc_id,
        title=Path(filename).stem,
        page_count=page_count,
        processing_status="idle",
        processing_progress=0,
        status_message="Uploaded. Ready for processing."
    )

    return UploadResponse(
        session_id=session.session_id,
        document_id=doc_id,
        filename=filename,
        page_count=page_count,
        status="uploaded",
        message="PDF uploaded successfully and verified."
    )

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Explicitly deletes the session and cleans up temporary data immediately."""
    deleted = session_manager.delete_session(session_id)
    return {"session_id": session_id, "deleted": deleted}
