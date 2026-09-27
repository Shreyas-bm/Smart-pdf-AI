from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter
from backend.app.models.schemas import PageData, ChunkData, ChapterData, TopicData

TOPIC_HEADER_PATTERNS = [
    re.compile(r'^[0-9]+\.[0-9]+\s+([A-Z][A-Za-z0-9\s,\-\:]{3,60})$'),
    re.compile(r'^(?:section|part|topic)\s+[0-9a-z]+[:.\-\s]+(.*)$', re.IGNORECASE),
    re.compile(r'^[A-Z][A-Za-z0-9\s]{3,40}:?$')
]

STOP_WORDS = {
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which', 'about',
    'into', 'more', 'other', 'some', 'such', 'than', 'them', 'these', 'they', 'will',
    'also', 'been', 'each', 'even', 'first', 'most', 'only', 'same', 'their', 'when', 'chapter',
    'figure', 'table', 'page', 'using', 'used', 'data', 'learning'
}

def extract_key_phrases(text: str, top_n: int = 5) -> List[str]:
    """
    Extracts high-frequency bigrams and key concept phrases from text.
    """
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    words = [w for w in words if w not in STOP_WORDS]
    if not words:
        return []
        
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1) if words[i] != words[i+1]]
    counts = Counter(bigrams)
    unigram_counts = Counter(words)
    
    top_phrases = [phrase.title() for phrase, _ in counts.most_common(top_n)]
    if len(top_phrases) < top_n:
        for word, _ in unigram_counts.most_common(top_n - len(top_phrases)):
            top_phrases.append(word.title())
            
    return top_phrases

def extract_topics_for_chapters(
    chapters: List[ChapterData],
    pages: List[PageData],
    chunks: List[ChunkData],
    outline_subtopics_map: Optional[Dict[str, List[Dict[str, Any]]]] = None
) -> Tuple[List[ChapterData], List[ChunkData], List[TopicData]]:
    """
    Identifies subtopics for each chapter:
    - Uses authentic TOC hierarchy sub-items if present in outline_subtopics_map.
    - Otherwise parses in-page sub-headers and keyword clusters.
    - Annotates Chunks with chapter_id and topic_id.
    """
    all_topics: List[TopicData] = []
    page_map = {p.page_number: p for p in pages}
    outline_map = outline_subtopics_map or {}
    
    # 1. Assign Chapter IDs to Chunks
    for chunk in chunks:
        for chap in chapters:
            if chap.start_page <= chunk.page_number <= chap.end_page:
                chunk.chapter_id = chap.id
                break

    # 2. Extract topics per chapter
    for chap in chapters:
        chap_pages = [page_map[p_num] for p_num in range(chap.start_page, chap.end_page + 1) if p_num in page_map]
        detected_topics: List[Tuple[int, str]] = [] # (start_page, title)
        
        # A. Check if authentic subtopics were extracted from PDF Outline (TOC)
        if chap.id in outline_map and len(outline_map[chap.id]) > 0:
            for item in outline_map[chap.id]:
                detected_topics.append((item["start_page"], item["title"]))
                
        # B. If no outline subtopics, parse sub-headers from chapter pages
        if len(detected_topics) == 0:
            for page in chap_pages:
                lines = [l.strip() for l in page.clean_text.split('\n') if l.strip()]
                for line in lines:
                    if len(line) < 5 or len(line) > 60:
                        continue
                    for pattern in TOPIC_HEADER_PATTERNS:
                        match = pattern.match(line)
                        if match and not any(line.lower() in t[1].lower() for t in detected_topics):
                            title = line.rstrip(':').strip()
                            detected_topics.append((page.page_number, title))
                            break

        # C. Fallback: Create 2-4 logical subtopics if none found
        if len(detected_topics) < 2:
            num_subtopics = max(1, min(3, len(chap_pages)))
            pages_per_sub = max(1, len(chap_pages) // num_subtopics) if chap_pages else 1
            
            detected_topics = []
            for t_idx in range(num_subtopics):
                sub_start_p = chap.start_page + (t_idx * pages_per_sub)
                if sub_start_p > chap.end_page:
                    break
                sub_end_p = min(chap.end_page, sub_start_p + pages_per_sub - 1)
                
                sub_text = " ".join(page_map[p].clean_text for p in range(sub_start_p, sub_end_p + 1) if p in page_map)
                key_phrases = extract_key_phrases(sub_text, top_n=2)
                title = f"{key_phrases[0]} Overview" if key_phrases else f"Section {t_idx + 1}"
                detected_topics.append((sub_start_p, title))

        # Build TopicData objects
        chapter_topics: List[TopicData] = []
        for t_idx, (t_start, t_title) in enumerate(detected_topics):
            t_end = chap.end_page
            if t_idx + 1 < len(detected_topics):
                t_end = max(t_start, detected_topics[t_idx + 1][0] - 1)
                
            topic_id = f"{chap.id}_topic_{t_idx + 1}"
            
            topic_chunk_ids = [
                c.chunk_id for c in chunks 
                if c.chapter_id == chap.id and t_start <= c.page_number <= t_end
            ]
            
            topic_text = " ".join(
                c.text for c in chunks if c.chunk_id in topic_chunk_ids
            )
            key_concepts = extract_key_phrases(topic_text, top_n=4)
            
            topic_data = TopicData(
                id=topic_id,
                chapter_id=chap.id,
                title=t_title,
                start_page=t_start,
                end_page=t_end,
                summary="",
                key_concepts=key_concepts,
                chunk_ids=topic_chunk_ids
            )
            
            chapter_topics.append(topic_data)
            all_topics.append(topic_data)
            
            for c in chunks:
                if c.chunk_id in topic_chunk_ids:
                    c.topic_id = topic_id
                    
        chap.topics = chapter_topics

    return chapters, chunks, all_topics
