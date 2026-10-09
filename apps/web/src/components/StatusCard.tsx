import type { ReactNode } from 'react';

interface StatusCardProps {
  variant: 'green' | 'yellow';
  headline: string;
  subText: ReactNode;
  // Small label above the headline, e.g. "GREEN · ALL GOOD"
  chip?: string;
  // Optional link row at the bottom, e.g. "What to do now ›"
  footer?: ReactNode;
}

// Matches design/Main.dc.html (status card). Colour is never the only signal:
// the icon, chip and headline all say the same thing.
export function StatusCard({ variant, headline, subText, chip, footer }: StatusCardProps) {
  const isGreen = variant === 'green';

  const bg = isGreen ? 'var(--color-green-soft)' : 'var(--color-yellow-soft)';
  const ink = isGreen ? 'var(--color-green)' : 'var(--color-yellow-ink)';

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: 'var(--space-6)',
        borderRadius: 32,
        background: bg,
        border: `3px solid ${ink}`,
        color: 'var(--color-ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          aria-hidden="true"
          style={{
            width: 76,
            height: 76,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-pill)',
            background: ink,
            color: 'var(--color-surface)',
          }}
        >
          {isGreen ? (
            <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          )}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {chip && (
            <span
              style={{
                alignSelf: 'flex-start',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                background: ink,
                color: 'var(--color-surface)',
                fontSize: 'var(--text-tag)',
                lineHeight: 'var(--lh-tag)',
                fontWeight: 700,
              }}
            >
              {chip}
            </span>
          )}
          <span style={{ fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700, letterSpacing: '-0.015em' }}>
            {headline}
          </span>
        </div>
      </div>
      <div style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>{subText}</div>
      {footer && <div style={{ paddingTop: 14, borderTop: `2px solid ${ink}` }}>{footer}</div>}
    </div>
  );
}
