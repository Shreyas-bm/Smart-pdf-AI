from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.session import session_manager
from backend.app.api.session import router as session_router
from backend.app.api.document import router as document_router
from backend.app.api.qa import router as qa_router
from backend.app.api.quiz import router as quiz_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aipdf.main")

async def periodic_session_cleanup():
    """Background loop to automatically prune inactive/expired temporary sessions."""
    while True:
        try:
            await asyncio.sleep(300) # Check every 5 minutes
            session_manager.cleanup_expired_sessions()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in session cleanup task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI PDF Learning Assistant backend server...")
    cleanup_task = asyncio.create_task(periodic_session_cleanup())
    yield
    # Shutdown
    logger.info("Shutting down backend server...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="AI PDF Learning Assistant API",
    version="1.0.0",
    description="Document-centered learning workspace backend with OCR, Grounded Q&A, Chapter/Topic Exploration, and Quiz generation.",
    lifespan=lifespan
)

# Enable CORS for local Vite frontend and client calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(session_router)
app.include_router(document_router)
app.include_router(qa_router)
app.include_router(quiz_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI PDF Learning Assistant API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
