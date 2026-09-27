import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Bookmark,
  Award,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  FileText,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { ChapterDetailResponse, QAResponse, api } from '../services/api';

interface ChapterLearningViewProps {
  sessionId: string;
  chapterDetail: ChapterDetailResponse;
  allChapters: { id: string; title: string; chapter_number: number }[];
  onSelectChapter: (chapterId: string) => void;
  onSelectTopic: (topicId: string) => void;
  onStartChapterQuiz: (chapterId: string, chapterTitle: string) => void;
}

export const ChapterLearningView: React.FC<ChapterLearningViewProps> = ({
  sessionId,
  chapterDetail,
  allChapters,
  onSelectChapter,
  onSelectTopic,
  onStartChapterQuiz,
}) => {
  const { chapter, topics, key_concepts, pages } = chapterDetail;
  const [qaInput, setQaInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAResponse[]>([]);

  // Find previous and next chapters
  const currentIdx = allChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

  const handleAsk = async (questionToAsk?: string) => {
    const q = questionToAsk || qaInput;
    if (!q.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const res = await api.askQuestion(sessionId, 'chapter', chapter.id, q.trim());
      setQaHistory((prev) => [res, ...prev]);
      if (!questionToAsk) setQaInput('');
    } catch (e: any) {
      alert('Failed to answer question: ' + e.message);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Chapter Nav & Title Header */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">
              Chapter {chapter.chapter_number} Learning Mode
            </span>
            <span className="badge">Pages {chapter.start_page}–{chapter.end_page}</span>
          </div>

          <button
            onClick={() => onStartChapterQuiz(chapter.id, chapter.title)}
            className="btn btn-primary btn-sm"
          >
            <Award size={15} />
            <span>Generate Chapter Quiz</span>
          </button>
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '14px', lineHeight: 1.2 }}>
          {chapter.title}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '900px' }}>
          {chapter.summary || "Extracted summary for this chapter."}
        </p>

        {/* Previous / Next Chapter Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          {prevChapter ? (
            <button
              onClick={() => onSelectChapter(prevChapter.id)}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} />
              <span>Prev: Chapter {prevChapter.chapter_number}</span>
            </button>
          ) : <div />}

          {nextChapter && (
            <button
              onClick={() => onSelectChapter(nextChapter.id)}
              className="btn btn-secondary btn-sm"
            >
              <span>Next: Chapter {nextChapter.chapter_number}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Topics on Left, Key Concepts on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Topics Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Bookmark size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.15rem' }}>Subtopics in this Chapter</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topics.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => onSelectTopic(t.id)}
                className="interactive-card"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Pages {t.start_page}–{t.end_page} • {t.key_concepts.length} key concepts
                  </div>
                </div>

                <button className="btn btn-outline btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  Learn Topic
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Key Concepts & Source Pages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {key_concepts && key_concepts.length > 0 && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} color="#06b6d4" />
                <h3 style={{ fontSize: '1.15rem' }}>Important Concepts</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {key_concepts.map((concept, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(`What is ${concept} in this chapter?`)}
                    className="badge badge-indigo interactive-card"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer' }}
                    title="Click to ask about this concept"
                  >
                    {concept}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileText size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.15rem' }}>Source Pages</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              This chapter spans pages {chapter.start_page} through {chapter.end_page}.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {pages.map((p) => (
                <span key={p} className="badge" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Page {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Chapter Q&A Box */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MessageSquare size={20} color="#818cf8" />
          <h3 style={{ fontSize: '1.25rem' }}>Ask About Chapter {chapter.chapter_number}</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Questions are strictly scoped to the contents of {chapter.title}.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder={`Ask anything about Chapter ${chapter.chapter_number}...`}
            value={qaInput}
            onChange={(e) => setQaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleAsk()}
            disabled={isAsking || !qaInput.trim()}
            className="btn btn-primary"
            style={{ minWidth: '100px' }}
          >
            {isAsking ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Send size={16} />}
            <span>Ask</span>
          </button>
        </div>

        {/* Q&A Stream in Chapter Mode */}
        {qaHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {qaHistory.map((res, idx) => (
              <div
                key={idx}
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#818cf8', marginBottom: '8px' }}>
                  Q: {res.question}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '12px' }}>
                  {res.answer}
                </div>
                {res.sources && res.sources.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sources:</span>
                    {res.sources.map((p) => (
                      <span key={p} className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                        Page {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
