import sys
import os
import unittest

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.services.embedder import embedder_service

class TestEmbedderService(unittest.TestCase):
    def test_chunk_text(self):
        text = "This is a sample paragraph. " * 50
        chunks = embedder_service.chunk_text(text)
        self.assertGreater(len(chunks), 0)
        for chunk in chunks:
            self.assertIsInstance(chunk, str)
            self.assertTrue(len(chunk) > 0)

    def test_embed_text(self):
        # We will embed a simple text and verify the dimensions
        text = "Hello world, this is a test for embedding dimensions."
        embedding = embedder_service.embed_text(text)
        self.assertEqual(len(embedding), 1024)
        self.assertIsInstance(embedding, list)
        self.assertIsInstance(embedding[0], float)

    def test_embed_texts(self):
        texts = ["Sentence one", "Sentence two"]
        embeddings = embedder_service.embed_texts(texts)
        self.assertEqual(len(embeddings), 2)
        for emb in embeddings:
            self.assertEqual(len(emb), 1024)

if __name__ == "__main__":
    unittest.main()
