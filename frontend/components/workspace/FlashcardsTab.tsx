'use client';

import React, { useState, useEffect } from 'react';
import FlashcardItem from './FlashcardItem';
import { ChevronLeft, ChevronRight, Award, Layers, Sparkles } from 'lucide-react';

interface FlashcardsTabProps {
  documentId: string;
}

export default function FlashcardsTab({ documentId }: FlashcardsTabProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredMap, setMasteredMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlashcards();
  }, [documentId]);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${documentId}/bullets`, { headers });
      if (res.ok) {
        const data = await res.json();
        const extractedCards: any[] = [];
        (data.topics || []).forEach((t: any) => {
          (t.bullet_points || []).forEach((b: string) => {
            extractedCards.push({
              concept: t.topic,
              definition: b,
              category: "Revision Concept"
            });
          });
        });
        setCards(extractedCards.length > 0 ? extractedCards : defaultDeck);
      } else {
        setCards(defaultDeck);
      }
    } catch (err) {
      setCards(defaultDeck);
    } finally {
      setLoading(false);
    }
  };

  const defaultDeck = [
    {
      concept: "Vector Embedding Space",
      definition: "High-dimensional geometric vector representation of text chunks where semantic closeness corresponds to mathematical distance.",
      category: "Core Concept"
    },
    {
      concept: "Cosine Similarity Metric",
      definition: "Measures the cosine of the angle between two vectors, ranging from -1 to 1, ignoring vector magnitude.",
      category: "Math & Retrieval"
    },
    {
      concept: "Retrieval-Augmented Generation (RAG)",
      definition: "Pulls relevant context chunks from a vector store to ground LLM generation and eliminate hallucinations.",
      category: "AI Architecture"
    },
    {
      concept: "Page Citation Badges",
      definition: "Direct source references attached to generated responses allowing immediate validation against original PDF pages.",
      category: "Study Features"
    }
  ];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const toggleMastered = (idx: number) => {
    setMasteredMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const currentCard = cards[currentIndex];
  const totalMastered = Object.values(masteredMap).filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Header Deck Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#7C5CFF]" /> Revision Flashcards Deck
          </h3>
          <p className="text-xs text-gray-400 mt-1">Interactive 3D study cards for active recall and exam preparation</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#12121A] border border-[#1E1E2A] text-xs font-bold text-emerald-400 flex items-center gap-2">
            <Award className="w-4 h-4" /> Mastered: {totalMastered} / {cards.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full max-w-lg mx-auto h-[320px] shimmer-skeleton rounded-3xl border border-[#1E1E2A]"></div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No flashcards generated yet.</div>
      ) : (
        <div className="space-y-6">
          <FlashcardItem
            concept={currentCard.concept}
            definition={currentCard.definition}
            category={currentCard.category}
            isMastered={!!masteredMap[currentIndex]}
            onToggleMastered={() => toggleMastered(currentIndex)}
          />

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              id="flashcard-prev-btn"
              className={`p-3 rounded-2xl border transition-all ${
                currentIndex === 0
                  ? 'bg-[#12121A]/50 border-[#1E1E2A] text-gray-600'
                  : 'bg-[#12121A] border-[#1E1E2A] text-white hover:border-[#7C5CFF]'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <span className="text-sm font-extrabold text-white">
              {currentIndex + 1} <span className="text-gray-500">/ {cards.length}</span>
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              id="flashcard-next-btn"
              className={`p-3 rounded-2xl border transition-all ${
                currentIndex === cards.length - 1
                  ? 'bg-[#12121A]/50 border-[#1E1E2A] text-gray-600'
                  : 'bg-[#7C5CFF] border-[#7C5CFF] text-white hover:bg-[#6A48FF] shadow-lg shadow-[#7C5CFF]/30'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
