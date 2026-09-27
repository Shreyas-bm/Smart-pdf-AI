import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.85rem',
      color: 'var(--text-muted)',
      marginBottom: '20px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: items[0]?.onClick ? 'pointer' : 'default' }}
           onClick={items[0]?.onClick}>
        <Home size={14} color="var(--text-secondary)" />
      </div>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} color="var(--text-dim)" />
          <span
            onClick={item.onClick}
            style={{
              color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: item.active ? 600 : 400,
              cursor: item.onClick && !item.active ? 'pointer' : 'default',
              transition: 'color var(--transition-fast)',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (item.onClick && !item.active) (e.target as HTMLElement).style.color = '#818cf8';
            }}
            onMouseLeave={(e) => {
              if (item.onClick && !item.active) (e.target as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};
