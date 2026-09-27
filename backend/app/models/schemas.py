from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
import time

# --- Extraction and Document Models ---

class PageData(BaseModel):
    id: str
    document_id: str
    page_number: int
    raw_text: str = ""
    ocr_text: Optional[str] = ""
    clean_text: str = ""
    extraction_method: Literal["native", "ocr", "hybrid"] = "native"
    confidence: float = 1.0
    char_count: int = 0
    word_count: int = 0

class ChunkData(BaseModel):
    chunk_id: str
    document_id: str
    page_number: int
    chapter_id: Optional[str] = None
    topic_id: Optional[str] = None
    start_char: int = 0
    end_char: int = 0
    text: str
    position: int = 0

class TopicData(BaseModel):
    id: str
    chapter_id: str
    title: str
    start_page: int
    end_page: int
    summary: str = ""
    key_concepts: List[str] = Field(default_factory=list)
    chunk_ids: List[str] = Field(default_factory=list)

class ChapterData(BaseModel):
    id: str
    document_id: str
    chapter_number: int
    title: str
    start_page: int
    end_page: int
    summary: str = ""
    topics: List[TopicData] = Field(default_factory=list)

class DocumentMetadata(BaseModel):
    id: str
    title: str
    page_count: int
    created_at: float = Field(default_factory=time.time)
    processing_status: Literal["idle", "uploading", "extracting", "ocr", "structuring", "indexing", "ready", "error"] = "idle"
    processing_progress: int = 0
    status_message: str = "Ready"
    summary: str = ""
    key_topics: List[str] = Field(default_factory=list)
    chapters_count: int = 0
    topics_count: int = 0

# --- API Request & Response Models ---

class SessionCreateResponse(BaseModel):
    session_id: str
    created_at: float

class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    has_document: bool
    document_metadata: Optional[DocumentMetadata] = None

class UploadResponse(BaseModel):
    session_id: str
    document_id: str
    filename: str
    page_count: int
    status: str
    message: str

class ProcessDocumentRequest(BaseModel):
    ocr_mode: Literal["auto", "force", "skip"] = "auto"
    ocr_dpi: int = 150

class DocumentOverviewResponse(BaseModel):
    document: DocumentMetadata
    chapters: List[ChapterData]
    sample_questions: List[str] = Field(default_factory=list)

class ChapterDetailResponse(BaseModel):
    chapter: ChapterData
    topics: List[TopicData]
    key_concepts: List[str] = Field(default_factory=list)
    pages: List[int] = Field(default_factory=list)

class TopicDetailResponse(BaseModel):
    topic: TopicData
    chapter_title: str
    explanation: str
    key_concepts: List[str]
    source_pages: List[int]
    sample_questions: List[str]

# --- Q&A Models ---

class QARequest(BaseModel):
    question: str
    top_k: int = 5

class QAResponse(BaseModel):
    question: str
    answer: str
    grounded: bool
    confidence: float
    sources: List[int] = Field(default_factory=list)
    context_snippets: List[str] = Field(default_factory=list)
    scope_type: Literal["document", "chapter", "topic"]
    scope_id: Optional[str] = None

# --- Quiz Models ---

class QuizQuestionOption(BaseModel):
    id: str
    text: str

class QuizQuestion(BaseModel):
    id: str
    question_type: Literal["mcq", "true_false", "short_answer"]
    prompt: str
    options: Optional[List[QuizQuestionOption]] = None
    source_page: int
    topic_id: Optional[str] = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"

class QuizPayload(BaseModel):
    quiz_id: str
    scope_type: Literal["document", "chapter", "topic"]
    scope_id: Optional[str] = None
    scope_title: str
    difficulty: str
    question_count: int
    questions: List[QuizQuestion]

class QuizGenerateRequest(BaseModel):
    scope_type: Literal["document", "chapter", "topic"] = "document"
    scope_id: Optional[str] = None
    num_questions: int = 5
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_types: List[Literal["mcq", "true_false", "short_answer"]] = Field(
        default_factory=lambda: ["mcq", "true_false", "short_answer"]
    )

class QuizAnswerSubmission(BaseModel):
    question_id: str
    user_answer: str

class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerSubmission]

class QuestionEvaluationResult(BaseModel):
    question_id: str
    prompt: str
    question_type: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    source_page: int
    topic_title: Optional[str] = None

class QuizResultResponse(BaseModel):
    quiz_id: str
    scope_type: str
    scope_title: str
    total_questions: int
    correct_count: int
    score_percentage: float
    results: List[QuestionEvaluationResult]
    weak_topics: List[str]
    suggested_revision_pages: List[int]
