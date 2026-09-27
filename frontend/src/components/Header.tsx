import React from 'react';
import { BookOpen, RefreshCw, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { DocumentMetadata } from '../services/api';

interface HeaderProps {
  document: DocumentMetadata | null;
  onResetSession: () => void;
  onGlobalSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ document, onResetSession }) => {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <BookOpen size={20} color="#ffffff" />
        </div>
        <div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            AI PDF <span className="gradient-text">Learning Assistant</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {document && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem'
          }}>
            <FileText size={15} color="#818cf8" />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {document.title}.pdf
            </span>
            <span className="badge badge-indigo">{document.page_count} Pages</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>Temporary Session</span>
        </div>

        {document && (
          <button
            onClick={onResetSession}
            className="btn btn-outline btn-sm"
            title="Upload new document and reset workspace"
          >
            <RefreshCw size={14} />
            <span>New Document</span>
          </button>
        )}
      </div>
    </header>
  );
};
