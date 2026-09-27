from __future__ import annotations
import os
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from backend.app.models.schemas import PageData

logger = logging.getLogger("aipdf.extractor")

def extract_native_pages(pdf_path: Path, document_id: str) -> List[PageData]:
    """
    Extracts native embedded text from each page of a PDF using PyMuPDF (fitz) or pypdf.
    Stores page number, raw text, character counts, and extraction method.
    """
    pages: List[PageData] = []
    
    # Try PyMuPDF first
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_number = page_idx + 1
            text = page.get_text("text") or ""
            
            clean_text = text.strip()
            char_count = len(clean_text)
            word_count = len(clean_text.split())
            
            # Estimate confidence based on reasonable character / word ratio
            confidence = 1.0 if char_count > 50 else 0.5
            
            pages.append(PageData(
                id=f"{document_id}_page_{page_number}",
                document_id=document_id,
                page_number=page_number,
                raw_text=text,
                clean_text=clean_text,
                extraction_method="native",
                confidence=confidence,
                char_count=char_count,
                word_count=word_count
            ))
        doc.close()
        logger.info(f"Extracted {len(pages)} pages with PyMuPDF.")
        return pages
    except Exception as e:
        logger.warning(f"PyMuPDF native extraction failed or fitz unavailable: {e}. Falling back to pypdf.")

    # Fallback to pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(pdf_path))
        for page_idx, page in enumerate(reader.pages):
            page_number = page_idx + 1
            text = page.extract_text() or ""
            clean_text = text.strip()
            char_count = len(clean_text)
            word_count = len(clean_text.split())
            
            pages.append(PageData(
                id=f"{document_id}_page_{page_number}",
                document_id=document_id,
                page_number=page_number,
                raw_text=text,
                clean_text=clean_text,
                extraction_method="native",
                confidence=1.0 if char_count > 50 else 0.5,
                char_count=char_count,
                word_count=word_count
            ))
        logger.info(f"Extracted {len(pages)} pages with pypdf.")
        return pages
    except Exception as e:
        logger.error(f"pypdf extraction failed: {e}")
        raise RuntimeError(f"Failed to extract text from PDF: {e}")
