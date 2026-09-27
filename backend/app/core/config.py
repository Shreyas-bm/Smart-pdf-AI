import os
import tempfile
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMP_BASE_DIR = Path(tempfile.gettempdir()) / "aipdf_reader_sessions"
TEMP_BASE_DIR.mkdir(parents=True, exist_ok=True)

# Configuration settings
SESSION_EXPIRY_MINUTES = int(os.getenv("SESSION_EXPIRY_MINUTES", "60"))
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50")) * 1024 * 1024
OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() == "true"
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")
