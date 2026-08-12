import io
import docx
import fitz
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def extract_pdf_content(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF file byte stream.
    
    Args:
        file_bytes: The raw PDF file bytes.
        
    Returns:
        A list of dictionaries, where each dictionary represents a page:
        {
            "page_number": int, # 1-indexed page number
            "text": str,        # Cleaned text content of the page
            "length": int,      # Character length of the page text
            "header": str       # Extracted basic header/title from the page
        }
    """
    pages = []
    try:
        # Open PDF from byte stream
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        for idx, page in enumerate(doc):
            page_num = idx + 1
            raw_text = page.get_text()
            
            # Basic text cleaning (removing excessive whitespace)
            cleaned_text = " ".join(raw_text.split())
            
            # Try to extract a header/title: get the first line of text
            header = ""
            lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
            if lines:
                header = lines[0][:100]  # Take the first line, limit to 100 chars
                
            pages.append({
                "page_number": page_num,
                "text": cleaned_text,
                "length": len(cleaned_text),
                "header": header
            })
            
        doc.close()
        logger.info(f"Successfully processed PDF. Extracted {len(pages)} pages.")
        
    except Exception as e:
        logger.error(f"Error processing PDF document: {e}", exc_info=True)
        raise ValueError(f"Could not parse PDF document: {e}")
        
    return pages

def extract_docx_content(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page (virtual pages of ~1500 chars) from a DOCX file byte stream.
    
    Args:
        file_bytes: The raw DOCX file bytes.
        
    Returns:
        A list of dictionaries representing virtual pages.
    """
    pages = []
    try:
        # Load docx from byte stream
        doc = docx.Document(io.BytesIO(file_bytes))
        current_page_text = []
        current_char_count = 0
        page_num = 1
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            current_page_text.append(text)
            current_char_count += len(text)
            
            # Group into virtual pages of roughly 1500 characters
            if current_char_count >= 1500:
                full_text = "\n".join(current_page_text)
                cleaned_text = " ".join(full_text.split())
                
                pages.append({
                    "page_number": page_num,
                    "text": cleaned_text,
                    "length": len(cleaned_text),
                    "header": current_page_text[0][:100] if current_page_text else ""
                })
                page_num += 1
                current_page_text = []
                current_char_count = 0
                
        # Append remaining paragraphs
        if current_page_text:
            full_text = "\n".join(current_page_text)
            cleaned_text = " ".join(full_text.split())
            pages.append({
                "page_number": page_num,
                "text": cleaned_text,
                "length": len(cleaned_text),
                "header": current_page_text[0][:100]
            })
            
        # Fallback if document is empty
        if not pages:
            pages.append({
                "page_number": 1,
                "text": "Empty Word document.",
                "length": 20,
                "header": "Empty"
            })
            
        logger.info(f"Successfully processed DOCX. Extracted {len(pages)} virtual pages.")
    except Exception as e:
        logger.error(f"Error processing DOCX document: {e}", exc_info=True)
        raise ValueError(f"Could not parse DOCX document: {e}")
        
    return pages
