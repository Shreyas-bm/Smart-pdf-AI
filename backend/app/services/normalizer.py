from __future__ import annotations
import re
import unicodedata
from typing import List
from backend.app.models.schemas import PageData

def normalize_text(text: str) -> str:
    """
    Cleans raw document text:
    - Normalizes unicode characters (NFKD)
    - Fixes hyphenated line breaks (e.g. 'struc-\nture' -> 'structure')
    - Replaces odd whitespace, control characters, and redundant line breaks
    - Preserves logical paragraph breaks
    """
    if not text:
        return ""
        
    # Unicode normalization
    text = unicodedata.normalize("NFKD", text)
    
    # Fix hyphenated words at line breaks
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    
    # Normalize multiple line breaks to paragraph break
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Replace weird invisible/control characters except newlines and tabs
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    
    # Clean multiple consecutive spaces inside lines
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    
    # Reassemble paragraphs cleanly
    cleaned = '\n'.join(lines).strip()
    return cleaned

def normalize_pages(pages: List[PageData]) -> List[PageData]:
    """
    Applies text normalization across all extracted pages and updates char and word counts.
    """
    for page in pages:
        target_text = page.ocr_text if (page.extraction_method == "ocr" and page.ocr_text) else page.raw_text
        if page.clean_text:
            target_text = page.clean_text
            
        cleaned = normalize_text(target_text)
        page.clean_text = cleaned
        page.char_count = len(cleaned)
        page.word_count = len(cleaned.split())
        
    return pages
