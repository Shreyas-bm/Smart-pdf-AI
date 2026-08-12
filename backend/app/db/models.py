import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, JSON, LargeBinary
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    documents: Mapped[List["PDFDocument"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["ChatConversation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class PDFDocument(Base):
    __tablename__ = "pdf_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="processing", nullable=False)
    file_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="documents")
    chunks: Mapped[List["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    summaries: Mapped[List["Summary"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    question_sets: Mapped[List["QuestionSet"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    conversations: Mapped[List["ChatConversation"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pdf_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text_content: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)

    document: Mapped["PDFDocument"] = relationship(back_populates="chunks")


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pdf_documents.id", ondelete="CASCADE"), nullable=False)
    full_summary: Mapped[str] = mapped_column(Text, nullable=False)
    chapter_summaries: Mapped[dict] = mapped_column(JSON, nullable=False)
    length_type: Mapped[str] = mapped_column(String(50), nullable=False)  # short, medium, detailed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    document: Mapped["PDFDocument"] = relationship(back_populates="summaries")


class QuestionSet(Base):
    __tablename__ = "question_sets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pdf_documents.id", ondelete="CASCADE"), nullable=False)
    questions: Mapped[dict] = mapped_column(JSON, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)  # easy, medium, hard
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # mcq, descriptive, mixed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    document: Mapped["PDFDocument"] = relationship(back_populates="question_sets")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pdf_documents.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="conversations")
    document: Mapped["PDFDocument"] = relationship(back_populates="conversations")
    messages: Mapped[List["ChatMessage"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    sender: Mapped[str] = mapped_column(String(50), nullable=False)  # user, ai
    content: Mapped[str] = mapped_column(Text, nullable=False)
    page_references: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # JSON list of page numbers referred to
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    conversation: Mapped["ChatConversation"] = relationship(back_populates="messages")
