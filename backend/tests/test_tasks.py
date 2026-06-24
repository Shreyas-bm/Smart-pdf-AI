import sys
import os
import uuid
import unittest
import fitz
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

# Override DB session for testing before importing app components
from app.db.models import Base, User, PDFDocument, DocumentChunk

TEST_DB_FILE = "test_tasks.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Monkeypatch the get_db/SessionLocal in app modules
import app.db.session
app.db.session.SessionLocal = TestingSessionLocal

# Also monkeypatch app.workers.tasks.SessionLocal
import app.workers.tasks
app.workers.tasks.SessionLocal = TestingSessionLocal

from app.workers.tasks import process_pdf_document

class TestCeleryTasks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a fresh database for testing
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
                
        Base.metadata.create_all(bind=engine)
        cls.db = TestingSessionLocal()
        
        # Insert a dummy user
        cls.user = User(
            email="tasks_test@example.com",
            password_hash="hashedpassword"
        )
        cls.db.add(cls.user)
        cls.db.commit()
        cls.db.refresh(cls.user)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def test_process_pdf_document_success(self):
        # 1. Create a dummy multi-page PDF document
        temp_pdf_path = "temp_test_document.pdf"
        doc = fitz.open()
        
        page1 = doc.new_page()
        page1.insert_text((50, 50), "Photosynthesis is the process by which green plants make food.")
        
        page2 = doc.new_page()
        page2.insert_text((50, 50), "Quantum computing is a type of computation whose operations can harness the phenomena of quantum mechanics.")
        
        doc.save(temp_pdf_path)
        doc.close()
        
        # 2. Insert PDFDocument record
        pdf_doc = PDFDocument(
            user_id=self.user.id,
            filename="temp_test_document.pdf",
            file_url="",
            file_size=os.path.getsize(temp_pdf_path),
            status="processing"
        )
        self.db.add(pdf_doc)
        self.db.commit()
        self.db.refresh(pdf_doc)
        
        # 3. Call the task synchronously
        result = process_pdf_document(str(pdf_doc.id), temp_pdf_path)
        
        self.assertTrue(result)
        
        # 4. Refresh document status from DB
        self.db.refresh(pdf_doc)
        self.assertEqual(pdf_doc.status, "completed")
        self.assertTrue(pdf_doc.file_url.startswith("mock-s3://") or len(pdf_doc.file_url) > 0)
        
        # 5. Verify chunk entries in database
        chunks = self.db.query(DocumentChunk).filter(DocumentChunk.document_id == pdf_doc.id).all()
        self.assertGreater(len(chunks), 0)
        
        # Verify page 1 and page 2 chunk content
        page_numbers = {chunk.page_number for chunk in chunks}
        self.assertIn(1, page_numbers)
        self.assertIn(2, page_numbers)
        
        # Verify local file cleanup
        self.assertFalse(os.path.exists(temp_pdf_path))

if __name__ == "__main__":
    unittest.main()
