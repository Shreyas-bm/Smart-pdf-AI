import React, { useState } from 'react';
import {
  Bookmark,
  Layers,
  Award,
  MessageSquare,
  Sparkles,
  FileText,
  Send,
  Loader2,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { TopicDetailResponse, QAResponse, api } from '../services/api';

interface LearnTopicViewProps {
  sessionId: string;
  topicDetail: TopicDetailResponse;
  onBackToChapter: (chapterId: string) => void;
  onStartTopicQuiz: (topicId: string, topicTitle: string) => void;
}

export const LearnTopicView: React.FC<LearnTopicViewProps> = ({
  sessionId,
  topicDetail,
  onBackToChapter,
  onStartTopicQuiz,
}) => {
  const { topic, chapter_title, explanation, key_concepts, source_pages, sample_questions } = topicDetail;
  const [qaInput, setQaInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAResponse[]>([]);

  const handleAsk = async (customQ?: string) => {
    const q = customQ || qaInput;
    if (!q.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const res = await api.askQuestion(sessionId, 'topic', topic.id, q.trim());
      setQaHistory((prev) => [res, ...prev]);
      if (!customQ) setQaInput('');
    } catch (e: any) {
      alert('Failed to answer question: ' + e.message);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => onBackToChapter(topic.chapter_id)}
            className="btn btn-outline btn-sm"
          >
            <ArrowLeft size={14} />
            <span>Back to {chapter_title}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-indigo">Topic Focus</span>
            <span className="badge">Pages {topic.start_page}–{topic.end_page}</span>
          </div>

          <button
            onClick={() => onStartTopicQuiz(topic.id, topic.title)}
            className="btn btn-primary btn-sm"
          >
            <Award size={15} />
            <span>Generate Topic Quiz</span>
          </button>
        </div>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '16px', lineHeight: 1.2 }}>
          {topic.title}
        </h1>

        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.7,
          fontSize: '1rem',
          color: 'var(--text-primary)',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Document Grounded Explanation
          </h4>
          <p style={{ whiteSpace: 'pre-line' }}>{explanation}</p>
        </div>

        {/* Key Concepts and Sources Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {key_concepts && key_concepts.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Sparkles size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Key Concepts</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {key_concepts.map((kc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(`Explain ${kc} in the context of ${topic.title}`)}
                    className="badge badge-indigo interactive-card"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer' }}
                  >
                    {kc}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <FileText size={16} color="#10b981" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Referenced Pages</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {source_pages.map((p) => (
                <span key={p} className="badge badge-emerald" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  Page {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Topic Questions */}
      {sample_questions && sample_questions.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <HelpCircle size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.1rem' }}>Test Your Understanding with Prompt Starters</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {sample_questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(q)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic Q&A Box */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MessageSquare size={20} color="#818cf8" />
          <h3 style={{ fontSize: '1.25rem' }}>Ask About {topic.title}</h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder={`Ask a specific question about ${topic.title}...`}
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

        {qaHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
