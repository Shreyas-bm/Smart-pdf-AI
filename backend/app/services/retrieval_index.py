from __future__ import annotations
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.models.schemas import ChunkData

class LocalRetrievalIndex:
    """
    In-memory TF-IDF vector retrieval engine with metadata filtering for
    document-, chapter-, and topic-scoped semantic search.
    """
    def __init__(self, chunks: List[ChunkData]):
        self.chunks = chunks
        self.chunk_ids = [c.chunk_id for c in chunks]
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self._build_index()

    def _build_index(self):
        if not self.chunks:
            return
            
        corpus = [c.text for c in self.chunks]
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words='english',
            min_df=1,
            max_features=15000
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def retrieve(
        self,
        query: str,
        scope_type: str = "document",
        scope_id: Optional[str] = None,
        top_k: int = 5,
        min_score_threshold: float = 0.08
    ) -> List[Tuple[ChunkData, float]]:
        """
        Retrieves top_k most relevant chunks matching the query under the specified scope.
        Returns list of (ChunkData, similarity_score).
        """
        if not query or not query.strip() or self.tfidf_matrix is None or self.vectorizer is None:
            return []

        # Vectorize query
        query_vec = self.vectorizer.transform([query.strip()])
        scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Build candidate list with filtering
        candidate_matches: List[Tuple[ChunkData, float]] = []
        for idx, score in enumerate(scores):
            chunk = self.chunks[idx]
            
            # Apply scope filter
            if scope_type == "chapter" and scope_id:
                if chunk.chapter_id != scope_id:
                    continue
            elif scope_type == "topic" and scope_id:
                if chunk.topic_id != scope_id:
                    continue
                    
            if score >= min_score_threshold:
                candidate_matches.append((chunk, float(score)))

        # Sort by relevance score descending
        candidate_matches.sort(key=lambda x: x[1], reverse=True)
        return candidate_matches[:top_k]

    def retrieve_document_chunks(self, query: str, top_k: int = 5) -> List[Tuple[ChunkData, float]]:
        return self.retrieve(query, scope_type="document", top_k=top_k)

    def retrieve_chapter_chunks(self, query: str, chapter_id: str, top_k: int = 5) -> List[Tuple[ChunkData, float]]:
        return self.retrieve(query, scope_type="chapter", scope_id=chapter_id, top_k=top_k)

    def retrieve_topic_chunks(self, query: str, topic_id: str, top_k: int = 5) -> List[Tuple[ChunkData, float]]:
        return self.retrieve(query, scope_type="topic", scope_id=topic_id, top_k=top_k)
