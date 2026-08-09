'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#7C5CFF] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-400">Loading SmartPDF AI Workspace...</p>
      </div>
    </div>
  );
}
