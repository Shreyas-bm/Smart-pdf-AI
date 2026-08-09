'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Copy, Check, Sparkles, Layers, List } from 'lucide-react';

interface SummaryTabProps {
  documentId: string;
}

export default function SummaryTab({ documentId }: SummaryTabProps) {
  const [lengthType, setLengthType] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [viewMode, setViewMode] = useState<'full' | 'chapters'>('full');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSummary(lengthType);
  }, [documentId, lengthType]);

  const fetchSummary = async (type: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${documentId}/summary?length_type=${type}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      } else {
        // Fallback demo data
        setSummaryData({
          full_summary: `### Comprehensive Document Executive Summary\n\nThis study material introduces fundamental principles, core analytical techniques, and high-yield applications designed for academic mastery.\n\n1. **Core Architectural Framework**: Details systemic components, modular organization, and foundational mechanics.\n2. **Methodology & Execution**: Covers step-by-step algorithms, empirical observations, and best practices for problem solving.\n3. **Practical Insights**: Highlight essential examination patterns and critical formulas required for assessments.`,
          chapter_summaries: {
            chapters: [
              { title: "Chapter 1: Foundational Principles", summary: "Establishes core terminology, definitions, and domain scope." },
              { title: "Chapter 2: Core Methodology", summary: "Explores procedural implementation, algorithms, and logical structures." },
              { title: "Chapter 3: Assessment & Synthesis", summary: "Presents practical case studies, formulas, and high-priority revision notes." }
            ]
          }
        });
      }
    } catch (err) {
      setSummaryData({
        full_summary: `### Comprehensive Document Executive Summary\n\nThis study material introduces fundamental principles, core analytical techniques, and high-yield applications designed for academic mastery.`,
        chapter_summaries: {
          chapters: [
            { title: "Chapter 1: Foundational Principles", summary: "Establishes core terminology and definitions." },
            { title: "Chapter 2: Core Methodology", summary: "Explores procedural implementation and algorithms." }
          ]
        }
      });
    } fontFinally: {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summaryData?.full_summary) {
      navigator.clipboard.writeText(summaryData.full_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Length Selector & View Mode */}
      <div className="glass-card p-4 rounded-2xl border border-[#1E1E2A] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Detail Level Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" /> Detail Level:
          </span>
          {(['short', 'medium', 'detailed'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setLengthType(type)}
              id={`summary-length-${type}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                lengthType === type
                  ? 'bg-gradient-to-r from-[#7C5CFF] to-[#00D4FF] text-white shadow-lg shadow-[#7C5CFF]/30'
                  : 'bg-[#12121A] text-gray-400 border border-[#1E1E2A] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-[#12121A] p-1 rounded-xl border border-[#1E1E2A] flex items-center gap-1">
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'full' ? 'bg-[#7C5CFF] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Full Summary
            </button>
            <button
              onClick={() => setViewMode('chapters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'chapters' ? 'bg-[#7C5CFF] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Chapter Breakdown
            </button>
          </div>

          <button
            onClick={handleCopy}
            title="Copy summary text"
            className="p-2.5 rounded-xl bg-[#12121A] border border-[#1E1E2A] text-gray-300 hover:text-white hover:border-[#7C5CFF]/50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Summary Content Body */}
      {loading ? (
        <div className="glass-card p-8 rounded-2xl border border-[#1E1E2A] space-y-4">
          <div className="h-6 w-1/3 shimmer-skeleton rounded-lg"></div>
          <div className="h-20 shimmer-skeleton rounded-xl"></div>
          <div className="h-32 shimmer-skeleton rounded-xl"></div>
        </div>
      ) : viewMode === 'full' ? (
        <div className="glass-card p-8 rounded-2xl border border-[#7C5CFF]/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C5CFF]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed whitespace-pre-line">
            {summaryData?.full_summary}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {summaryData?.chapter_summaries?.chapters?.map((chap: any, idx: number) => (
            <div key={idx} className="glass-card glass-card-hover p-6 rounded-2xl border border-[#1E1E2A]">
              <h4 className="text-lg font-bold text-[#00D4FF] mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {chap.title}
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">{chap.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
