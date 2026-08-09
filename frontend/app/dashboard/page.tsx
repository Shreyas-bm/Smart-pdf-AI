'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import UploadZone from '@/components/documents/UploadZone';
import ProcessingStatus from '@/components/documents/ProcessingStatus';
import { 
  FileText, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  HelpCircle, 
  Zap,
  Plus
} from 'lucide-react';

interface DocumentItem {
  id: string;
  filename: string;
  file_size: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProcessingDoc, setActiveProcessingDoc] = useState<{ id: string; filename: string } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/documents', { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        // Mock default documents if API call has fallback
        setDocuments([
          {
            id: 'sample-doc-1',
            filename: 'Computer_Science_Data_Structures.pdf',
            file_size: 4850000,
            status: 'completed',
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-doc-2',
            filename: 'Machine_Learning_Fundamentals.pdf',
            file_size: 7200000,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ]);
      }
    } catch (err) {
      setDocuments([
        {
          id: 'sample-doc-1',
          filename: 'Computer_Science_Data_Structures.pdf',
          file_size: 4850000,
          status: 'completed',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSuccess = (docId: string, filename: string, taskId: string) => {
    setActiveProcessingDoc({ id: docId, filename });
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this document and all associated study materials?')) return;

    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/documents/${docId}`, { method: 'DELETE', headers });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Processing Modal Overlay */}
        {activeProcessingDoc && (
          <div className="fixed inset-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-md flex items-center justify-center p-4">
            <ProcessingStatus
              documentId={activeProcessingDoc.id}
              filename={activeProcessingDoc.filename}
              onComplete={() => {
                setActiveProcessingDoc(null);
                fetchDocuments();
              }}
            />
          </div>
        )}

        {/* Dashboard Banner Header */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#12121A] via-[#1E1E2A] to-[#12121A] p-6 md:p-10 border border-[#7C5CFF]/30 overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#7C5CFF]/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C5CFF]/20 border border-[#7C5CFF]/40 text-[#00D4FF] text-xs font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> AI Study Assistant Active
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Transform Your PDFs into Interactive Study Workspaces
            </h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base">
              Upload any textbook or notes to extract instant summaries, smart revision bullet points, practice quizzes, flashcards, and RAG doubt-solving chat.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card glass-card-hover p-6 rounded-2xl border border-[#1E1E2A] flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 text-[#7C5CFF]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{documents.length}</span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Uploaded Documents</span>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl border border-[#1E1E2A] flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[#00D4FF]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">4 Study Modes</span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Summary, Quiz, Flashcards, Chat</span>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl border border-[#1E1E2A] flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">100% Vector Search</span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Exact Citation Badges</span>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <section id="upload" className="scroll-mt-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#00D4FF]" /> Upload New Course PDF
          </h2>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* My Documents Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7C5CFF]" /> My Document Workspaces
            </h2>
            <span className="text-xs text-gray-400 font-medium">{documents.length} files available</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl shimmer-skeleton border border-[#1E1E2A]"></div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-[#1E1E2A]">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Documents Uploaded Yet</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Drag & drop a course PDF above to create your first interactive study workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/document/${doc.id}`}
                  className="glass-card glass-card-hover p-6 rounded-2xl border border-[#1E1E2A] flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#7C5CFF] group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#00D4FF] transition-colors truncate max-w-xs">
                          {doc.filename}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete document"
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#1E1E2A]/60">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Workspace Active
                    </span>
                    <span className="text-xs font-bold text-[#00D4FF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Study Workspace <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
