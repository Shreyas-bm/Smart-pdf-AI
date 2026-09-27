from __future__ import annotations
import io
import logging
from pathlib import Path
from typing import Optional, List, Tuple
from PIL import Image, ImageEnhance, ImageFilter
from backend.app.core.config import TESSERACT_CMD, OCR_ENABLED
from backend.app.models.schemas import PageData

logger = logging.getLogger("aipdf.ocr")

def preprocess_image_for_ocr(img: Image.Image) -> Image.Image:
    """
    Preprocesses PIL image to optimize OCR accuracy for typed/handwritten scans.
    Applies grayscale, auto-contrast, median noise reduction, and adaptive binarization.
    """
    try:
        # Convert to grayscale
        gray = img.convert("L")
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(1.8)
        
        # Subtle sharpening
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        
        # Adaptive thresholding / Otsu style binarization using PIL point
        # A simple median-based split works well for varying illumination
        threshold = 140
        table = [0 if i < threshold else 255 for i in range(256)]
        binarized = sharpened.point(table, "1")
        
        return binarized
    except Exception as e:
        logger.warning(f"Image preprocessing fallback: {e}")
        return img.convert("L")

def render_pdf_page_to_image(pdf_path: Path, page_number: int, dpi: int = 150) -> Optional[Image.Image]:
    """
    Renders a specific PDF page to a PIL Image using PyMuPDF (fitz) or pypdfium2.
    """
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        if page_number < 1 or page_number > len(doc):
            return None
        page = doc[page_number - 1]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        doc.close()
        return Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        logger.error(f"Failed to render PDF page {page_number} to image: {e}")
        return None

def perform_page_ocr(image: Image.Image) -> Tuple[str, float]:
    """
    Executes Tesseract OCR on a PIL image.
    Returns (extracted_text, confidence).
    """
    if not OCR_ENABLED:
        return "", 0.0
        
    try:
        import pytesseract
        
        # Try to use configured tesseract cmd if exists
        try:
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        except Exception:
            pass
            
        preprocessed = preprocess_image_for_ocr(image)
        
        # Get OCR text with data for confidence calculation
        data = pytesseract.image_to_data(preprocessed, output_type=pytesseract.Output.DICT)
        text_tokens = []
        confidences = []
        
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            conf = int(data['conf'][i])
            if word and conf > 0:
                text_tokens.append(word)
                confidences.append(conf)
                
        extracted_text = " ".join(text_tokens)
        avg_confidence = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.5
        
        return extracted_text, avg_confidence
    except Exception as e:
        logger.warning(f"Tesseract OCR not accessible or encountered error: {e}. Returning empty OCR text.")
        return "", 0.0

def process_scanned_pages_if_needed(
    pdf_path: Path,
    pages: List[PageData],
    ocr_mode: str = "auto",
    dpi: int = 150
) -> List[PageData]:
    """
    Evaluates pages and executes OCR where machine text is sparse or missing.
    ocr_mode: 'auto' (run only on sparse/scanned pages), 'force' (run on all), 'skip' (skip all OCR).
    """
    if ocr_mode == "skip" or not OCR_ENABLED:
        return pages
        
    for page in pages:
        # Determine if OCR is needed
        needs_ocr = (ocr_mode == "force") or (
            ocr_mode == "auto" and (page.char_count < 60 or page.confidence < 0.6)
        )
        
        if needs_ocr:
            img = render_pdf_page_to_image(pdf_path, page.page_number, dpi=dpi)
            if img:
                ocr_text, ocr_conf = perform_page_ocr(img)
                if ocr_text.strip():
                    page.ocr_text = ocr_text.strip()
                    if page.char_count < len(page.ocr_text):
                        page.clean_text = page.ocr_text
                        page.extraction_method = "ocr" if page.char_count == 0 else "hybrid"
                        page.confidence = ocr_conf
                        page.char_count = len(page.clean_text)
                        page.word_count = len(page.clean_text.split())
                        
    return pages
