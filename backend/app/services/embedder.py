from typing import List, Optional
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
    def model(self) -> Optional[SentenceTransformer]:
        """Lazy load the embedding model to avoid blocking startups and unrelated tests."""
        if self._model is None:
            model_name = settings.EMBEDDING_MODEL
            logger.info(f"Loading embedding model '{model_name}'...")
            try:
                # First try to load locally to avoid slow internet downloads
                self._model = SentenceTransformer(model_name, local_files_only=True)
                logger.info(f"Successfully loaded embedding model '{model_name}' from local cache.")
            except Exception as local_err:
                logger.info(f"Model not found locally ({local_err}). Attempting to download '{model_name}' (this might take a while)...")
                try:
                    self._model = SentenceTransformer(model_name)
                    logger.info(f"Successfully downloaded and loaded embedding model '{model_name}'.")
                except Exception as download_err:
                    logger.error(f"Failed to download embedding model: {download_err}. Falling back to mock embeddings.")
                    self._model = False
        
        if self._model is False:
            return None
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
        model = self.model
        if model is None:
            return [0.0] * 1024
        try:
            embedding = model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return [0.0] * 1024

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
        model = self.model
        if model is None:
            return [[0.0] * 1024 for _ in texts]
        try:
            embeddings = model.encode(texts)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.0] * 1024 for _ in texts]

# Global singleton instance
embedder_service = EmbedderService()
