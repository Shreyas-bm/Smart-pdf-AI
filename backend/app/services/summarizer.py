from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple
from collections import Counter
from backend.app.models.schemas import PageData, ChunkData, ChapterData, TopicData, DocumentMetadata
from backend.app.services.chunker import split_into_sentences

STOP_WORDS = {
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which', 'about',
    'into', 'more', 'other', 'some', 'such', 'than', 'them', 'then', 'these', 'they', 'will',
    'also', 'been', 'each', 'even', 'first', 'most', 'only', 'same', 'their', 'when', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'by', 'an', 'a', 'as', 'it'
}

def score_and_extract_sentences(text: str, max_sentences: int = 3) -> str:
    """
    Local extractive summarizer: scores sentences based on word frequency,
    position weighting, and optimal sentence length.
    """
    if not text or not text.strip():
        return ""
        
    sentences = split_into_sentences(text)
    if len(sentences) <= max_sentences:
        return " ".join(sentences)
        
    # Word frequency map
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    words = [w for w in words if w not in STOP_WORDS]
    if not words:
        return " ".join(sentences[:max_sentences])
        
    word_freq = Counter(words)
    max_freq = max(word_freq.values())
    word_weights = {w: count / max_freq for w, count in word_freq.items()}
    
    scored_sentences: List[Tuple[int, float, str]] = [] # (original_index, score, sentence)
    
    for idx, sent in enumerate(sentences):
        sent_words = re.findall(r'\b[a-zA-Z]{3,}\b', sent.lower())
        if len(sent_words) < 5 or len(sent_words) > 60:
            continue
            
        base_score = sum(word_weights.get(w, 0.0) for w in sent_words) / (len(sent_words) ** 0.5)
        
        # Position boost (earlier sentences in a section often state core themes)
        pos_boost = 1.3 if idx == 0 else (1.15 if idx < 3 else 1.0)
        
        scored_sentences.append((idx, base_score * pos_boost, sent))
        
    if not scored_sentences:
        return " ".join(sentences[:max_sentences])
        
    # Pick top N highest scoring
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    top_picks = scored_sentences[:max_sentences]
    
    # Sort back by original sequential document order
    top_picks.sort(key=lambda x: x[0])
    
    return " ".join([item[2] for item in top_picks])

def generate_all_summaries(
    document: DocumentMetadata,
    chapters: List[ChapterData],
    topics: List[TopicData],
    chunks: List[ChunkData],
    pages: List[PageData]
) -> Tuple[DocumentMetadata, List[ChapterData], List[TopicData]]:
    """
    Generates summaries for:
    - Entire Document overview
    - Each Chapter
    - Each Topic
    """
    chunk_map = {c.chunk_id: c for c in chunks}
    
    # 1. Topic Summaries
    for topic in topics:
        topic_texts = [chunk_map[cid].text for cid in topic.chunk_ids if cid in chunk_map]
        combined = " ".join(topic_texts)
        topic.summary = score_and_extract_sentences(combined, max_sentences=2)
        if not topic.summary and topic_texts:
            topic.summary = topic_texts[0][:200] + "..."

    # 2. Chapter Summaries
    for chap in chapters:
        chap_chunks = [c.text for c in chunks if c.chapter_id == chap.id]
        combined_chap = " ".join(chap_chunks)
        chap.summary = score_and_extract_sentences(combined_chap, max_sentences=3)
        if not chap.summary and chap_chunks:
            chap.summary = chap_chunks[0][:300] + "..."

    # 3. Document Overview Summary
    doc_sample = " ".join([c.summary for c in chapters if c.summary])
    if not doc_sample:
        doc_sample = " ".join([p.clean_text[:400] for p in pages[:5]])
        
    document.summary = score_and_extract_sentences(doc_sample, max_sentences=4)
    if not document.summary:
        document.summary = f"This document comprises {document.page_count} pages covering {len(chapters)} main chapters and {len(topics)} detailed topics."
        
    # Key topics for overview
    all_key_concepts = []
    for t in topics:
        all_key_concepts.extend(t.key_concepts)
    document.key_topics = list(dict.fromkeys(all_key_concepts))[:8]
    document.chapters_count = len(chapters)
    document.topics_count = len(topics)

    return document, chapters, topics
