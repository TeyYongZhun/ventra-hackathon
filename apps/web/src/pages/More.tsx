import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemoReset, useDemoYellowDay, useLogout, useMe } from '../lib/api';

const ITEMS = [
  { to: '/report', label: 'My report', sub: 'For your doctor — print or save as PDF' },
  { to: '/family', label: 'Summary for my family', sub: 'What your family sees on Telegram' },
  { to: '/alert', label: 'My alert and nurse script', sub: 'What to tell the nurse' },
  { to: '/setup/1', label: 'Text size and set-up', sub: 'Text size, targets, medicines, cap, contact' },
];

const rowStyle = {
  minHeight: 88,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 18px',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  textDecoration: 'none',
} as const;

const chevron = (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function More() {
  const me = useMe();
  const navigate = useNavigate();
  const logout = useLogout();
  const yellowDay = useDemoYellowDay();
  const reset = useDemoReset();
  const [message, setMessage] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>More</h1>

      <nav aria-label="More" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} style={rowStyle}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--text-body)', lineHeight: '28px', fontWeight: 700 }}>{item.label}</span>
              <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>{item.sub}</span>
            </span>
            {chevron}
          </Link>
        ))}
      </nav>

      {me.data?.is_demo && (
        <section aria-label="Demo tools" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-butter-soft)', border: '2.5px dashed var(--color-yellow-ink)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>Demo tools</h2>
          <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>
            Only for the demo patient. Synthetic data is rebuilt; you stay logged in.
          </p>
          <button
            type="button"
            disabled={yellowDay.isPending}
            onClick={() => yellowDay.mutate(undefined, {
              onSuccess: () => navigate('/home'),
              onError: () => setMessage('Could not start the yellow-day demo.'),
            })}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-yellow)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            Start yellow-day demo (water pill missed)
          </button>
          <button
            type="button"
            disabled={reset.isPending}
            onClick={() => reset.mutate(undefined, {
              onSuccess: () => navigate('/home'),
              onError: () => setMessage('Could not reset the demo.'),
            })}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            Reset demo day
          </button>
          {message && <p role="alert" style={{ margin: 0, fontSize: 18, color: 'var(--color-red)' }}>{message}</p>}
        </section>
      )}

      <button
        type="button"
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
        style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'transparent', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
      >
        Log out
      </button>
    </div>
  );
}
