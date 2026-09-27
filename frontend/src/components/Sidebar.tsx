import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Bookmark,
  MessageSquare,
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type NavTab = 'overview' | 'chapters' | 'topics' | 'qa' | 'quiz';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  chaptersCount: number;
  topicsCount: number;
  disabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  chaptersCount,
  topicsCount,
  disabled = false
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'chapters' as NavTab, label: 'Chapters', icon: Layers, badge: chaptersCount > 0 ? `${chaptersCount}` : null },
    { id: 'topics' as NavTab, label: 'Topics', icon: Bookmark, badge: topicsCount > 0 ? `${topicsCount}` : null },
    { id: 'qa' as NavTab, label: 'Grounded Q&A', icon: MessageSquare, badge: null },
    { id: 'quiz' as NavTab, label: 'Quiz & Practice', icon: Award, badge: 'AI' },
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '24px 20px 12px' }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)'
        }}>
          Workspace Navigation
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              disabled={disabled}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--bg-glass-active)' : 'transparent',
                border: isActive ? '1px solid var(--border-glow)' : '1px solid transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? '#818cf8' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={item.badge === 'AI' ? 'badge badge-indigo' : 'badge'}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div style={{ padding: '16px', margin: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={14} color="#818cf8" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>100% Local Intelligence</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          No cloud API leakage. All OCR, embeddings, Q&A, and quiz generation run in local memory.
        </p>
      </div>
    </aside>
  );
};
