'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FileText, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Brain, 
  MessageSquare, 
  UploadCloud, 
  LogOut, 
  Menu, 
  X,
  UserCheck
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('smart_pdf_token');
    router.push('/login');
  };

  const navItems = [
    { label: 'Dashboard & Files', href: '/dashboard', icon: BookOpen },
    { label: 'Upload PDF', href: '/dashboard#upload', icon: UploadCloud },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0B0F]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#1E1E2A] bg-[#12121A]/80 backdrop-blur-md p-5 justify-between sticky top-0 h-screen z-30">
        <div>
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 mb-8 group">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#00D4FF] shadow-lg shadow-[#7C5CFF]/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight gradient-text">SmartPDF AI</span>
              <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Study Assistant</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C5CFF]/20 to-[#00D4FF]/10 text-white border border-[#7C5CFF]/40 shadow-md shadow-[#7C5CFF]/10'
                      : 'text-gray-400 hover:text-white hover:bg-[#1E1E2A]/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#00D4FF]' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Local Workspace Indicator */}
        <div className="pt-4 border-t border-[#1E1E2A]">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E1E2A]/40 border border-[#1E1E2A]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#00D4FF] flex items-center justify-center font-bold text-white shadow-md">
                L
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">Local Workspace</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Offline Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#12121A] border-b border-[#1E1E2A] sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#00D4FF]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg gradient-text">SmartPDF AI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-300 bg-[#1E1E2A]"
          id="mobile-menu-btn"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0B0B0F]/95 backdrop-blur-lg pt-20 px-6 space-y-4">
          <nav className="space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-4 rounded-xl text-lg font-semibold text-gray-200 bg-[#12121A] border border-[#1E1E2A]"
              >
                <item.icon className="w-6 h-6 text-[#7C5CFF]" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Workspace Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
