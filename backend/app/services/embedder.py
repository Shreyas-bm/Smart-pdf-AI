from typing import List
import logging
from llama_index.core.node_parser import SentenceSplitter
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)

class EmbedderService:
    """
    EmbedderService handles text chunking and generating embeddings for RAG operations.
    It uses LlamaIndex's SentenceSplitter for chunking and SentenceTransformer for embeddings.
    """
    def __init__(self):
        self.chunk_size = 512
        self.chunk_overlap = 64
        self._splitter = SentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        self._model = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the embedding model to avoid blocking startups and unrelated tests."""
        if self._model is None:
            model_name = settings.EMBEDDING_MODEL
            logger.info(f"Loading embedding model '{model_name}'...")
            try:
                # Use CPU or GPU based on torch availability
                self._model = SentenceTransformer(model_name)
                logger.info(f"Successfully loaded embedding model '{model_name}'.")
            except Exception as e:
                logger.error(f"Failed to load embedding model '{model_name}': {e}", exc_info=True)
                raise e
        return self._model

    def chunk_text(self, text: str) -> List[str]:
        """
        Splits a text string into semantic paragraphs/chunks.
        
        Args:
            text: The raw text content to split.
            
        Returns:
            A list of text chunk strings.
        """
        if not text.strip():
            return []
        return self._splitter.split_text(text)

    def embed_text(self, text: str) -> List[float]:
        """
        Generates a vector embedding for a single text chunk.
        
        Args:
            text: The text to embed.
            
        Returns:
            A list of floats representing the embedding vector.
        """
        if not text.strip():
            return []
        embedding = self.model.encode(text)
        return embedding.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates vector embeddings for a list of text chunks in batch.
        
        Args:
            texts: A list of text strings to embed.
            
        Returns:
            A list of float lists representing the embedding vectors.
        """
        if not texts:
            return []
        embeddings = self.model.encode(texts)
        return [emb.tolist() for emb in embeddings]

# Global singleton instance
embedder_service = EmbedderService()
