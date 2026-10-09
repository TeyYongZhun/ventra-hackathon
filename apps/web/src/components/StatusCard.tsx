
interface StatusCardProps {
  variant: 'green' | 'yellow';
  headline: string;
  subText: string;
}

export function StatusCard({ variant, headline, subText }: StatusCardProps) {
  const isGreen = variant === 'green';

  const bg = isGreen ? 'var(--color-green-soft)' : 'var(--color-yellow-soft)';
  const border = isGreen ? 'var(--color-green)' : 'var(--color-yellow-ink)';
  const iconBg = isGreen ? 'var(--color-green)' : 'var(--color-yellow-ink)';
  const iconColor = 'var(--color-surface)';

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: bg,
        border: `3px solid ${border}`,
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-pill)',
          background: iconBg,
          color: iconColor,
        }}
        aria-hidden="true"
      >
        {isGreen ? (
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        )}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)', fontWeight: 700 }}>
          {headline}
        </span>
        <span style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)', color: 'var(--color-ink-muted)' }}>
          {subText}
        </span>
      </span>
    </div>
  );
}
