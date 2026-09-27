from __future__ import annotations
import re
import math
import logging
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path
from backend.app.models.schemas import PageData, ChapterData, TopicData

logger = logging.getLogger("aipdf.chapter_detector")

# Patterns identifying front-matter / meta-pages that should NOT be chapters
IGNORED_SECTION_TITLES = {
    'table of contents', 'contents', 'detailed contents', 'brief contents',
    'copyright', 'colophon', 'cover', 'title page', 'half title',
    'about the author', 'about the authors', 'about the book',
    'acknowledgments', 'acknowledgements', 'dedication',
    'index', 'subject index', 'author index'
}

CHAPTER_PATTERNS = [
    re.compile(r'^(?:chapter|unit|module)\s+([0-9ivxlcdm]+)[:.\-\s]*(.*)$', re.IGNORECASE),
    re.compile(r'^([0-9]{1,2})\s*[\.\-]\s*([A-Z][A-Za-z0-9\s,\-\:]{3,60})$'),
    re.compile(r'^(?:part)\s+([0-9ivxlcdm]+)[:.\-\s]+chapter\s+([0-9]+)[:.\-\s]*(.*)$', re.IGNORECASE),
]

TOC_LINE_PATTERN = re.compile(
    r'^(?:chapter\s+([0-9ivxlcdm]+)[:.\s]*)?(.*?)(?:[\.·\-_]{3,}|\s{4,})\s*([0-9]{1,4})$',
    re.IGNORECASE
)

def is_meta_or_frontmatter_title(title: str) -> bool:
    """Checks if a title represents front-matter or meta-pages rather than a real chapter."""
    clean = title.lower().strip()
    clean = re.sub(r'^[0-9\.\-\s]+', '', clean).strip()
    return clean in IGNORED_SECTION_TITLES or any(clean.startswith(term) for term in ['table of contents', 'contents', 'copyright'])

def is_toc_page(text: str) -> bool:
    """
    Detects if a page is a Table of Contents page by scanning for header words
    or a high density of dot leaders / line-ending page numbers.
    """
    if not text:
        return False
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return False
        
    first_lines = " ".join(lines[:4]).lower()
    if any(h in first_lines for h in ['table of contents', 'contents', 'brief contents', 'detailed contents']):
        return True
        
    # Count lines matching TOC patterns (e.g. "Chapter 1 ... 25")
    toc_matches = sum(1 for line in lines if TOC_LINE_PATTERN.match(line) or '....' in line or '····' in line)
    return toc_matches >= 3 and (toc_matches / len(lines)) >= 0.25

