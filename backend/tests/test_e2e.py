import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from pypdf import PdfWriter

client = TestClient(app)

def create_sample_pdf_bytes() -> bytes:
    writer = PdfWriter()
    # Create 3 pages with content
    for page_num in range(1, 4):
        page = writer.add_blank_page(width=612, height=792)
    
    # We can write text using reportlab or PyMuPDF if available
    import fitz
    doc = fitz.open()
    
    p1 = doc.new_page()
    p1.insert_text((50, 80), "Chapter 1: Foundations of Deep Learning\n\nDeep learning is a subset of machine learning based on artificial neural networks. Convolutional neural networks are specialized for processing visual imagery.", fontsize=12)
    
    p2 = doc.new_page()
    p2.insert_text((50, 80), "Chapter 2: Optimization Algorithms\n\nGradient descent is an optimization algorithm used to minimize loss functions. Backpropagation calculates the gradients of the error function with respect to weights.", fontsize=12)

    p3 = doc.new_page()
    p3.insert_text((50, 80), "Chapter 3: Sequence Modeling\n\nRecurrent neural networks are designed to process sequential data and time series. Transformers utilize self-attention mechanisms to model relationships.", fontsize=12)

    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def test_full_pipeline_e2e():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200

    # 2. Create session
    res = client.post("/api/session/create")
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # 3. Upload PDF
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("deep_learning_intro.pdf", pdf_bytes, "application/pdf")}
    res = client.post(f"/api/session/{session_id}/upload", files=files)
    assert res.status_code == 200
    upload_data = res.json()
    assert upload_data["page_count"] == 3

    # 4. Process Document
    res = client.post(f"/api/document/{session_id}/process", json={"ocr_mode": "auto", "ocr_dpi": 150})
    assert res.status_code == 200
    assert res.json()["status"] == "ready"

    # 5. Get Overview
    res = client.get(f"/api/document/{session_id}/overview")
    assert res.status_code == 200
    overview_data = res.json()
    assert overview_data["document"]["page_count"] == 3
    assert len(overview_data["chapters"]) >= 2

    # 6. Chapters & Topics Detail
    first_chapter = overview_data["chapters"][0]
    res = client.get(f"/api/document/{session_id}/chapters/{first_chapter['id']}")
    assert res.status_code == 200
    chap_detail = res.json()
    assert len(chap_detail["topics"]) >= 1

    first_topic = chap_detail["topics"][0]
    res = client.get(f"/api/document/{session_id}/topics/{first_topic['id']}")
    assert res.status_code == 200
    assert res.json()["topic"]["id"] == first_topic["id"]

    # 7. Grounded Q&A
    res = client.post(f"/api/qa/{session_id}/document", json={"question": "What is gradient descent?", "top_k": 3})
    assert res.status_code == 200
    qa_res = res.json()
    assert qa_res["grounded"] is True
    assert 2 in qa_res["sources"]

    # 8. Quiz Generation & Submission
    res = client.post(f"/api/quiz/{session_id}/generate", json={
        "scope_type": "document",
        "num_questions": 3,
        "difficulty": "medium",
        "question_types": ["mcq", "true_false", "short_answer"]
    })
    assert res.status_code == 200
    quiz_data = res.json()
    assert len(quiz_data["questions"]) == 3
    quiz_id = quiz_data["quiz_id"]

    # Submit quiz
    answers = [{"question_id": q["id"], "user_answer": "True" if q["question_type"] == "true_false" else "A"} for q in quiz_data["questions"]]
    res = client.post(f"/api/quiz/{session_id}/{quiz_id}/submit", json={"answers": answers})
    assert res.status_code == 200
    submit_res = res.json()
    assert submit_res["total_questions"] == 3
    assert "score_percentage" in submit_res

    # 9. Cleanup session
    res = client.delete(f"/api/session/{session_id}")
    assert res.status_code == 200
    assert res.json()["deleted"] is True
