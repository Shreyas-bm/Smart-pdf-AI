import sys
import os
import io
import uuid
import unittest
import fitz
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.main import app
from app.db.session import get_db
from app.db.models import Base, User, PDFDocument, DocumentChunk

# Setup SQLite test database
TEST_DB_FILE = "test_documents.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Mock SessionLocal for tasks
import app.workers.tasks as worker_tasks
worker_tasks.SessionLocal = TestingSessionLocal

# Enable eager execution of Celery tasks during tests
from app.workers.celery_app import celery_app
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

class TestDocumentsAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Remove old test DB if it exists
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
        # Create all tables in the test database
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
        # Register and log in a test user to get authentication token
        cls.user_email = "doc_test_user@example.com"
        cls.user_password = "password123"
        
        reg_res = cls.client.post(
            "/api/auth/signup",
            json={"email": cls.user_email, "password": cls.user_password}
        )
        cls.session_token = reg_res.json()["session_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.session_token}"}

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def test_01_upload_and_ingestion_flow(self):
        # 1. Create a dummy PDF file in memory
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "This is the first page of our course study material. It covers basic calculus.")
        page2 = doc.new_page()
        page2.insert_text((50, 50), "This is the second page. It covers limits, derivatives, and integrations.")
        pdf_bytes = doc.write()
        doc.close()
        
        # 2. Upload the PDF file
        pdf_file = io.BytesIO(pdf_bytes)
        response = self.client.post(
            "/api/documents/upload",
            headers=self.auth_headers,
            files={"file": ("calculus_notes.pdf", pdf_file, "application/pdf")}
        )
        
        # Assert upload response
        self.assertEqual(response.status_code, 202)
        data = response.json()
        self.assertIn("document_id", data)
        self.assertEqual(data["filename"], "calculus_notes.pdf")
        self.assertEqual(data["status"], "processing")
        self.assertIn("task_id", data)
        
        doc_id = data["document_id"]
        
        # 3. Retrieve document status (which should be completed because celery runs eagerly)
        status_res = self.client.get(
            f"/api/documents/{doc_id}",
            headers=self.auth_headers
        )
        self.assertEqual(status_res.status_code, 200)
        status_data = status_res.json()
        self.assertEqual(status_data["id"], doc_id)
        self.assertEqual(status_data["status"], "completed")
        self.assertEqual(status_data["filename"], "calculus_notes.pdf")
        
        # Verify chunks were added to SQLite test DB
        db = TestingSessionLocal()
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == uuid.UUID(doc_id)).all()
        db.close()
        
        self.assertGreater(len(chunks), 0)
        # Check that page numbers are correct (1-indexed)
        self.assertIn(1, [chunk.page_number for chunk in chunks])
        self.assertIn(2, [chunk.page_number for chunk in chunks])

    def test_02_upload_invalid_file_type(self):
        # Trying to upload a non-PDF file should fail
        text_file = io.BytesIO(b"some plain text data")
        response = self.client.post(
            "/api/documents/upload",
            headers=self.auth_headers,
            files={"file": ("notes.txt", text_file, "text/plain")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Only PDF files are supported.")

    def test_03_list_documents(self):
        # List all user documents
        response = self.client.get(
            "/api/documents",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["filename"], "calculus_notes.pdf")

    def test_04_delete_document(self):
        # Get list first to retrieve doc ID
        list_res = self.client.get(
            "/api/documents",
            headers=self.auth_headers
        )
        doc_id = list_res.json()[0]["id"]
        
        # Delete document
        delete_res = self.client.delete(
            f"/api/documents/{doc_id}",
            headers=self.auth_headers
        )
        self.assertEqual(delete_res.status_code, 200)
        self.assertEqual(delete_res.json()["detail"], "Document successfully deleted.")
        
        # Verify it is deleted from db
        db = TestingSessionLocal()
        doc_in_db = db.query(PDFDocument).filter(PDFDocument.id == uuid.UUID(doc_id)).first()
        chunks_in_db = db.query(DocumentChunk).filter(DocumentChunk.document_id == uuid.UUID(doc_id)).all()
        db.close()
        
        self.assertIsNone(doc_in_db)
        self.assertEqual(len(chunks_in_db), 0)

if __name__ == "__main__":
    unittest.main()
