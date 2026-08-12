import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.api.documents import router as documents_router
from app.api.summaries import router as summaries_router
from app.api.bullets import router as bullets_router
from app.api.questions import router as questions_router
from app.api.chat import router as chat_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from app.db.session import engine
from app.db.models import Base

# Auto-create tables for SQLite development/testing
try:
    logger.info("Auto-creating database tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables auto-created successfully.")
except Exception as db_err:
    logger.warning(f"Database auto-creation bypassed or failed: {db_err}")

app = FastAPI(
    title="SmartPDF AI API",
    description="Backend API for SmartPDF AI (Student PDF Summarizer & Study Assistant)",
    version="1.0.0",
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(documents_router)
app.include_router(summaries_router)
app.include_router(bullets_router)
app.include_router(questions_router)
app.include_router(chat_router)

# Custom Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle standard HTTP exceptions by returning standard JSON format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle model validation errors, showing user-friendly formatted error details."""
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(x) for x in error.get("loc", []))
        errors.append(f"{loc}: {error.get('msg')} ({error.get('type')})")
    
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error occurred.", "errors": errors},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled errors to avoid leaking system stack traces."""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please contact support."},
    )

@app.get("/")
def read_root():
    """Root endpoint to check server connectivity."""
    return {
        "name": "SmartPDF AI API",
        "status": "healthy",
        "version": "1.0.0"
    }
