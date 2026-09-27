from __future__ import annotations
import re
import uuid
import random
from typing import List, Dict, Any, Tuple, Optional
from backend.app.models.schemas import (
    QuizPayload, QuizQuestion, QuizQuestionOption, ChunkData, ChapterData, TopicData
)
from backend.app.services.chunker import split_into_sentences

DEFINITION_PATTERNS = [
    re.compile(r'^(.*?)\s+(?:is defined as|refers to|is a type of|is a|is an|represents|consists of|can be defined as)\s+(.*)$', re.IGNORECASE),
    re.compile(r'^(.*?)\s+(?:is used to|enables|provides|serves as|functions as)\s+(.*)$', re.IGNORECASE)
]

def extract_candidate_concepts(chunks: List[ChunkData]) -> List[Tuple[str, str, int, Optional[str]]]:
    """
    Extracts tuples of (subject, predicate_or_definition, page_number, topic_id)
    from chunks.
    """
    candidates = []
    for chunk in chunks:
        sentences = split_into_sentences(chunk.text)
        for sent in sentences:
            sent_str = sent.strip()
            if len(sent_str) < 25 or len(sent_str) > 200:
                continue
            for pat in DEFINITION_PATTERNS:
                match = pat.match(sent_str)
                if match:
                    subject = match.group(1).strip()
                    definition = match.group(2).strip()
                    if 3 <= len(subject) <= 50 and len(definition) >= 15:
                        candidates.append((subject, definition, chunk.page_number, chunk.topic_id))
                        break
                        
    # Fallback to general declarative sentences if specific patterns are rare
    if len(candidates) < 5:
        for chunk in chunks:
            sentences = split_into_sentences(chunk.text)
            for sent in sentences:
                sent_str = sent.strip()
                if 40 <= len(sent_str) <= 180 and '.' in sent_str:
                    words = sent_str.split()
                    if len(words) >= 6:
                        subj = " ".join(words[:3])
                        pred = " ".join(words[3:])
                        candidates.append((subj, pred, chunk.page_number, chunk.topic_id))
    return candidates

def generate_mcq(
    concept: Tuple[str, str, int, Optional[str]],
    all_subjects: List[str],
    all_definitions: List[str],
    difficulty: str
) -> Tuple[QuizQuestion, str, str]:
    """
    Returns (QuizQuestion, correct_answer_id, explanation)
    """
    subject, definition, page_num, topic_id = concept
    q_id = str(uuid.uuid4())
    
    prompt = f"According to the document, which of the following best describes '{subject}'?"
    correct_text = definition.rstrip('.')
    if len(correct_text) > 120:
        correct_text = correct_text[:120] + "..."

    # Gather distractors
    distractor_pool = [d for d in all_definitions if d != definition and len(d) > 10]
    random.shuffle(distractor_pool)
    distractors = distractor_pool[:3]
    while len(distractors) < 3:
        distractors.append(f"It is an unrelated auxiliary component not discussed in this context.")

    options_data = [
        {"text": correct_text, "is_correct": True}
    ]
    for d in distractors:
        d_text = d.rstrip('.')
        if len(d_text) > 120:
            d_text = d_text[:120] + "..."
        options_data.append({"text": d_text, "is_correct": False})

    random.shuffle(options_data)
    
    formatted_options: List[QuizQuestionOption] = []
    correct_opt_id = "A"
    labels = ["A", "B", "C", "D"]
    
    for idx, opt in enumerate(options_data):
        lbl = labels[idx]
        formatted_options.append(QuizQuestionOption(id=lbl, text=opt["text"]))
        if opt["is_correct"]:
            correct_opt_id = lbl

    explanation = f"Page {page_num} states that '{subject}' {definition.rstrip('.')}."
    
    question = QuizQuestion(
        id=q_id,
        question_type="mcq",
        prompt=prompt,
        options=formatted_options,
        source_page=page_num,
        topic_id=topic_id,
        difficulty=difficulty # type: ignore
    )
    return question, correct_opt_id, explanation

