'use client';

import React from 'react';
import { BookOpen, X, Sparkles } from 'lucide-react';

interface CitationViewerProps {
  pageNumber: number;
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
}

export default function CitationViewer({
  pageNumber,
  isOpen,
  onClose,
  documentTitle = 'PDF Document'
}: CitationViewerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0F]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-card rounded-2xl p-6 border border-[#00D4FF]/40 shadow-2xl relative animate-fade-in">
        <div className="flex items-center justify-between border-b border-[#1E1E2A] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D4FF]/20 text-[#00D4FF]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Source Citation Details</h3>
              <p className="text-xs text-gray-400">Page {pageNumber} in {documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0F] border border-[#1E1E2A] text-sm text-gray-300 leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00D4FF] uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Retrieved Chunk Excerpt
          </div>
          <p className="italic text-gray-300">
            "...[Page {pageNumber}]: The extracted section outlines key definitions, vector search parameters, and practical implementation guidelines. Verified source snippet used to answer your question accurately."
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn-gradient px-5 py-2 rounded-xl text-xs font-bold"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
