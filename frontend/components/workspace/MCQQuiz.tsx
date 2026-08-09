'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Award, RotateCcw, ArrowRight } from 'lucide-react';

interface MCQ {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface MCQQuizProps {
  mcqs: MCQ[];
}

export default function MCQQuiz({ mcqs }: MCQQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showScore, setShowScore] = useState(false);

  if (!mcqs || mcqs.length === 0) return null;

  const currentQ = mcqs[currentIndex];
  const selectedOption = selectedAnswers[currentIndex];
  const hasAnswered = selectedOption !== undefined;

  const handleSelect = (optIdx: number) => {
    if (hasAnswered) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
  };

  const handleNext = () => {
    if (currentIndex < mcqs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowScore(true);
    }
  };

  const calculateScore = () => {
    let score = 0;
    mcqs.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_answer) {
        score++;
      }
    });
    return score;
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowScore(false);
  };

  return (
    <div className="glass-card p-6 md:p-8 rounded-2xl border border-[#7C5CFF]/30 space-y-6">
      {/* Quiz Progress Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Question {currentIndex + 1} of {mcqs.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#00D4FF]">Score: {calculateScore()} / {mcqs.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#12121A] rounded-full overflow-hidden border border-[#1E1E2A]">
        <div
          className="h-full bg-gradient-to-r from-[#7C5CFF] to-[#00D4FF] transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / mcqs.length) * 100}%` }}
        ></div>
      </div>

      {showScore ? (
        /* Score Summary Screen */
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-tr from-[#7C5CFF]/30 to-[#00D4FF]/30 border border-[#7C5CFF] mb-2">
            <Award className="w-12 h-12 text-[#00D4FF]" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">Quiz Completed!</h3>
          <p className="text-gray-300 text-lg">
            You scored <span className="font-bold text-[#00D4FF]">{calculateScore()}</span> out of <span className="font-bold text-white">{mcqs.length}</span> (
            {Math.round((calculateScore() / mcqs.length) * 100)}%)
          </p>

          <button
            onClick={handleReset}
            className="btn-gradient px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 mt-4"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
        </div>
      ) : (
        /* Active Question Display */
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white leading-snug">{currentQ.question}</h3>

          <div className="space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrect = currentQ.correct_answer === optIdx;

              let btnStyle = 'bg-[#12121A] border-[#1E1E2A] text-gray-300 hover:border-[#7C5CFF]/40';
              if (hasAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-red-500/20 border-red-500 text-red-300 font-bold';
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelect(optIdx)}
                  disabled={hasAnswered}
                  id={`mcq-opt-${currentIndex}-${optIdx}`}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 text-sm ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#1E1E2A] text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                  {hasAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {hasAnswered && (
            <div className="p-4 rounded-xl bg-[#0B0B0F] border border-[#7C5CFF]/40 space-y-1 animate-fade-in">
              <span className="text-xs font-bold text-[#00D4FF] uppercase tracking-wider block">Explanation</span>
              <p className="text-xs text-gray-300 leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}

          {/* Next Button */}
          {hasAnswered && (
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                id="mcq-next-btn"
                className="btn-gradient px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                {currentIndex < mcqs.length - 1 ? 'Next Question' : 'View Results'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
