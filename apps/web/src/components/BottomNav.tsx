import React from 'react';

type NavTab = 'home' | 'track' | 'ask' | 'medicine' | 'more';

interface BottomNavProps {
  activeTab: NavTab;
  onChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    id: 'track',
    label: 'Track',
    icon: (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: 'ask',
    label: 'Ask AI',
    icon: (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8V4H8" />
        <rect width={16} height={12} x={4} y={8} rx={2} />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
  },
  {
    id: 'medicine',
    label: 'Medicine',
    icon: (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    icon: (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x={3} y={3} width={7} height={7} rx={1.5} />
        <rect x={14} y={3} width={7} height={7} rx={1.5} />
        <rect x={3} y={14} width={7} height={7} rx={1.5} />
        <rect x={14} y={14} width={7} height={7} rx={1.5} />
      </svg>
    ),
  },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Main menu"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 4,
        padding: '8px 6px 4px',
        background: 'var(--color-surface)',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid var(--color-line)',
        boxShadow: 'var(--shadow-nav)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              height: 76,
              borderRadius: 20,
              background: isActive ? 'var(--color-blue)' : 'transparent',
              color: 'var(--color-ink)',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 64,
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