def extract_chapters_from_pdf_outline(pdf_path: Optional[Path], document_id: str, total_pages: int) -> Tuple[List[ChapterData], Dict[str, List[Dict[str, Any]]]]:
    """
    Intelligently parses PDF outline hierarchy (TOC):
    - Identifies real book chapters (e.g. level 2 chapters under Part I, or level 1 chapters).
    - Ignores Copyright, Table of Contents, and meta pages.
    - Captures authentic child subtopics for each chapter!
    Returns (List[ChapterData], chapter_subtopics_map).
    """
    if not pdf_path or not pdf_path.exists():
        return [], {}
        
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        toc = doc.get_toc() # List of [lvl, title, page, ...]
        doc.close()
        
        if not toc or len(toc) < 2:
            return [], {}
            
        # 1. Inspect outline for explicit "Chapter X" or numbered chapter patterns
        has_explicit_chapters = False
        chapter_entries: List[Tuple[int, int, str, int]] = [] # (original_index, lvl, title, page)
        
        for idx, item in enumerate(toc):
            lvl, title, page = item[0], item[1].strip(), item[2]
            if page <= 0 or is_meta_or_frontmatter_title(title):
                continue
            # Check for "Chapter X"
            if re.match(r'^(?:chapter\s+[0-9]+|[0-9]{1,2}\.\s+[A-Z])', title, re.IGNORECASE):
                has_explicit_chapters = True
                chapter_entries.append((idx, lvl, title, page))
                
        # 2. If no explicit "Chapter X" found, use top non-frontmatter levels (level 1 or 2)
        if not has_explicit_chapters or len(chapter_entries) < 2:
            chapter_entries = []
            min_lvl = min(item[0] for item in toc if item[2] > 0)
            
            # Check if level 1 is "Parts" (e.g. Part I, Part II)
            has_parts = any(re.match(r'^part\s+[0-9ivxlcdm]+', item[1].strip(), re.IGNORECASE) for item in toc if item[0] == min_lvl)
            target_lvl = (min_lvl + 1) if has_parts else min_lvl
            
            for idx, item in enumerate(toc):
                lvl, title, page = item[0], item[1].strip(), item[2]
                if page <= 0 or is_meta_or_frontmatter_title(title):
                    continue
                if lvl == target_lvl or (not has_parts and lvl == min_lvl):
                    # Filter out appendix or parts if desired, but keep genuine sections
                    chapter_entries.append((idx, lvl, title, page))
                    
        if len(chapter_entries) < 2:
            return [], {}
            
        # 3. Build Chapters and collect their subtopics from child TOC items
        chapters: List[ChapterData] = []
        chapter_subtopics_map: Dict[str, List[Dict[str, Any]]] = {}
        
        for c_idx, (orig_idx, c_lvl, c_title, start_p) in enumerate(chapter_entries):
            chap_num = c_idx + 1
            chap_id = f"{document_id}_chap_{chap_num}"
            start_p = max(1, min(start_p, total_pages))
            
            # End page is start of next chapter minus 1
            if c_idx + 1 < len(chapter_entries):
                next_start = max(1, min(chapter_entries[c_idx + 1][3], total_pages))
                end_p = max(start_p, next_start - 1)
            else:
                end_p = total_pages
                
            # Clean title
            formatted_title = c_title
            chap_match = re.match(r'^(?:chapter\s+)?([0-9]+)[\.:\s]+(.*)$', c_title, re.IGNORECASE)
            if chap_match:
                formatted_title = f"Chapter {chap_match.group(1)}: {chap_match.group(2).strip()}"
                
            chapters.append(ChapterData(
                id=chap_id,
                document_id=document_id,
                chapter_number=chap_num,
                title=formatted_title,
                start_page=start_p,
                end_page=end_p,
                summary=""
            ))
            
            # Extract subtopics under this chapter from TOC items between orig_idx and next chapter's orig_idx
            next_orig_idx = chapter_entries[c_idx + 1][0] if (c_idx + 1 < len(chapter_entries)) else len(toc)
            sub_items = []
            for sub_i in range(orig_idx + 1, next_orig_idx):
                s_lvl, s_title, s_page = toc[sub_i][0], toc[sub_i][1].strip(), toc[sub_i][2]
                if s_lvl > c_lvl and s_page >= start_p and s_page <= end_p and not is_meta_or_frontmatter_title(s_title):
                    sub_items.append({"title": s_title, "start_page": s_page})
                    
            chapter_subtopics_map[chap_id] = sub_items
            
        logger.info(f"Intelligently extracted {len(chapters)} genuine chapters from PDF outline.")
        return chapters, chapter_subtopics_map
    except Exception as e:
        logger.warning(f"Error reading PDF TOC: {e}")
        return [], {}

def parse_printed_toc_from_pages(pages: List[PageData], document_id: str) -> List[ChapterData]:
    """
    Parses printed Table of Contents from early pages when no embedded outline exists.
    Looks for lines like: 'Chapter 1. Deep Learning Basics ........ 25'
    """
    total_pages = len(pages)
    toc_candidates: List[Tuple[str, int]] = [] # (title, printed_page)
    
    # Check first 25 pages
    for page in pages[:25]:
        if not is_toc_page(page.clean_text):
            continue
            
        for line in page.clean_text.split('\n'):
            line = line.strip()
            match = TOC_LINE_PATTERN.match(line)
            if match:
                chap_num = match.group(1)
                title = match.group(2).strip()
                target_p_str = match.group(3)
                
                if not title or is_meta_or_frontmatter_title(title):
                    continue
                    
                try:
                    target_p = int(target_p_str)
                    if 1 <= target_p <= total_pages:
                        full_title = f"Chapter {chap_num}: {title}" if chap_num else title
                        toc_candidates.append((full_title, target_p))
                except ValueError:
                    pass
                    
    if len(toc_candidates) >= 2:
        # Build chapters from printed TOC
        chapters = []
        for idx, (title, start_p) in enumerate(toc_candidates):
            end_p = total_pages
            if idx + 1 < len(toc_candidates):
                end_p = max(start_p, toc_candidates[idx + 1][1] - 1)
                
            chapters.append(ChapterData(
                id=f"{document_id}_chap_{idx + 1}",
                document_id=document_id,
                chapter_number=idx + 1,
                title=title,
                start_page=start_p,
                end_page=end_p,
                summary=""
            ))
        return chapters
        
    return []

