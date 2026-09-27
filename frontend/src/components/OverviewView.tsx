import React from 'react';
import {
  FileText,
  Layers,
  Bookmark,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Award,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { DocumentOverviewResponse, ChapterData } from '../services/api';
import { NavTab } from './Sidebar';

interface OverviewViewProps {
  overview: DocumentOverviewResponse;
  onNavigate: (tab: NavTab) => void;
  onSelectChapter: (chapterId: string) => void;
  onAskQuestion: (question: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  overview,
  onNavigate,
  onSelectChapter,
  onAskQuestion
}) => {
  const { document, chapters, sample_questions } = overview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner / Stats Header */}
      <div className="glass-card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="badge badge-indigo">Document Ready</span>
          <span className="badge">{document.page_count} Total Pages</span>
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '12px', lineHeight: 1.2 }}>
          {document.title}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '900px', marginBottom: '24px' }}>
          {document.summary || "Document parsed and indexed across all pages. Select any chapter or topic to begin your personalized revision session."}
        </p>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Pages</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{document.page_count}</div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Detected Chapters</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#818cf8' }}>{document.chapters_count || chapters.length}</div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Identified Topics</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>{document.topics_count || chapters.reduce((acc, c) => acc + c.topics.length, 0)}</div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Privacy State</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              Memory-Only
            </div>
          </div>
        </div>
      </div>

      {/* Key Concepts / Topic Badges */}
      {document.key_topics && document.key_topics.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.1rem' }}>Core Document Themes & Keywords</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {document.key_topics.map((t, idx) => (
              <button
                key={idx}
                onClick={() => onAskQuestion(`Explain the concept of ${t}`)}
                className="badge badge-indigo interactive-card"
                style={{ fontSize: '0.85rem', padding: '6px 14px', cursor: 'pointer' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Navigation Cards */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Interactive Learning Modes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div
            className="glass-card interactive-card"
            onClick={() => onNavigate('chapters')}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Layers size={22} color="#818cf8" />
              </div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Chapter Explorer</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Browse chapter summaries, page boundaries, and enter dedicated deep learning mode.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Open Chapters</span>
              <ArrowRight size={16} />
            </div>
          </div>

          <div
            className="glass-card interactive-card"
            onClick={() => onNavigate('qa')}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <MessageSquare size={22} color="#06b6d4" />
              </div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Grounded Q&A</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Ask questions across the entire document or specific scopes with traceable page citations.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Ask Questions</span>
              <ArrowRight size={16} />
            </div>
          </div>

          <div
            className="glass-card interactive-card"
            onClick={() => onNavigate('quiz')}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Award size={22} color="#ec4899" />
              </div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Assessment Quiz</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                Test your understanding with customizable MCQs, True/False, and short answer challenges.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ec4899', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Start Quiz</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      {sample_questions && sample_questions.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <HelpCircle size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1.1rem' }}>Suggested Questions to Ask</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {sample_questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onAskQuestion(q)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-focus)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-glass-active)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
                }}
              >
                <span>"{q}"</span>
                <ArrowRight size={14} color="#818cf8" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
