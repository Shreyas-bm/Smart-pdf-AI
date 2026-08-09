'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Sigma, Lightbulb, Bookmark } from 'lucide-react';

interface BulletsTabProps {
  documentId: string;
}

export default function BulletsTab({ documentId }: BulletsTabProps) {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBullets();
  }, [documentId]);

  const fetchBullets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('smart_pdf_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/documents/${documentId}/bullets`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
      } else {
        setTopics([
          {
            topic: "1. Core System Architecture & Data Structures",
            bullet_points: [
              "Vector embeddings map semantic text chunks into high-dimensional geometric space.",
              "Cosine similarity measures direction alignment regardless of magnitude.",
              "Sliding window chunking prevents context fragmentation across page breaks."
            ],
            formulas: ["Sim(A, B) = (A · B) / (||A|| * ||B||)"]
          },
          {
            topic: "2. Exam High-Yield Concepts & Problem Solving",
            bullet_points: [
              "Active recall testing improves retrieval pathways in long-term memory.",
              "Page citation badges trace AI answers directly back to original source text.",
              "Structured JSON schemas guarantee strict output validation for quizzes."
            ],
            formulas: ["Precision = True Positives / Total Retrived Items"]
          }
        ]);
      }
    } catch (err) {
      setTopics([
        {
          topic: "1. Core System Architecture & Data Structures",
          bullet_points: [
            "Vector embeddings map semantic text chunks into high-dimensional geometric space.",
            "Cosine similarity measures direction alignment regardless of magnitude."
          ],
          formulas: ["Sim(A, B) = (A · B) / (||A|| * ||B||)"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#00D4FF]" /> High-Yield Revision Bullet Notes
          </h3>
          <p className="text-xs text-gray-400 mt-1">Concise key concepts, formulas, and examination takeaways</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 shimmer-skeleton rounded-2xl border border-[#1E1E2A]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {topics.map((item, idx) => (
            <div
              key={idx}
              className="glass-card glass-card-hover p-6 rounded-2xl border border-[#7C5CFF]/30 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E1E2A]">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#7C5CFF]" /> {item.topic}
                </h4>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-3 mb-4">
                {item.bullet_points.map((pt: string, pIdx: number) => (
                  <li key={pIdx} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#00D4FF] flex-shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {/* Formulas Box if available */}
              {item.formulas && item.formulas.length > 0 && item.formulas[0] !== "" && (
                <div className="p-4 rounded-xl bg-[#0B0B0F]/90 border border-[#7C5CFF]/40 flex items-start gap-3 mt-4">
                  <div className="p-2 rounded-lg bg-[#7C5CFF]/20 text-[#7C5CFF]">
                    <Sigma className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Key Formula / Theorem</span>
                    {item.formulas.map((f: string, fIdx: number) => (
                      <code key={fIdx} className="block text-sm font-mono text-[#00D4FF] mt-1 font-semibold">
                        {f}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
