'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Sparkles, FileText, Cpu, Database, Check } from 'lucide-react';

interface ProcessingStatusProps {
  documentId: string;
  filename: string;
  onComplete?: () => void;
}

export default function ProcessingStatus({ documentId, filename, onComplete }: ProcessingStatusProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Reading & Parsing PDF Text', icon: FileText, desc: 'Extracting page numbers, structural headers, and paragraphs.' },
    { title: 'Semantic Sentence Splitting', icon: Cpu, desc: 'Parsing document into 512-token chunks with sliding window.' },
    { title: 'Generating Vector Embeddings', icon: Sparkles, desc: 'Encoding text chunks with embedding pipeline.' },
    { title: 'Vector Store & Indexing', icon: Database, desc: 'Inserting high-dimensional vectors into similarity database.' },
    { title: 'Study Workspace Ready', icon: CheckCircle2, desc: 'Configuring summaries, practice quizzes, and RAG chat.' },
  ];

  useEffect(() => {
    // Step progression animation sequence
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              router.push(`/dashboard/document/${documentId}`);
            }
          }, 1200);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [documentId, router, onComplete, steps.length]);

  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto glass-card rounded-2xl p-8 border border-[#7C5CFF]/30 shadow-2xl relative overflow-hidden">
      <div className="text-center mb-8">
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-[#7C5CFF] to-[#00D4FF] mb-4 shadow-lg shadow-[#7C5CFF]/40 animate-pulse-glow">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">{filename}</h2>
        <p className="text-sm text-gray-400 mt-1">SmartPDF Ingestion Pipeline Active</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-semibold text-gray-400 mb-2">
          <span>Processing Pipeline</span>
          <span className="text-[#00D4FF]">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-[#12121A] rounded-full overflow-hidden border border-[#1E1E2A]">
          <div
            className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#00D4FF] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Step List */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={idx}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-[#7C5CFF]/10 border-[#7C5CFF]/50 shadow-md shadow-[#7C5CFF]/10 scale-[1.01]'
                  : isDone
                  ? 'bg-[#12121A] border-emerald-500/30 opacity-90'
                  : 'bg-[#12121A]/40 border-[#1E1E2A] opacity-50'
              }`}
            >
              <div className="pt-0.5">
                {isDone ? (
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                ) : isCurrent ? (
                  <div className="p-1 rounded-full bg-[#7C5CFF]/20 text-[#00D4FF]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="p-1 rounded-full bg-[#1E1E2A] text-gray-500">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div>
                <h4 className={`text-sm font-semibold ${isCurrent ? 'text-white' : isDone ? 'text-gray-200' : 'text-gray-500'}`}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
