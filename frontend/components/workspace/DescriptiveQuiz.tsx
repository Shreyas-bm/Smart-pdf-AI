'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

interface DescriptiveQuestion {
  question: string;
  answer: string;
}

interface DescriptiveQuizProps {
  questions: DescriptiveQuestion[];
}

export default function DescriptiveQuiz({ questions }: DescriptiveQuizProps) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  if (!questions || questions.length === 0) return null;

  const toggleItem = (idx: number) => {
    setOpenItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-[#00D4FF]" /> Descriptive Exam Questions & Model Solutions
      </h3>

      {questions.map((q, idx) => {
        const isOpen = !!openItems[idx];
        return (
          <div
            key={idx}
            className="glass-card rounded-2xl border border-[#1E1E2A] overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => toggleItem(idx)}
              id={`descriptive-q-${idx}`}
              className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-[#181824] transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#7C5CFF]/20 text-[#7C5CFF] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  Q{idx + 1}
                </span>
                <span className="font-semibold text-white text-base leading-snug">{q.question}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#00D4FF] flex-shrink-0">
                {isOpen ? (
                  <>
                    <span>Hide Answer</span> <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Reveal Model Answer</span> <Eye className="w-4 h-4" />
                  </>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="p-5 pt-0 border-t border-[#1E1E2A] bg-[#0B0B0F]/60 animate-fade-in">
                <div className="mt-4 p-4 rounded-xl bg-[#12121A] border border-emerald-500/30 text-gray-200 text-sm leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" /> AI Model Answer & Grading Scheme
                  </div>
                  <p className="whitespace-pre-line text-gray-300">{q.answer}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
