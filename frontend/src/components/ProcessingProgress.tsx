import React from 'react';
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { DocumentMetadata } from '../services/api';

interface ProcessingProgressProps {
  metadata: DocumentMetadata | null;
  error?: string | null;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ metadata, error }) => {
  const progress = metadata?.processing_progress || 10;
  const status = metadata?.processing_status || 'extracting';
  const message = metadata?.status_message || 'Initializing extraction...';

  const steps = [
    { key: 'extracting', label: 'Text & Layout Extraction', desc: 'Parsing embedded fonts, bounding boxes, and native pages' },
    { key: 'ocr', label: 'OCR & Image Enhancement', desc: 'Scanning handwritten and low-density pages with adaptive binarization' },
    { key: 'structuring', label: 'Document Structure & Chapters', desc: 'Detecting chapter boundaries, topics, and key concepts' },
    { key: 'indexing', label: 'Semantic Index & Summarization', desc: 'Building vector TF-IDF retrieval index and section summaries' },
  ];

  const getStepStatus = (stepIndex: number) => {
    const currentIdx = status === 'extracting' ? 0 : status === 'ocr' ? 1 : status === 'structuring' ? 2 : status === 'indexing' ? 3 : 4;
    if (currentIdx > stepIndex) return 'completed';
    if (currentIdx === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="glass-card" style={{ maxWidth: '640px', width: '100%', margin: '40px auto', padding: '36px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--accent-gradient)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Sparkles size={28} color="#ffffff" />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Processing Your Document</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {message}
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        width: '100%',
        background: 'var(--bg-tertiary)',
        borderRadius: '9999px',
        overflow: 'hidden',
        marginBottom: '32px',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--accent-gradient)',
          borderRadius: '9999px',
          transition: 'width 0.4s ease-out'
        }} />
      </div>

      {/* Step Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(idx);
          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: stepStatus === 'active' ? 'var(--bg-glass-active)' : 'transparent',
                border: stepStatus === 'active' ? '1px solid var(--border-glow)' : '1px solid transparent',
                transition: 'all var(--transition-normal)'
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {stepStatus === 'completed' ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : stepStatus === 'active' ? (
                  <Loader2 size={20} color="#818cf8" style={{ animation: 'spin 1.5s linear infinite' }} />
                ) : (
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-subtle)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: stepStatus === 'active' ? 600 : 500,
                  color: stepStatus === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)'
                }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          marginTop: '24px',
          padding: '14px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
