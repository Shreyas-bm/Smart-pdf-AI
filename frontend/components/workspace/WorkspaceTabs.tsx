'use client';

import React, { useState, useEffect } from 'react';
import SummaryTab from './SummaryTab';
import BulletsTab from './BulletsTab';
import QuizConfig from './QuizConfig';
import MCQQuiz from './MCQQuiz';
import DescriptiveQuiz from './DescriptiveQuiz';
import FlashcardsTab from './FlashcardsTab';
import ChatTab from './ChatTab';

import { 
  FileText, 
  Lightbulb, 
  HelpCircle, 
  Layers, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface WorkspaceTabsProps {
  documentId: string;
  onCitationClick?: (pageNumber: number) => void;
}

export default function WorkspaceTabs({ documentId, onCitationClick }: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'bullets' | 'quiz' | 'flashcards' | 'chat'>('summary');
  
  // Quiz states
  const [difficulty, setDifficulty] = useState('medium');
  const [quizType, setQuizType] = useState('mixed');
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const fetchQuiz = async () => {
    setQuizLoading(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${documentId}/questions?difficulty=${difficulty}&q_type=${quizType}`, {
        method: 'GET',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setQuizData(data.questions);
      } else {
        setQuizData(defaultQuizData);
      }
    } catch (err) {
      setQuizData(defaultQuizData);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quiz' && !quizData) {
      fetchQuiz();
    }
  }, [activeTab]);

  const defaultQuizData = {
    mcqs: [
      {
        question: "What is the primary function of Vector Embeddings in RAG systems?",
        options: [
          "To translate text into high-dimensional geometric representations for semantic search",
          "To compress PDF files for faster disk downloading",
          "To automatically format document text into HTML tags",
          "To clear database cache records periodically"
        ],
        correct_answer: 0,
        explanation: "Vector embeddings represent text semantics in numerical vector spaces, enabling similarity calculation."
      },
      {
        question: "Which similarity metric measures vector direction alignment independent of magnitude?",
        options: [
          "Euclidean Distance",
          "Cosine Similarity",
          "Manhattan Distance",
          "Hamming Distance"
        ],
        correct_answer: 1,
        explanation: "Cosine similarity measures the cosine of the angle between two non-zero vectors."
      }
    ],
    descriptive: [
      {
        question: "Explain how sliding window chunking prevents context fragmentation.",
        answer: "Sliding window chunking overlays consecutive text blocks (e.g. 512 tokens with 64 token overlap) so that sentences bridging chunk boundaries are captured completely without losing context."
      }
    ]
  };

  const tabItems = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'bullets', label: 'Revision Notes', icon: Lightbulb },
    { id: 'quiz', label: 'Practice Quiz', icon: HelpCircle },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'chat', label: 'Doubt Assistant', icon: MessageSquare },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Bar */}
      <div className="glass-card p-2 rounded-2xl border border-[#1E1E2A] flex items-center justify-between overflow-x-auto gap-2">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-btn-${tab.id}`}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-[#7C5CFF] to-[#00D4FF] text-white shadow-lg shadow-[#7C5CFF]/30 scale-[1.02]'
                  : 'text-gray-400 hover:text-white hover:bg-[#181824]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel Render */}
      <div className="animate-fade-in">
        {activeTab === 'summary' && <SummaryTab documentId={documentId} />}

        {activeTab === 'bullets' && <BulletsTab documentId={documentId} />}

        {activeTab === 'quiz' && (
          <div className="space-y-6">
            <QuizConfig
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              quizType={quizType}
              setQuizType={setQuizType}
              onGenerate={fetchQuiz}
              loading={quizLoading}
            />

            {quizLoading ? (
              <div className="h-64 shimmer-skeleton rounded-2xl border border-[#1E1E2A]"></div>
            ) : quizData ? (
              <div className="space-y-8">
                {(quizType === 'mixed' || quizType === 'mcq') && quizData.mcqs && (
                  <MCQQuiz mcqs={quizData.mcqs} />
                )}

                {(quizType === 'mixed' || quizType === 'descriptive') && quizData.descriptive && (
                  <DescriptiveQuiz questions={quizData.descriptive} />
                )}
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'flashcards' && <FlashcardsTab documentId={documentId} />}

        {activeTab === 'chat' && <ChatTab documentId={documentId} onCitationClick={onCitationClick} />}
      </div>
    </div>
  );
}
