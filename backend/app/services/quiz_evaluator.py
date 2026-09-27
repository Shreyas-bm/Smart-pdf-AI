from __future__ import annotations
import re
from typing import List, Dict, Any, Optional
from backend.app.models.schemas import (
    QuizAnswerSubmission, QuestionEvaluationResult, QuizResultResponse, TopicData
)

def evaluate_quiz_submission(
    quiz_id: str,
    scope_type: str,
    scope_title: str,
    submissions: List[QuizAnswerSubmission],
    answer_keys: Dict[str, Dict[str, Any]],
    topics_map: Optional[Dict[str, TopicData]] = None
) -> QuizResultResponse:
    """
    Evaluates submitted user answers, computes scores, extracts weak topics,
    and returns comprehensive feedback with explanations and revision references.
    """
    results: List[QuestionEvaluationResult] = []
    correct_count = 0
    weak_topic_ids = set()
    revision_pages = set()
    
    submission_map = {s.question_id: s.user_answer.strip() for s in submissions}
    
    for q_id, key_info in answer_keys.items():
        user_ans = submission_map.get(q_id, "").strip()
        correct_ans = str(key_info["correct_answer"]).strip()
        q_type = key_info.get("question_type", "mcq")
        source_page = key_info.get("source_page", 1)
        topic_id = key_info.get("topic_id")
        
        is_correct = False
        
        if q_type in ("mcq", "true_false"):
            is_correct = (user_ans.lower() == correct_ans.lower())
        else:
            # Short answer evaluation (fuzzy / word overlap)
            u_norm = re.sub(r'[^a-zA-Z0-9\s]', '', user_ans.lower())
            c_norm = re.sub(r'[^a-zA-Z0-9\s]', '', correct_ans.lower())
            
            if u_norm == c_norm or c_norm in u_norm or (len(u_norm) > 3 and u_norm in c_norm):
                is_correct = True
            else:
                u_words = set(u_norm.split())
                c_words = set(c_norm.split())
                overlap = len(u_words.intersection(c_words))
                if len(c_words) > 0 and (overlap / len(c_words)) >= 0.5:
                    is_correct = True

        if is_correct:
            correct_count += 1
        else:
            if topic_id:
                weak_topic_ids.add(topic_id)
            revision_pages.add(source_page)

        topic_title = None
        if topics_map and topic_id and topic_id in topics_map:
            topic_title = topics_map[topic_id].title

        results.append(QuestionEvaluationResult(
            question_id=q_id,
            prompt=key_info.get("prompt", ""),
            question_type=q_type,
            user_answer=user_ans if user_ans else "(No Answer)",
            correct_answer=correct_ans,
            is_correct=is_correct,
            explanation=key_info.get("explanation", ""),
            source_page=source_page,
            topic_title=topic_title
        ))

    total_q = len(answer_keys)
    score_pct = round((correct_count / total_q * 100.0) if total_q > 0 else 0.0, 1)

    weak_topic_names = []
    if topics_map:
        for tid in weak_topic_ids:
            if tid in topics_map:
                weak_topic_names.append(topics_map[tid].title)
    if not weak_topic_names and weak_topic_ids:
        weak_topic_names = list(weak_topic_ids)

    return QuizResultResponse(
        quiz_id=quiz_id,
        scope_type=scope_type,
        scope_title=scope_title,
        total_questions=total_q,
        correct_count=correct_count,
        score_percentage=score_pct,
        results=results,
        weak_topics=weak_topic_names,
        suggested_revision_pages=sorted(list(revision_pages))
    )