def detect_chapters(
    pages: List[PageData],
    document_id: str,
    pdf_path: Optional[Path | str] = None
) -> Tuple[List[ChapterData], Dict[str, List[Dict[str, Any]]]]:
    """
    Intelligent Chapter Detection:
    1. Extracts genuine chapters and subtopics from embedded PDF outline (filtering front-matter).
    2. Parses printed Table of Contents from early pages.
    3. Scans body text for structural chapter headings, skipping TOC and front-matter pages.
    4. Falls back to uniform logical partitioning.
    """
    path_obj = Path(pdf_path) if pdf_path else None
    total_pages = len(pages)
    if total_pages == 0 and path_obj and path_obj.exists():
        try:
            import fitz
            doc = fitz.open(str(path_obj))
            total_pages = len(doc)
            doc.close()
        except Exception:
            pass

    if total_pages == 0:
        return [], {}

    # 1. Try PDF Outline (TOC) first
    chapters, subtopics_map = extract_chapters_from_pdf_outline(path_obj, document_id, total_pages)
    if chapters:
        return chapters, subtopics_map

    # 2. Try Printed Table of Contents parsing
    printed_chapters = parse_printed_toc_from_pages(pages, document_id)
    if printed_chapters:
        return printed_chapters, {}

    # 3. Body text scan (skipping known TOC and front-matter pages)
    detected_headers: List[Tuple[int, str]] = []
    
    for page in pages:
        # Skip TOC pages from triggering chapter starts
        if is_toc_page(page.clean_text):
            continue
            
        lines = page.clean_text.split('\n')
        for line in lines[:5]:
            line_str = line.strip()
            if not line_str or len(line_str) > 80 or is_meta_or_frontmatter_title(line_str):
                continue
                
            for pattern in CHAPTER_PATTERNS:
                match = pattern.match(line_str)
                if match:
                    matched_title = line_str
                    if match.lastindex and match.lastindex >= 2 and match.group(2).strip():
                        matched_title = f"Chapter {match.group(1)}: {match.group(2).strip()}"
                    elif match.lastindex and match.lastindex >= 1:
                        matched_title = f"Chapter {match.group(1)}"
                        
                    if not detected_headers or detected_headers[-1][0] != page.page_number:
                        detected_headers.append((page.page_number, matched_title))
                    break

    if len(detected_headers) >= 2:
        chapters: List[ChapterData] = []
        for idx, (start_p, title) in enumerate(detected_headers):
            end_p = total_pages
            if idx + 1 < len(detected_headers):
                end_p = max(start_p, detected_headers[idx + 1][0] - 1)
            chapters.append(ChapterData(
                id=f"{document_id}_chap_{idx + 1}",
                document_id=document_id,
                chapter_number=idx + 1,
                title=title,
                start_page=start_p,
                end_page=end_p,
                summary=""
            ))
        return chapters, {}

    # 4. Fallback Uniform Partitioning
    if total_pages <= 5:
        target_chapters = 1
    elif total_pages <= 15:
        target_chapters = 3
    elif total_pages <= 40:
        target_chapters = 4
    else:
        target_chapters = min(8, math.ceil(total_pages / 10))

    pages_per_chapter = max(1, math.ceil(total_pages / target_chapters))
    chapters = []
    
    for c_idx in range(target_chapters):
        start_p = (c_idx * pages_per_chapter) + 1
        if start_p > total_pages:
            break
        end_p = min(total_pages, (c_idx + 1) * pages_per_chapter)
        
        candidate_title = f"Chapter {c_idx + 1}"
        if start_p <= len(pages):
            first_lines = [l.strip() for l in pages[start_p - 1].clean_text.split('\n') if l.strip()]
            if first_lines and len(first_lines[0]) < 60 and not is_meta_or_frontmatter_title(first_lines[0]):
                candidate_title = f"Chapter {c_idx + 1}: {first_lines[0]}"
                
        chapters.append(ChapterData(
            id=f"{document_id}_chap_{c_idx + 1}",
            document_id=document_id,
            chapter_number=c_idx + 1,
            title=candidate_title,
            start_page=start_p,
            end_page=end_p,
            summary=""
        ))
        
    return chapters, {}
