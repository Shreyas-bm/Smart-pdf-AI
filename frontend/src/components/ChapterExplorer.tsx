import React, { useState } from 'react';
import { Layers, BookOpen, Bookmark, ArrowRight, Search, Sparkles, Award, MessageSquare } from 'lucide-react';
import { ChapterData } from '../services/api';

interface ChapterExplorerProps {
  chapters: ChapterData[];
  onSelectChapter: (chapterId: string) => void;
  onStartChapterQuiz: (chapterId: string, chapterTitle: string) => void;
  onAskChapterQA: (chapterId: string, chapterTitle: string) => void;
}

export const ChapterExplorer: React.FC<ChapterExplorerProps> = ({
  chapters,
  onSelectChapter,
  onStartChapterQuiz,
  onAskChapterQA
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = chapters.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.topics.some(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Chapter Explorer</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Structured chapter hierarchy detected from the document outline and page layout.
          </p>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search chapters or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast)'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>
      </div>

      {/* Chapters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
        {filteredChapters.map((chap) => {
          const formattedNum = chap.chapter_number < 10 ? `0${chap.chapter_number}` : `${chap.chapter_number}`;
          return (
            <div
              key={chap.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{
                    fontFamily: 'Outfit',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#818cf8',
                    letterSpacing: '-0.02em'
                  }}>
                    {formattedNum}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge">Pages {chap.start_page}–{chap.end_page}</span>
                    <span className="badge badge-indigo">{chap.topics.length} Topics</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', lineHeight: 1.3 }}>
                  {chap.title}
                </h3>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {chap.summary || "Summary generated from chapter page contents."}
                </p>

                {/* Subtopic pills */}
                {chap.topics && chap.topics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {chap.topics.slice(0, 3).map((t) => (
                      <span key={t.id} style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {t.title}
                      </span>
                    ))}
                    {chap.topics.length > 3 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', alignSelf: 'center' }}>
                        +{chap.topics.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                gap: '8px'
              }}>
                <button
                  onClick={() => onSelectChapter(chap.id)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <BookOpen size={14} />
                  <span>Learn Chapter</span>
                </button>

                <button
                  onClick={() => onAskChapterQA(chap.id, chap.title)}
                  className="btn btn-secondary btn-sm"
                  title="Ask questions strictly about this chapter"
                >
                  <MessageSquare size={14} />
                </button>

                <button
                  onClick={() => onStartChapterQuiz(chap.id, chap.title)}
                  className="btn btn-secondary btn-sm"
                  title="Generate Chapter Quiz"
                >
                  <Award size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChapters.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No chapters found matching "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
};