def generate_true_false(
    concept: Tuple[str, str, int, Optional[str]],
    all_concepts: List[Tuple[str, str, int, Optional[str]]],
    difficulty: str
) -> Tuple[QuizQuestion, str, str]:
    """
    Returns (QuizQuestion, 'True'|'False', explanation)
    """
    subject, definition, page_num, topic_id = concept
    q_id = str(uuid.uuid4())
    
    is_true = random.choice([True, False])
    
    if is_true:
        statement = f"In the document, {subject} is associated with: {definition.rstrip('.')}."
        correct_answer = "True"
        explanation = f"True. This is directly stated on Page {page_num}."
    else:
        # Create false statement by altering predicate with another concept
        other_candidates = [c for c in all_concepts if c[0] != subject]
        if other_candidates:
            other_subj, other_def, _, _ = random.choice(other_candidates)
            statement = f"In the document, {subject} is primarily defined as {other_def.rstrip('.')}."
        else:
            statement = f"In the document, {subject} is strictly prohibited from interacting with any learning components."
        correct_answer = "False"
        explanation = f"False. Page {page_num} clarifies that {subject} refers to {definition.rstrip('.')}."

    question = QuizQuestion(
        id=q_id,
        question_type="true_false",
        prompt=f"True or False: {statement}",
        options=[
            QuizQuestionOption(id="True", text="True"),
            QuizQuestionOption(id="False", text="False")
        ],
        source_page=page_num,
        topic_id=topic_id,
        difficulty=difficulty # type: ignore
    )
    return question, correct_answer, explanation

def generate_short_answer(
    concept: Tuple[str, str, int, Optional[str]],
    difficulty: str
) -> Tuple[QuizQuestion, str, str]:
    """
    Returns (QuizQuestion, correct_subject_answer, explanation)
    """
    subject, definition, page_num, topic_id = concept
    q_id = str(uuid.uuid4())
    
    prompt = f"What key term or concept is described as: '{definition.rstrip('.')}'?"
    correct_answer = subject.strip()
    explanation = f"The correct concept is '{subject}' (referenced on Page {page_num})."
    
    question = QuizQuestion(
        id=q_id,
        question_type="short_answer",
        prompt=prompt,
        options=None,
        source_page=page_num,
        topic_id=topic_id,
        difficulty=difficulty # type: ignore
    )
    return question, correct_answer, explanation

def assemble_quiz(
    chunks: List[ChunkData],
    scope_type: str = "document",
    scope_id: Optional[str] = None,
    scope_title: str = "Document Overview",
    num_questions: int = 5,
    difficulty: str = "medium",
    question_types: Optional[List[str]] = None
) -> Tuple[QuizPayload, Dict[str, Dict[str, Any]]]:
    """
    Assembles a quiz with balanced question types and builds a server-side answer key.
    Returns (QuizPayload, answer_key_dict).
    """
    if question_types is None:
        question_types = ["mcq", "true_false", "short_answer"]
        
    # Filter chunks by scope
    scoped_chunks = chunks
    if scope_type == "chapter" and scope_id:
        scoped_chunks = [c for c in chunks if c.chapter_id == scope_id]
    elif scope_type == "topic" and scope_id:
        scoped_chunks = [c for c in chunks if c.topic_id == scope_id]
        
    if not scoped_chunks:
        scoped_chunks = chunks

    candidates = extract_candidate_concepts(scoped_chunks)
    if not candidates:
        candidates = [("Document Content", "the fundamental subject matter presented across pages", 1, None)]

    all_subjects = [c[0] for c in candidates]
    all_definitions = [c[1] for c in candidates]
    
    random.shuffle(candidates)
    
    questions: List[QuizQuestion] = []
    answer_keys: Dict[str, Dict[str, Any]] = {}
    quiz_id = f"quiz_{uuid.uuid4().hex[:10]}"
    
    selected_candidates = candidates[:max(num_questions, len(candidates))]
    cand_idx = 0
    
    for i in range(num_questions):
        concept = selected_candidates[cand_idx % len(selected_candidates)]
        cand_idx += 1
        
        q_type = question_types[i % len(question_types)]
        
        if q_type == "mcq":
            q_obj, ans, expl = generate_mcq(concept, all_subjects, all_definitions, difficulty)
        elif q_type == "true_false":
            q_obj, ans, expl = generate_true_false(concept, candidates, difficulty)
        else:
            q_obj, ans, expl = generate_short_answer(concept, difficulty)
            
        questions.append(q_obj)
        answer_keys[q_obj.id] = {
            "correct_answer": ans,
            "explanation": expl,
            "source_page": q_obj.source_page,
            "topic_id": q_obj.topic_id,
            "prompt": q_obj.prompt,
            "question_type": q_obj.question_type
        }

    quiz_payload = QuizPayload(
        quiz_id=quiz_id,
        scope_type=scope_type, # type: ignore
        scope_id=scope_id,
        scope_title=scope_title,
        difficulty=difficulty,
        question_count=len(questions),
        questions=questions
    )
    
    return quiz_payload, answer_keys
