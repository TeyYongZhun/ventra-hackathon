import { useEffect, type ReactNode } from 'react';

// Warnings for going over today's drink or salt limit: a banner that stays on the tab, and a
// pop-up the moment a drink takes the patient to or past the limit. The pop-up sits above the
// bottom menu (40) but below SOS (50), like Home's daily note, so SOS stays reachable.

const warnIcon = (size: number) => (
  <svg style={{ flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

// "You've reached…" at the limit, "You're 200 ml over…" past it.
export function overTitle(what: 'drink' | 'salt', overBy: number, unit: string): string {
  return overBy > 0
    ? `You're ${overBy.toLocaleString('en-SG')} ${unit} over today's ${what} limit`
    : `You've reached today's ${what} limit`;
}

export function OverLimitBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section role="alert" aria-label={title} style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
      <span style={{ color: 'var(--color-red)' }}>{warnIcon(36)}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 23, lineHeight: '30px', fontWeight: 700 }}>{title}</p>
        <p style={{ margin: 0, fontSize: 20, lineHeight: '29px' }}>{children}</p>
      </div>
    </section>
  );
}

export function LimitWarningDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 45, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', background: 'rgba(22,32,30,0.55)' }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="limit-warning-title"
        aria-describedby="limit-warning-text"
        style={{ width: '100%', maxWidth: 342, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 24px 24px', borderRadius: 32, background: 'var(--color-surface)', border: '3px solid var(--color-red)', color: 'var(--color-ink)', textAlign: 'center', boxShadow: 'var(--shadow-modal)', animation: 'vt-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <span aria-hidden="true" style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-red-soft)', color: 'var(--color-red)' }}>
          {warnIcon(44)}
        </span>
        <h2 id="limit-warning-title" style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.015em' }}>{title}</h2>
        <p id="limit-warning-text" style={{ margin: 0, fontSize: 21, lineHeight: '30px' }}>{children}</p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          style={{ width: '100%', height: 'var(--touch-button)', marginTop: 6, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-ink)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 'var(--text-title)', fontWeight: 700, cursor: 'pointer' }}
        >
          OK, I understand
        </button>
      </div>
    </div>
  );
}
