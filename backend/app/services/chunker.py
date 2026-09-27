from __future__ import annotations
import re
from typing import List
from backend.app.models.schemas import PageData, ChunkData

def split_into_sentences(text: str) -> List[str]:
    """
    Splits text into sentences using regex boundary matching.
    """
    if not text:
        return []
    # Match sentence terminators followed by space or newline
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_document_pages(
    pages: List[PageData],
    document_id: str,
    target_chunk_chars: int = 700,
    overlap_chars: int = 150
) -> List[ChunkData]:
    """
    Divides document page texts into semantic chunks with sliding window overlap.
    Preserves exact page numbers, start/end char indices, and sequential order.
    """
    chunks: List[ChunkData] = []
    chunk_counter = 0

    for page in pages:
        text = page.clean_text
        if not text:
            continue

        paragraphs = text.split('\n\n')
        current_chunk_sentences: List[str] = []
        current_len = 0
        char_offset = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            sentences = split_into_sentences(para)
            if not sentences:
                sentences = [para]

            for sentence in sentences:
                sent_len = len(sentence) + 1
                if current_len + sent_len > target_chunk_chars and current_chunk_sentences:
                    chunk_text = " ".join(current_chunk_sentences)
                    chunk_id = f"{document_id}_chunk_{chunk_counter}"
                    start_char = max(0, char_offset - current_len)
                    end_char = start_char + len(chunk_text)

                    chunks.append(ChunkData(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        page_number=page.page_number,
                        start_char=start_char,
                        end_char=end_char,
                        text=chunk_text,
                        position=chunk_counter
                    ))
                    chunk_counter += 1

                    # Retain overlap sentences for context continuity
                    overlap_acc: List[str] = []
                    overlap_len = 0
                    for s in reversed(current_chunk_sentences):
                        if overlap_len + len(s) < overlap_chars:
                            overlap_acc.insert(0, s)
                            overlap_len += len(s) + 1
                        else:
                            break
                    current_chunk_sentences = list(overlap_acc)
                    current_len = sum(len(s) + 1 for s in current_chunk_sentences)

                current_chunk_sentences.append(sentence)
                current_len += sent_len
                char_offset += sent_len

        # Flush remaining sentences for the page
        if current_chunk_sentences:
            chunk_text = " ".join(current_chunk_sentences)
            chunk_id = f"{document_id}_chunk_{chunk_counter}"
            start_char = max(0, char_offset - current_len)
            end_char = start_char + len(chunk_text)

            chunks.append(ChunkData(
                chunk_id=chunk_id,
                document_id=document_id,
                page_number=page.page_number,
                start_char=start_char,
                end_char=end_char,
                text=chunk_text,
                position=chunk_counter
            ))
            chunk_counter += 1

    return chunks
