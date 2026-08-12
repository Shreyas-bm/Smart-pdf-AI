'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import UploadZone from '@/components/documents/UploadZone';
import ProcessingStatus from '@/components/documents/ProcessingStatus';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [activeProcessingDoc, setActiveProcessingDoc] = useState<{ id: string; filename: string } | null>(null);

  const handleUploadSuccess = (docId: string, filename: string, taskId: string) => {
    setActiveProcessingDoc({ id: docId, filename });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Processing Modal Overlay */}
        {activeProcessingDoc && (
          <div className="fixed inset-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-md flex items-center justify-center p-4">
            <ProcessingStatus
              documentId={activeProcessingDoc.id}
              filename={activeProcessingDoc.filename}
              onComplete={() => {
                router.push(`/dashboard/document/${activeProcessingDoc.id}`);
                setActiveProcessingDoc(null);
              }}
            />
          </div>
        )}

        {/* Dashboard Banner Header */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#12121A] via-[#1E1E2A] to-[#12121A] p-6 md:p-10 border border-[#7C5CFF]/30 overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#7C5CFF]/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 text-[#00D4FF] text-xs font-semibold mb-4">
              <Sparkles className="w-4 h-4 text-[#00D4FF]" /> AI Study Assistant Active
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Transform Your PDFs into Interactive Study Workspaces
            </h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base">
              Upload any textbook or notes. We will instantly extract summaries, smart revision bullet points, practice quizzes, flashcards, and RAG doubt-solving chat.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <section id="upload" className="scroll-mt-8">
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </section>
      </div>
    </AppShell>
  );
}
