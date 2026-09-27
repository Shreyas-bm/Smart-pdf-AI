import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  Zap,
  BookOpen,
  HelpCircle,
  Award,
  AlertCircle
} from 'lucide-react';

interface UploadScreenProps {
  onFileSelected: (file: File, ocrMode: string) => void;
  isUploading: boolean;
  error?: string | null;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onFileSelected,
  isUploading,
  error
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [ocrMode, setOcrMode] = useState<'auto' | 'force' | 'skip'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSubmit(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSubmit(file);
    }
  };

  const validateAndSubmit = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file (.pdf)');
      return;
    }
    onFileSelected(file, ocrMode);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '30px auto', padding: '0 20px' }}>
      {/* Hero Title */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'var(--bg-glass-active)',
          border: '1px solid var(--border-glow)',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#818cf8',
          marginBottom: '16px'
        }}>
          <Zap size={14} />
          <span>Local Document Learning Workspace</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', lineHeight: 1.2, marginBottom: '12px' }}>
          Master Any PDF with <span className="gradient-text">Document Intelligence</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Upload textbooks, lecture notes, or scanned documents. Explore chapters, ask grounded questions, and test yourself with AI quizzes.
        </p>
      </div>

      {/* Upload Drop Zone Card */}
      <div
        className="glass-card"
        style={{
          border: isDragOver ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-medium)',
          background: isDragOver ? 'var(--bg-glass-active)' : 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          marginBottom: '32px',
          boxShadow: isDragOver ? 'var(--shadow-glow)' : 'var(--shadow-lg)'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          style={{ display: 'none' }}
        />

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid var(--border-glow)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <UploadCloud size={36} color="#818cf8" />
        </div>

        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
          Click to upload or drag & drop your PDF here
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Supports typed textbooks, handwritten notes, and scanned papers (up to 50MB)
        </p>

        <button className="btn btn-primary" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          <FileText size={16} />
          <span>Select PDF File</span>
        </button>
      </div>

      {/* OCR Options */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>OCR Recognition Mode</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configure how scanned and handwritten pages are processed</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['auto', 'force', 'skip'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setOcrMode(mode)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: ocrMode === mode ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                background: ocrMode === mode ? 'var(--bg-glass-active)' : 'var(--bg-tertiary)',
                color: ocrMode === mode ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)'
              }}
            >
              {mode === 'auto' ? 'Auto OCR (Recommended)' : mode === 'force' ? 'Force All OCR' : 'Skip OCR'}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <BookOpen size={18} color="#818cf8" />
          </div>
          <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Chapter & Topic Explorer</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Instantly structures raw PDFs into clean chapters and digestible topic study modules.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <HelpCircle size={18} color="#06b6d4" />
          </div>
          <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Multi-Scoped Q&A</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Query entire document, specific chapters, or topics with verified page citations.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Award size={18} color="#ec4899" />
          </div>
          <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Self-Assessment Quizzes</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Generate MCQs, True/False, and short answer tests with weakness identification.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Zero Cloud Retention</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Documents exist exclusively in temporary memory and are deleted after your session.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '24px',
          padding: '14px 18px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
