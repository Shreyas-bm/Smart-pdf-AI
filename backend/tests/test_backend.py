import pytest
from pathlib import Path
from backend.app.core.session import SessionManager
from backend.app.models.schemas import PageData, ChunkData, ChapterData, TopicData, DocumentMetadata, QuizAnswerSubmission
from backend.app.services.normalizer import normalize_text, normalize_pages
from backend.app.services.chunker import chunk_document_pages, split_into_sentences
from backend.app.services.chapter_detector import detect_chapters
from backend.app.services.topic_extractor import extract_topics_for_chapters
from backend.app.services.summarizer import generate_all_summaries
from backend.app.services.retrieval_index import LocalRetrievalIndex
from backend.app.services.qa_engine import generate_grounded_answer
from backend.app.services.quiz_generator import assemble_quiz
from backend.app.services.quiz_evaluator import evaluate_quiz_submission

def test_session_manager():
    sm = SessionManager()
    session = sm.create_session("test_session_1")
    assert session.session_id == "test_session_1"
    assert sm.get_session("test_session_1") is not None
    assert sm.delete_session("test_session_1") is True
    assert sm.get_session("test_session_1") is None

def test_normalizer():
    raw = "This is a demon-\nstration of hy- \n phenation and multiple   spaces.\n\n\nNext line."
    cleaned = normalize_text(raw)
    assert "demonstration" in cleaned
    assert "hyphenation" in cleaned
    assert "\n\n\n" not in cleaned

def test_chunking():
    pages = [
        PageData(
            id="doc1_p1",
            document_id="doc1",
            page_number=1,
            raw_text="Neural networks are inspired by biological neurons. They process inputs through multiple layers of weights and biases. Backpropagation calculates gradients.",
            clean_text="Neural networks are inspired by biological neurons. They process inputs through multiple layers of weights and biases. Backpropagation calculates gradients.",
            char_count=170,
            word_count=22
        )
    ]
    chunks = chunk_document_pages(pages, "doc1", target_chunk_chars=100, overlap_chars=30)
    assert len(chunks) >= 1
    assert chunks[0].page_number == 1
    assert "Neural networks" in chunks[0].text

def test_chapter_and_topic_pipeline():
    pages = [
        PageData(
            id="doc1_p1",
            document_id="doc1",
            page_number=1,
            clean_text="Chapter 1: Fundamentals\nDeep learning is a subset of machine learning based on artificial neural networks.",
            char_count=100
        ),
        PageData(
            id="doc1_p2",
            document_id="doc1",
            page_number=2,
            clean_text="Chapter 2: Optimization\nGradient descent is an iterative first-order optimization algorithm for finding a local minimum.",
            char_count=110
        )
    ]
    chapters, subtopics_map = detect_chapters(pages, "doc1")
    assert len(chapters) == 2
    assert "Chapter 1" in chapters[0].title
    assert "Chapter 2" in chapters[1].title

    chunks = chunk_document_pages(pages, "doc1")
    chapters, chunks, topics = extract_topics_for_chapters(chapters, pages, chunks, outline_subtopics_map=subtopics_map)
    assert len(topics) >= 2
    assert chunks[0].chapter_id is not None

def test_retrieval_and_qa():
    chunks = [
        ChunkData(
            chunk_id="c1",
            document_id="doc1",
            page_number=1,
            chapter_id="chap1",
            topic_id="top1",
            text="Convolutional neural networks are specialized for processing grid-structured data such as images."
        ),
        ChunkData(
            chunk_id="c2",
            document_id="doc1",
            page_number=2,
            chapter_id="chap2",
            topic_id="top2",
            text="Recurrent neural networks are designed to handle sequential and time-series data using hidden recurrence."
        )
    ]
    index = LocalRetrievalIndex(chunks)
    
    # Document scoped query
    res = generate_grounded_answer(index, "What are convolutional neural networks used for?", scope_type="document")
    assert res.grounded is True
    assert 1 in res.sources
    assert "images" in res.answer.lower()

    # Refusal test
    res_unknown = generate_grounded_answer(index, "How do quantum teleportation qubits work in astrophysics?", scope_type="document")
    assert res_unknown.grounded is False or "not found" in res_unknown.answer.lower()

def test_quiz_generation_and_evaluation():
    chunks = [
        ChunkData(
            chunk_id="c1",
            document_id="doc1",
            page_number=1,
            chapter_id="chap1",
            topic_id="top1",
            text="Supervised learning is defined as learning a function from labeled training data. Unsupervised learning discovers hidden patterns in unlabeled data."
        )
    ]
    payload, answer_keys = assemble_quiz(chunks, scope_type="document", num_questions=3, difficulty="easy")
    assert len(payload.questions) == 3
    assert len(answer_keys) == 3

    # Test submission
    first_q = payload.questions[0]
    correct_ans = answer_keys[first_q.id]["correct_answer"]
    
    submissions = [
        QuizAnswerSubmission(question_id=first_q.id, user_answer=correct_ans)
    ]
    
    eval_res = evaluate_quiz_submission(
        quiz_id=payload.quiz_id,
        scope_type=payload.scope_type,
        scope_title=payload.scope_title,
        submissions=submissions,
        answer_keys={first_q.id: answer_keys[first_q.id]}
    )
    assert eval_res.correct_count == 1
    assert eval_res.score_percentage == 100.0
