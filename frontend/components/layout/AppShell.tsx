'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Sparkles, 
  BookOpen, 
  UploadCloud 
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard & Files', href: '/dashboard', icon: BookOpen },
    { label: 'Upload PDF', href: '/dashboard#upload', icon: UploadCloud },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1E1E2A] bg-[#12121A]/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Name */}
          <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#00D4FF] shadow-lg shadow-[#7C5CFF]/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base md:text-lg tracking-tight gradient-text">SmartPDF AI</span>
              <span className="block text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Study Assistant</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 md:gap-4 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-xs md:text-sm transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C5CFF]/20 to-[#00D4FF]/10 text-white border border-[#7C5CFF]/40 shadow-md shadow-[#7C5CFF]/10'
                      : 'text-gray-400 hover:text-white hover:bg-[#1E1E2A]/50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#00D4FF]" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                </Link>
              );
            })}
          </nav>

          {/* Local Workspace Status */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E1E2A]/40 border border-[#1E1E2A]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] md:text-xs font-semibold text-gray-300">Local DB Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
