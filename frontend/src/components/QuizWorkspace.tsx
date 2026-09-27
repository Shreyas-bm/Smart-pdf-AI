import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  FileText,
  Bookmark,
  HelpCircle,
  CheckSquare
} from 'lucide-react';
import { ChapterData, QuizPayload, QuizResultResponse, api } from '../services/api';

interface QuizWorkspaceProps {
  sessionId: string;
  chapters: ChapterData[];
  initialScopeType?: 'document' | 'chapter' | 'topic';
  initialScopeId?: string;
  onReviewTopic?: (topicId: string) => void;
}

export const QuizWorkspace: React.FC<QuizWorkspaceProps> = ({
  sessionId,
  chapters,
  initialScopeType = 'document',
  initialScopeId,
  onReviewTopic,
}) => {
  // Wizard State: 'config' | 'attempt' | 'results'
  const [viewState, setViewState] = useState<'config' | 'attempt' | 'results'>('config');

  // Config Form
  const [scopeType, setScopeType] = useState<'document' | 'chapter' | 'topic'>(initialScopeType);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialScopeType === 'chapter' && initialScopeId ? initialScopeId : chapters[0]?.id || ''
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    initialScopeType === 'topic' && initialScopeId ? initialScopeId : ''
  );
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'true_false', 'short_answer']);

  // Active Quiz State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizPayload | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: string }>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResultResponse | null>(null);

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const currentTopics = currentChapter ? currentChapter.topics : [];

  const handleToggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    try {
      let scopeId: string | undefined = undefined;
      if (scopeType === 'chapter') scopeId = selectedChapterId;
      else if (scopeType === 'topic') scopeId = selectedTopicId || currentTopics[0]?.id;

      const payload = await api.generateQuiz(
        sessionId,
        scopeType,
        scopeId,
        numQuestions,
        difficulty,
        selectedTypes
      );

      setActiveQuiz(payload);
      setUserAnswers({});
      setCurrentQuestionIdx(0);
      setViewState('attempt');
    } catch (e: any) {
      alert('Failed to generate quiz: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, value: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitting(true);
    try {
      const answersList = activeQuiz.questions.map((q) => ({
        question_id: q.id,
        user_answer: userAnswers[q.id] || '',
      }));

      const results = await api.submitQuiz(sessionId, activeQuiz.quiz_id, answersList);
      setQuizResults(results);
      setViewState('results');
    } catch (e: any) {
      alert('Failed to evaluate quiz: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 1. CONFIG VIEW ---
  if (viewState === 'config') {
    return (
      <div className="glass-card" style={{ maxWidth: '780px', margin: '0 auto', padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Award size={24} color="#ec4899" />
          <h2 style={{ fontSize: '1.75rem' }}>Generate Practice Quiz</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px' }}>
          Test your document mastery with grounded questions and detailed explanations.
        </p>

        {/* Scope Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            1. Quiz Scope
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            {(['document', 'chapter', 'topic'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScopeType(s)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: scopeType === s ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                  background: scopeType === s ? 'var(--bg-glass-active)' : 'var(--bg-tertiary)',
                  color: scopeType === s ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {s === 'document' ? 'Entire Document' : s === 'chapter' ? 'Specific Chapter' : 'Specific Topic'}
              </button>
            ))}
          </div>

          {scopeType !== 'document' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={selectedChapterId}
                onChange={(e) => {
                  setSelectedChapterId(e.target.value);
                  const chap = chapters.find((c) => c.id === e.target.value);
                  if (chap && chap.topics.length > 0) setSelectedTopicId(chap.topics[0].id);
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chapter {c.chapter_number}: {c.title}
                  </option>
                ))}
              </select>

              {scopeType === 'topic' && currentTopics.length > 0 && (
                <select
                  value={selectedTopicId || currentTopics[0]?.id}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {currentTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Number of Questions */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            2. Question Count
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[3, 5, 10, 15].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumQuestions(n)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: numQuestions === n ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                  background: numQuestions === n ? 'var(--bg-glass-active)' : 'var(--bg-tertiary)',
                  color: numQuestions === n ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {n} Questions
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            3. Difficulty Level
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  border: difficulty === d ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                  background: difficulty === d ? 'var(--bg-glass-active)' : 'var(--bg-tertiary)',
                  color: difficulty === d ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            4. Included Question Types
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { id: 'mcq', label: 'Multiple Choice (MCQ)' },
              { id: 'true_false', label: 'True / False' },
              { id: 'short_answer', label: 'Short Answer' },
            ].map((type) => {
              const isChecked = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleToggleType(type.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: isChecked ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                    color: isChecked ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <CheckSquare size={14} color={isChecked ? '#10b981' : 'var(--text-muted)'} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateQuiz}
          disabled={isGenerating}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
              <span>Generating Quiz from Document...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate Quiz</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // --- 2. ATTEMPT VIEW ---
  if (viewState === 'attempt' && activeQuiz) {
    const currentQ = activeQuiz.questions[currentQuestionIdx];
    const totalQ = activeQuiz.questions.length;
    const isAnswered = !!userAnswers[currentQ.id];
    const answeredCount = Object.keys(userAnswers).length;

    return (
      <div className="glass-card" style={{ maxWidth: '820px', margin: '0 auto', padding: '36px' }}>
        {/* Progress & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>
              {activeQuiz.scope_title}
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Question {currentQuestionIdx + 1} of {totalQ}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="badge" style={{ textTransform: 'capitalize' }}>
              {currentQ.question_type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '6px', width: '100%', background: 'var(--bg-tertiary)', borderRadius: '9999px', marginBottom: '28px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((currentQuestionIdx + 1) / totalQ) * 100}%`,
            background: 'var(--accent-gradient)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Question Prompt */}
        <h3 style={{ fontSize: '1.35rem', lineHeight: 1.4, marginBottom: '24px', color: 'var(--text-primary)' }}>
          {currentQ.prompt}
        </h3>

        {/* Options / Input Area */}
        <div style={{ marginBottom: '32px' }}>
          {currentQ.options && currentQ.options.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map((opt) => {
                const isSelected = userAnswers[currentQ.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--bg-glass-active)' : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                      border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {opt.id}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Type your answer here..."
                value={userAnswers[currentQ.id] || ''}
                onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIdx === 0}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={14} />
            <span>Previous</span>
          </button>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {answeredCount} / {totalQ} Answered
          </div>

          {currentQuestionIdx < totalQ - 1 ? (
            <button
              onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
              className="btn btn-primary btn-sm"
            >
              <span>Next Question</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ background: '#10b981', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
            >
              {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={16} />}
              <span>Submit Assessment</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- 3. RESULTS VIEW ---
  if (viewState === 'results' && quizResults) {
    const isPassing = quizResults.score_percentage >= 70;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '880px', margin: '0 auto' }}>
        {/* Score Card Banner */}
        <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isPassing ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: isPassing ? '2px solid #10b981' : '2px solid #f59e0b',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <Award size={40} color={isPassing ? '#10b981' : '#f59e0b'} />
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '6px' }}>
            Score: {quizResults.score_percentage}%
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '20px' }}>
            You answered {quizResults.correct_count} out of {quizResults.total_questions} questions correctly.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                setViewState('config');
                setQuizResults(null);
              }}
              className="btn btn-primary btn-sm"
            >
              <RotateCcw size={14} />
              <span>Take Another Quiz</span>
            </button>
          </div>
        </div>

        {/* Recommended Revision Topics */}
        {quizResults.weak_topics && quizResults.weak_topics.length > 0 && (
          <div className="glass-card" style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Bookmark size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.1rem', color: '#fbbf24' }}>Recommended Revision Topics</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Based on your answers, reviewing these concepts will strengthen your understanding:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {quizResults.weak_topics.map((t, idx) => (
                <span key={idx} className="badge badge-amber" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Item-by-Item Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', marginTop: '8px' }}>Detailed Question Breakdown</h3>
          {quizResults.results.map((item, idx) => (
            <div key={item.question_id} className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {idx + 1}. {item.prompt}
                </div>
                <div>
                  {item.is_correct ? (
                    <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Correct</span>
                    </span>
                  ) : (
                    <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <XCircle size={12} />
                      <span>Incorrect</span>
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px', fontSize: '0.85rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Your Answer:</span>
                  <span style={{ color: item.is_correct ? '#34d399' : '#fb7185', fontWeight: 600 }}>{item.user_answer}</span>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Correct Answer:</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{item.correct_answer}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
                <strong>Explanation:</strong> {item.explanation}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <span className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>
                  Source: Page {item.source_page}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
