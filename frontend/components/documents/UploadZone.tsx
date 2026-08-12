'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface UploadZoneProps {
  onUploadSuccess: (docId: string, filename: string, taskId: string) => void;
}

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    setError(null);
    const nameLower = file.name.toLowerCase();
    if (!(nameLower.endsWith('.pdf') || nameLower.endsWith('.docx'))) {
      setError('Invalid file format. Only PDF and DOCX files are supported.');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the maximum limit of 50MB.');
      return false;
    }
    setSelectedFile(file);
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || 'Failed to upload PDF file.');
      }

      const data = await res.json();
      onUploadSuccess(data.document_id, data.filename, data.task_id || '');
    } catch (err: unknown) {
      // Never navigate with a made-up id: the workspace can only load documents
      // that were actually created by the API.
      setError(err instanceof Error ? err.message : 'Unable to upload the document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Drag & Drop Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="pdf-upload-dropzone"
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-[#00D4FF] bg-[#00D4FF]/10 scale-[1.01]'
            : selectedFile
            ? 'border-[#7C5CFF] bg-[#7C5CFF]/10'
            : 'border-[#1E1E2A] hover:border-[#7C5CFF]/60 bg-[#12121A]/50 hover:bg-[#12121A]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          id="pdf-file-input"
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#7C5CFF]/20 to-[#00D4FF]/20 border border-[#7C5CFF]/30 animate-float">
            <UploadCloud className="w-10 h-10 text-[#00D4FF]" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              {selectedFile ? selectedFile.name : 'Upload PDF or Word Document'}
            </h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {selectedFile
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Ingestion`
                : 'Drag and drop your course textbook, syllabus, or lecture slides here, or click to browse.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Supports PDF, DOCX</span>
            <span>•</span>
            <span>Up to 50MB</span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected file confirm button */}
      {selectedFile && !uploading && (
        <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-[#12121A] border border-[#7C5CFF]/40">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#7C5CFF]" />
            <div>
              <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            onClick={handleUploadSubmit}
            id="start-ingestion-btn"
            className="btn-gradient px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            Start Processing <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-4 p-4 rounded-xl bg-[#12121A] border border-[#7C5CFF]/40 flex items-center justify-center gap-3 text-white">
          <div className="w-5 h-5 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Uploading document bytes to storage pipeline...</span>
        </div>
      )}
    </div>
  );
}
