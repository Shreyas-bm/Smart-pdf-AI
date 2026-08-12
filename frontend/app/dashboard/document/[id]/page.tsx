'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ChatTab from '@/components/workspace/ChatTab';
import PDFViewer from '@/components/workspace/PDFViewer';
import ProcessingStatus from '@/components/documents/ProcessingStatus';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Share2, 
  PanelRightClose, 
  PanelRightOpen, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface DocumentDetails {
  id: string;
  filename: string;
  file_size: number;
  status: string;
  created_at: string;
}

export default function DocumentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [documentInfo, setDocumentInfo] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF controls state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'document' | 'chat'>('document');

  // File replacement states
  const [replacing, setReplacing] = useState<boolean>(false);
  const [replacedDoc, setReplacedDoc] = useState<{ id: string; filename: string } | null>(null);

  const fetchDocumentInfo = async () => {
    const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(documentId);
    if (!isValidUUID) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${documentId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocumentInfo(data);
      } else {
        // Fallback for demo
        setDocumentInfo({
          id: documentId,
          filename: 'Computer_Science_Data_Structures.pdf',
          file_size: 4850000,
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      setDocumentInfo({
        id: documentId,
        filename: 'Course_Study_Material.pdf',
        file_size: 4850000,
        status: 'completed',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(documentId);
    if (documentId && isValidUUID) {
      fetchDocumentInfo();
    }
  }, [documentId]);

  const handleCitationClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // On mobile, auto-switch to document view to let user see the page
    if (window.innerWidth < 768) {
      setMobileTab('document');
    }
  };

  const handleFileReplace = async (file: File) => {
    setReplacing(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setReplacedDoc({ id: data.document_id, filename: data.filename });
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Failed to upload new document.');
        setReplacing(false);
      }
    } catch (err) {
      alert('An error occurred during replacement upload. Please check connection.');
      setReplacing(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] overflow-hidden space-y-4">
        {/* Processing Modal Overlay during File Replacement */}
        {replacing && replacedDoc && (
          <div className="fixed inset-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-md flex items-center justify-center p-4">
            <ProcessingStatus
              documentId={replacedDoc.id}
              filename={replacedDoc.filename}
              onComplete={() => {
                setReplacing(false);
                router.push(`/dashboard/document/${replacedDoc.id}`);
              }}
            />
          </div>
        )}

        {/* 1. Header Navigation Bar */}
        <div className="flex items-center justify-between bg-[#12121A]/50 border border-[#1E1E2A] rounded-2xl px-5 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#00D4FF] transition-colors"
            >
              <ArrowLeft className="w-4.5 h-4.5" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-[#1E1E2A] hidden sm:block"></div>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-[#7C5CFF] flex-shrink-0" />
              <h1 className="font-extrabold text-white text-sm md:text-base truncate max-w-[200px] sm:max-w-[400px]">
                {documentInfo?.filename || 'Loading Workspace...'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse sidebar button (desktop & tablet only) */}
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="hidden md:flex p-2 rounded-xl bg-[#0B0B0F] border border-[#1E1E2A] text-gray-400 hover:text-white hover:border-[#7C5CFF] transition-all items-center gap-1.5 text-xs font-bold"
              title={showRightPanel ? 'Hide Study Tools' : 'Show Study Tools'}
            >
              {showRightPanel ? (
                <>
                  <PanelRightClose className="w-4 h-4 text-[#00D4FF]" />
                  <span className="hidden lg:inline">Hide Sidebar</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-4 h-4 text-[#7C5CFF]" />
                  <span className="hidden lg:inline">Show Sidebar</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Workspace link copied to clipboard!');
              }}
              className="p-2 md:px-4 md:py-2 rounded-xl bg-[#0B0B0F] border border-[#1E1E2A] text-xs font-bold text-gray-300 hover:text-white hover:border-[#00D4FF] flex items-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4 text-[#00D4FF]" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* 2. Workspace Body (Split Screen / Tab Content) */}
        {loading ? (
          <div className="flex-1 flex flex-col gap-4 animate-pulse">
            <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 h-full bg-[#12121A] border border-[#1E1E2A] rounded-3xl shimmer-skeleton"></div>
              <div className="md:col-span-5 h-full bg-[#12121A] border border-[#1E1E2A] rounded-3xl shimmer-skeleton"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden min-h-0 relative">
            
            {/* Left Column: PDF Viewer */}
            <div 
              className={`h-full transition-all duration-300 min-w-0 ${
                // Mobile behavior: toggle view
                mobileTab === 'document' ? 'flex flex-col' : 'hidden md:flex'
              } ${
                // Desktop split widths
                showRightPanel 
                  ? 'flex-1 md:max-w-[50%] lg:max-w-[58%]' 
                  : 'flex-1 md:max-w-full'
              }`}
            >
              <PDFViewer
                documentId={documentId}
                filename={documentInfo?.filename || 'Document.pdf'}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onFileReplace={handleFileReplace}
              />
            </div>

            {/* Right Column: AI Chat Panel */}
            <div 
              className={`h-full transition-all duration-300 ${
                // Mobile behavior: toggle view
                mobileTab === 'chat' ? 'flex flex-col' : 'hidden md:flex'
              } ${
                // Desktop split widths
                showRightPanel 
                  ? 'w-full md:w-[50%] lg:w-[42%] flex flex-col min-w-[320px]' 
                  : 'hidden'
              }`}
            >
              <div className="flex-1 flex flex-col min-h-0">
                <ChatTab 
                  documentId={documentId} 
                  onCitationClick={handleCitationClick}
                />
              </div>
            </div>

          </div>
        )}

        {/* 3. Mobile Bottom Tab Bar (fixed above safe areas, visible on <768px only) */}
        <div className="md:hidden flex items-center justify-around bg-[#12121A]/95 border-t border-[#1E1E2A] py-2.5 px-6 backdrop-blur-md rounded-t-3xl -mx-4 -mb-4 z-20">
          <button
            onClick={() => setMobileTab('document')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all ${
              mobileTab === 'document' 
                ? 'text-[#00D4FF] bg-[#00D4FF]/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Document</span>
          </button>
          
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all ${
              mobileTab === 'chat' 
                ? 'text-[#7C5CFF] bg-[#7C5CFF]/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>AI Chat</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
