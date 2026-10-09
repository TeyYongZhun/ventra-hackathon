
type TrackTab = 'drinks' | 'meal' | 'weight';

interface TrackTabsProps {
  activeTab: TrackTab;
  onChange: (tab: TrackTab) => void;
}

const tabs: { id: TrackTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'drinks',
    label: 'Log drinks',
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
      </svg>
    ),
  },
  {
    id: 'meal',
    label: 'Scan meal',
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
  {
    id: 'weight',
    label: 'Log weight',
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x={3} y={3} width={18} height={18} rx={4} />
        <path d="M7.5 10a6 6 0 0 1 9 0" />
        <path d="m12 10 1.6-2.2" />
      </svg>
    ),
  },
];

export function TrackTabs({ activeTab, onChange }: TrackTabsProps) {
  return (
    <nav
      aria-label="What to track"
      role="tablist"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 6,
        padding: 6,
        borderRadius: 'var(--radius-xl)',
        background: 'var(--color-sunken)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              minHeight: 76,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '6px 4px',
              borderRadius: 'var(--radius-lg)',
              background: isActive ? 'var(--color-blue)' : 'transparent',
              color: 'var(--color-ink)',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 18,
              lineHeight: '22px',
              fontWeight: 700,
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: isActive ? 'var(--shadow-tab)' : 'none',
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
