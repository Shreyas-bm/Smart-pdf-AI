'use client';

import React from 'react';
import { HelpCircle, Sliders, Play, Sparkles } from 'lucide-react';

interface QuizConfigProps {
  difficulty: string;
  setDifficulty: (val: string) => void;
  quizType: string;
  setQuizType: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function QuizConfig({
  difficulty,
  setDifficulty,
  quizType,
  setQuizType,
  onGenerate,
  loading
}: QuizConfigProps) {
  return (
    <div className="glass-card p-6 rounded-2xl border border-[#1E1E2A] space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#7C5CFF]" /> Customize Practice Quiz
        </h3>
        <span className="text-xs text-gray-400">AI-generated questions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Difficulty Level</label>
          <div className="grid grid-cols-3 gap-2">
            {['easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                id={`quiz-diff-${d}`}
                className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  difficulty === d
                    ? 'bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/30 border border-[#7C5CFF]'
                    : 'bg-[#12121A] text-gray-400 border border-[#1E1E2A] hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Quiz Type selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Question Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'mixed', label: 'Mixed All' },
              { id: 'mcq', label: 'MCQs Only' },
              { id: 'descriptive', label: 'Descriptive' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setQuizType(t.id)}
                id={`quiz-type-${t.id}`}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  quizType === t.id
                    ? 'bg-[#00D4FF] text-[#0B0B0F] shadow-lg shadow-[#00D4FF]/30 border border-[#00D4FF]'
                    : 'bg-[#12121A] text-gray-400 border border-[#1E1E2A] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        id="generate-quiz-btn"
        className="w-full btn-gradient py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Generate Practice Quiz Set
          </>
        )}
      </button>
    </div>
  );
}
