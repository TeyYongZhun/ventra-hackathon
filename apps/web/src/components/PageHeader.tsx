import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SOSSlot } from './SOSSlot';

interface PageHeaderProps {
  // Round back button on the left, e.g. { to: '/home', label: 'Back to home' }
  back?: { to: string; label: string };
  title?: ReactNode;
  // Title size from the design screen: 38 for top-level tabs, 36/32/30 for inner pages.
  titleSize?: 38 | 36 | 32 | 30;
  // Extra round buttons between the title and SOS (e.g. read aloud).
  extra?: ReactNode;
}

const LINE: Record<number, number> = { 38: 44, 36: 42, 32: 38, 30: 36 };

// The header row every design screen shares: [back] title … SOS.
// SOS lives here so it is in the same place on every page.
export function PageHeader({ back, title, titleSize, extra }: PageHeaderProps) {
  const size = titleSize ?? (back ? 36 : 38);
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <BackButton to={back.to} label={back.label} />}
      {title ? (
        <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: size, lineHeight: `${LINE[size]}px`, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
      ) : (
        <span style={{ flex: 1 }} />
      )}
      {extra}
      <SOSSlot size="page" />
    </header>
  );
}

export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      style={{ width: 64, height: 64, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-ink)', border: '2.5px solid var(--color-ink)' }}
    >
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Link>
  );
}
