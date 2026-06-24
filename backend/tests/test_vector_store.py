import sys
import os
import uuid
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.models import Base, User, PDFDocument, DocumentChunk
from app.db.vector_store import save_document_chunks, similarity_search
from app.services.embedder import embedder_service

TEST_DB_FILE = "test_vector.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"

class TestVectorStore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a fresh database for testing
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
                
        cls.engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)
        
        cls.db = cls.SessionLocal()
        
        # Insert a dummy user
        cls.user = User(
            email="vector_test@example.com",
            password_hash="hashedpassword"
        )
        cls.db.add(cls.user)
        cls.db.commit()
        cls.db.refresh(cls.user)
        
        # Insert a dummy PDF document
        cls.doc = PDFDocument(
            user_id=cls.user.id,
            filename="test_course.pdf",
            file_url="http://mock-s3/test_course.pdf",
            file_size=1024,
            status="processing"
        )
        cls.db.add(cls.doc)
        cls.db.commit()
        cls.db.refresh(cls.doc)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        Base.metadata.drop_all(bind=cls.engine)
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def test_save_and_similarity_search(self):
        # We will define 5 distinct paragraphs
        paragraphs = [
            "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy.",
            "Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature.",
            "The Roman Empire was the post-republican period of ancient Rome, spanning across Europe, North Africa, and Western Asia.",
            "Python is an interpreted, high-level, general-purpose programming language designed by Guido van Rossum.",
            "Cooking pasta requires boiling water, adding salt, and boiling the pasta for about 8 to 12 minutes."
        ]
        
        # Generate embeddings
        embeddings = embedder_service.embed_texts(paragraphs)
        
        chunks_data = []
        for i, text in enumerate(paragraphs):
            chunks_data.append({
                "chunk_index": i,
                "text_content": text,
                "page_number": i + 1,
                "embedding": embeddings[i]
            })
            
        # Save chunks to database
        save_document_chunks(self.db, self.doc.id, chunks_data)
        
        # Query: Ask about Python programming
        query = "Who designed the Python programming language?"
        query_emb = embedder_service.embed_text(query)
        
        # Search
        results = similarity_search(self.db, self.doc.id, query_emb, limit=2)
        
        self.assertEqual(len(results), 2)
        # The most relevant should be the Python paragraph
        self.assertIn("Python is an interpreted", results[0].text_content)
        self.assertEqual(results[0].page_number, 4)

        # Query: Ask about plants converting light energy
        query2 = "How do plants convert sunlight into chemical energy?"
        query_emb2 = embedder_service.embed_text(query2)
        
        # Search
        results2 = similarity_search(self.db, self.doc.id, query_emb2, limit=1)
        self.assertEqual(len(results2), 1)
        self.assertIn("Photosynthesis", results2[0].text_content)
        self.assertEqual(results2[0].page_number, 1)

if __name__ == "__main__":
    unittest.main()
