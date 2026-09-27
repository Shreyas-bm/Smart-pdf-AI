import React, { useState } from 'react';
import { Bookmark, Layers, Search, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { ChapterData, TopicData } from '../services/api';

interface TopicExplorerProps {
  chapters: ChapterData[];
  onSelectTopic: (topicId: string) => void;
  onSelectChapter: (chapterId: string) => void;
}

export const TopicExplorer: React.FC<TopicExplorerProps> = ({
  chapters,
  onSelectTopic,
  onSelectChapter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const allTopics: { topic: TopicData; chapter: ChapterData }[] = [];
  chapters.forEach((chap) => {
    chap.topics.forEach((top) => {
      allTopics.push({ topic: top, chapter: chap });
    });
  });

  const filtered = allTopics.filter(
    ({ topic, chapter }) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.key_concepts.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Topics Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Explore granular concepts and jump directly into focused learning modules.
          </p>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search topics or concepts..."
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
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Topics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filtered.map(({ topic, chapter }) => (
          <div
            key={topic.id}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '22px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span
                  onClick={() => onSelectChapter(chapter.id)}
                  style={{
                    fontSize: '0.75rem',
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Chapter {chapter.chapter_number}: {chapter.title}
                </span>
                <span className="badge">Pages {topic.start_page}–{topic.end_page}</span>
              </div>

              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', lineHeight: 1.3 }}>
                {topic.title}
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
                {topic.summary || "Summary of this subtopic concept."}
              </p>

              {topic.key_concepts && topic.key_concepts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {topic.key_concepts.map((kc, i) => (
                    <span key={i} className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                      {kc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectTopic(topic.id)}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Bookmark size={14} />
              <span>Learn This Topic</span>
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No topics found matching "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
};
