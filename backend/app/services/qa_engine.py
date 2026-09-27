from __future__ import annotations
import re
from typing import List, Tuple, Optional, Dict, Any
from backend.app.models.schemas import QAResponse, ChunkData
from backend.app.services.chunker import split_into_sentences
from backend.app.services.retrieval_index import LocalRetrievalIndex

def generate_grounded_answer(
    retrieval_index: Optional[LocalRetrievalIndex],
    question: str,
    scope_type: str = "document",
    scope_id: Optional[str] = None,
    top_k: int = 5
) -> QAResponse:
    """
    Formulates a strictly document-grounded answer with source citations and refusal fallback.
    """
    if not question or not question.strip():
        return QAResponse(
            question=question,
            answer="Please provide a valid question.",
            grounded=False,
            confidence=0.0,
            sources=[],
            context_snippets=[],
            scope_type=scope_type, # type: ignore
            scope_id=scope_id
        )

    if retrieval_index is None:
        return QAResponse(
            question=question,
            answer="Document search index is not initialized or document has no indexed text.",
            grounded=False,
            confidence=0.0,
            sources=[],
            context_snippets=[],
            scope_type=scope_type, # type: ignore
            scope_id=scope_id
        )

    # Retrieve chunks
    matches: List[Tuple[ChunkData, float]] = retrieval_index.retrieve(
        query=question,
        scope_type=scope_type,
        scope_id=scope_id,
        top_k=top_k,
        min_score_threshold=0.08
    )

    if not matches:
        return QAResponse(
            question=question,
            answer="Information not found in document for this scope.",
            grounded=False,
            confidence=0.0,
            sources=[],
            context_snippets=[],
            scope_type=scope_type, # type: ignore
            scope_id=scope_id
        )

    top_chunk, top_score = matches[0]
    
    # Collect relevant source pages and snippets
    source_pages = sorted(list(set(chunk.page_number for chunk, _ in matches)))
    snippets = [chunk.text for chunk, _ in matches]

    # Extract salient sentences matching query keywords
    query_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', question.lower())) - {
        'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'does', 'explain', 'tell'
    }
    
    candidate_sentences = []
    for chunk, score in matches:
        sentences = split_into_sentences(chunk.text)
        for sent in sentences:
            # Skip TOC dot lines, index page lines, or short fragmented lines
            if '....' in sent or '····' in sent or len(sent) < 25:
                continue
            sent_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', sent.lower()))
            overlap = len(query_words.intersection(sent_words))
            if overlap > 0:
                candidate_sentences.append((overlap, sent, chunk.page_number))

    if candidate_sentences:
        candidate_sentences.sort(key=lambda x: x[0], reverse=True)
        # Select top 2-4 distinct sentences
        seen_sents = set()
        chosen = []
        for _, s, p in candidate_sentences:
            if s not in seen_sents:
                seen_sents.add(s)
                chosen.append(s)
                if len(chosen) >= 3:
                    break
        answer_body = " ".join(chosen)
    else:
        # Fallback to top matching chunk excerpt
        answer_body = top_chunk.text[:400] + ("..." if len(top_chunk.text) > 400 else "")

    confidence = min(1.0, round(float(top_score * 1.5), 2))

    return QAResponse(
        question=question,
        answer=answer_body,
        grounded=True,
        confidence=confidence,
        sources=source_pages,
        context_snippets=[s[:300] for s in snippets[:3]],
        scope_type=scope_type, # type: ignore
        scope_id=scope_id
    )
