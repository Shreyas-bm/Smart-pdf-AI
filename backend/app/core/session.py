from __future__ import annotations
import os
import shutil
import time
import uuid
import logging
from pathlib import Path
from typing import Dict, Optional, Any, List
from backend.app.core.config import TEMP_BASE_DIR, SESSION_EXPIRY_MINUTES
from backend.app.models.schemas import DocumentMetadata, PageData, ChunkData, ChapterData, TopicData

logger = logging.getLogger("aipdf.session")

class Session:
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.created_at: float = time.time()
        self.last_accessed: float = time.time()
        self.temp_dir: Path = TEMP_BASE_DIR / session_id
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Document states
        self.uploaded_pdf_path: Optional[Path] = None
        self.filename: str = ""
        self.metadata: Optional[DocumentMetadata] = None
        self.pages: List[PageData] = []
        self.chunks: List[ChunkData] = []
        self.chapters: List[ChapterData] = []
        self.topics: List[TopicData] = []
        
        # Search & Engine Cache
        self.search_index: Any = None
        self.active_quizzes: Dict[str, Any] = {} # quiz_id -> {quiz_payload, answer_key}
        
    def touch(self):
        self.last_accessed = time.time()
        
    def is_expired(self, expiry_minutes: int = SESSION_EXPIRY_MINUTES) -> bool:
        return (time.time() - self.last_accessed) > (expiry_minutes * 60)
        
    def cleanup(self):
        try:
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            self.pages.clear()
            self.chunks.clear()
            self.chapters.clear()
            self.topics.clear()
            self.active_quizzes.clear()
            self.search_index = None
            logger.info(f"Session {self.session_id} cleaned up successfully.")
        except Exception as e:
            logger.error(f"Error cleaning up session {self.session_id}: {e}")

class SessionManager:
    _instance: Optional[SessionManager] = None
    
    def __init__(self):
        self._sessions: Dict[str, Session] = {}
        
    @classmethod
    def get_instance(cls) -> SessionManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def create_session(self, session_id: Optional[str] = None) -> Session:
        sid = session_id or str(uuid.uuid4())
        session = Session(sid)
        self._sessions[sid] = session
        return session
        
    def get_session(self, session_id: str) -> Optional[Session]:
        session = self._sessions.get(session_id)
        if session:
            if session.is_expired():
                self.delete_session(session_id)
                return None
            session.touch()
        return session
        
    def get_or_create_session(self, session_id: Optional[str] = None) -> Session:
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session
        return self.create_session(session_id)
        
    def delete_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if session:
            session.cleanup()
            return True
        return False
        
    def cleanup_expired_sessions(self):
        expired_ids = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired_ids:
            self.delete_session(sid)
            
session_manager = SessionManager.get_instance()
