import { Link } from 'react-router-dom';

// S4 · Confirm call 995 (design/ConfirmCall.dc.html). Opened from "Call 995" on the red status
// page; "Yes" goes to the same simulated call as SOS (family is messaged there).
export default function ConfirmCall() {
  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', maxWidth: 480, margin: '0 auto', padding: '48px 20px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, background: 'var(--color-surface)', color: 'var(--color-ink)', textAlign: 'center' }}>
      <svg role="img" aria-label="Warning" width={150} height={134} viewBox="0 0 24 21.5" style={{ flexShrink: 0, display: 'block' }}>
        <path d="M10.27 1.5a2 2 0 0 1 3.46 0l9.5 16.5a2 2 0 0 1-1.73 3H2.5a2 2 0 0 1-1.73-3z" fill="#B83A26" />
        <path d="M12 6.5v6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={12} cy={17} r={1.6} fill="#FFFFFF" />
      </svg>

      <h1 style={{ margin: 0, fontSize: 44, lineHeight: '50px', fontWeight: 700, letterSpacing: '-0.02em' }}>Call 995 now?</h1>
      <p style={{ margin: 0, fontSize: 24, lineHeight: '34px' }}>An ambulance will come to you. We will tell them where you are and about your heart.</p>

      <div style={{ flex: 1 }} />
      <Link
        to={`/emergency/call?what=${encodeURIComponent('Other emergency')}`}
        style={{ width: '100%', minHeight: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 'var(--radius-pill)', background: 'var(--color-red)', color: 'var(--color-surface)', textDecoration: 'none', fontSize: 32, fontWeight: 700 }}
      >
        <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Yes, call 995
      </Link>
      <Link
        to="/status/red"
        style={{ width: '100%', minHeight: 88, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '3px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 26, fontWeight: 700 }}
      >
        No, go back
      </Link>
      <p style={{ margin: 0, fontSize: 'var(--text-tag)', lineHeight: '24px', color: 'var(--color-ink-muted)' }}>
        Demo only — no real call is made. In a real emergency, call 995 yourself.
      </p>
    </div>
  );
}
