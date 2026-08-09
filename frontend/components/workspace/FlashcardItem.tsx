'use client';

import React, { useState } from 'react';
import { RotateCw, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

interface FlashcardItemProps {
  concept: string;
  definition: string;
  category?: string;
  isMastered: boolean;
  onToggleMastered: () => void;
}

export default function FlashcardItem({
  concept,
  definition,
  category = "Core Concept",
  isMastered,
  onToggleMastered
}: FlashcardItemProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-lg mx-auto perspective-1000 min-h-[320px]">
      <div
        onClick={() => setFlipped(!flipped)}
        id="flashcard-flip-container"
        className={`w-full min-h-[320px] cursor-pointer transform-style-3d relative rounded-3xl transition-transform duration-700 shadow-2xl ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden glass-card rounded-3xl p-8 border border-[#7C5CFF]/40 flex flex-col justify-between bg-gradient-to-br from-[#12121A] via-[#181824] to-[#12121A]">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#7C5CFF]/20 text-[#00D4FF] border border-[#7C5CFF]/30 uppercase tracking-wider">
              {category}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" /> Click card to flip
            </span>
          </div>

          <div className="my-auto text-center py-6">
            <h3 className="text-2xl font-extrabold text-white leading-snug">{concept}</h3>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-[#1E1E2A] pt-4">
            <span>Front Side</span>
            <span className="text-[#7C5CFF] font-semibold flex items-center gap-1">
              Reveal Definition <Sparkles className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 glass-card rounded-3xl p-8 border border-[#00D4FF]/40 flex flex-col justify-between bg-gradient-to-br from-[#181824] via-[#12121A] to-[#1E1E2A]">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 uppercase tracking-wider">
              Definition & Key Takeaways
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMastered();
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                isMastered
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#1E1E2A] text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {isMastered ? 'Mastered' : 'Mark as Mastered'}
            </button>
          </div>

          <div className="my-auto py-4">
            <p className="text-gray-200 text-base leading-relaxed">{definition}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-[#1E1E2A] pt-4">
            <span>Back Side</span>
            <span className="text-gray-500">Click to flip back</span>
          </div>
        </div>
      </div>
    </div>
  );
}
