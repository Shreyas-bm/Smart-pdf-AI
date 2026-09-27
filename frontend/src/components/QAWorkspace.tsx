import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ChapterData, QAResponse, api } from '../services/api';

interface QAWorkspaceProps {
  sessionId: string;
  chapters: ChapterData[];
  initialQuestion?: string;
}

export const QAWorkspace: React.FC<QAWorkspaceProps> = ({
  sessionId,
  chapters,
  initialQuestion = ''
}) => {
  const [scopeType, setScopeType] = useState<'document' | 'chapter' | 'topic'>('document');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapters[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [question, setQuestion] = useState(initialQuestion);
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAResponse[]>([]);
  const [expandedSnippets, setExpandedSnippets] = useState<{ [key: number]: boolean }>({});

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const currentTopics = currentChapter ? currentChapter.topics : [];

  const handleAsk = async (queryToAsk?: string) => {
    const q = queryToAsk || question;
    if (!q.trim() || isAsking) return;

    setIsAsking(true);
    try {
      let scopeId: string | undefined = undefined;
      if (scopeType === 'chapter') scopeId = selectedChapterId;
      else if (scopeType === 'topic') scopeId = selectedTopicId || currentTopics[0]?.id;

      const res = await api.askQuestion(sessionId, scopeType, scopeId, q.trim());
      setQaHistory((prev) => [res, ...prev]);
      if (!queryToAsk) setQuestion('');
    } catch (e: any) {
      alert('Error querying document: ' + e.message);
    } finally {
      setIsAsking(false);
    }
  };

  const toggleSnippet = (idx: number) => {
    setExpandedSnippets((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const samplePrompts = [
    "What are the core ideas and principles introduced in this document?",
    "Summarize the key architectural patterns mentioned.",
    "Explain the relationship between the primary concepts.",
    "What are the main advantages and challenges discussed?"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Scope Selector Header */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MessageSquare size={20} color="#818cf8" />
          <h2 style={{ fontSize: '1.75rem' }}>Grounded Document Q&A</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Answers are synthesized strictly from document text with explicit source page references.
        </p>

        {/* Scope Type Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {(['document', 'chapter', 'topic'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScopeType(s)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: scopeType === s ? 'var(--accent-primary)' : 'transparent',
                  color: scopeType === s ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {s === 'document' ? 'Entire Document' : s === 'chapter' ? 'Specific Chapter' : 'Specific Topic'}
              </button>
            ))}
          </div>

          {/* Chapter Dropdown */}
          {scopeType !== 'document' && (
            <select
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                const chap = chapters.find(c => c.id === e.target.value);
                if (chap && chap.topics.length > 0) {
                  setSelectedTopicId(chap.topics[0].id);
                }
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                maxWidth: '280px'
              }}
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Chapter {c.chapter_number}: {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Topic Dropdown */}
          {scopeType === 'topic' && currentTopics.length > 0 && (
            <select
              value={selectedTopicId || currentTopics[0]?.id}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                maxWidth: '280px'
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

        {/* Input Field */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder={
              scopeType === 'document'
                ? 'Ask a question across the entire document...'
                : scopeType === 'chapter'
                ? `Ask about Chapter ${currentChapter?.chapter_number || ''}...`
                : 'Ask about this specific topic...'
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleAsk()}
            disabled={isAsking || !question.trim()}
            className="btn btn-primary"
            style={{ padding: '0 24px', fontSize: '0.95rem' }}
          >
            {isAsking ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Send size={18} />}
            <span>Ask</span>
          </button>
        </div>

        {/* Prompt Suggestions */}
        {qaHistory.length === 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Suggested inquiries:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(p)}
                  className="badge badge-indigo interactive-card"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer', textAlign: 'left' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Q&A Chat Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {qaHistory.map((res, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', lineHeight: 1.3 }}>
                {res.question}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {res.grounded ? (
                  <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    <span>{Math.round(res.confidence * 100)}% Grounded</span>
                  </span>
                ) : (
                  <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    <span>Not in Scope</span>
                  </span>
                )}
                <span className="badge">
                  {res.scope_type.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Answer Body */}
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              {res.answer}
            </div>

            {/* Source Pages & Snippet Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Page Citations:</span>
                {res.sources.length > 0 ? (
                  res.sources.map((p) => (
                    <span key={p} className="badge badge-indigo" style={{ fontWeight: 600 }}>
                      Page {p}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>None</span>
                )}
              </div>

              {res.context_snippets && res.context_snippets.length > 0 && (
                <button
                  onClick={() => toggleSnippet(idx)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <span>{expandedSnippets[idx] ? 'Hide Excerpts' : 'View Source Excerpts'}</span>
                  {expandedSnippets[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>

            {/* Collapsible Source Excerpts */}
            {expandedSnippets[idx] && res.context_snippets && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Retrieved Document Snippets
                </span>
                {res.context_snippets.map((snip, sIdx) => (
                  <div key={sIdx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, fontStyle: 'italic' }}>
                    "...{snip}..."
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
