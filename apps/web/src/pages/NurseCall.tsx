import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NurseScript } from '../components/NurseScript';
import { useLatestAlert, useMetrics } from '../lib/api';

// G2 · Calling the nurse (design/NurseCall.dc.html). A simulated call: no real call is made.
export default function NurseCall() {
  const alert = useLatestAlert();
  const metrics = useMetrics();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const connected = Math.max(seconds - 3, 0);
  const clock = `${String(Math.floor(connected / 60)).padStart(2, '0')}:${String(connected % 60).padStart(2, '0')}`;
  const status = seconds < 3 ? 'Calling…' : `Connected · ${clock}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <section
        aria-live="polite"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px 28px', margin: '-24px -24px 6px', background: 'var(--color-blue)', borderRadius: '0 0 32px 32px', textAlign: 'center' }}
      >
        <div aria-hidden="true" style={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', boxShadow: '0 0 0 12px rgba(255,255,255,0.45)' }}>
          <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h1 style={{ margin: '12px 0 0', fontSize: 34, lineHeight: '40px', fontWeight: 700, letterSpacing: '-0.02em' }}>Heart Failure Nurse</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: '32px', fontWeight: 700 }}>{status}</p>
      </section>

      {alert.data && metrics.data && (
        <NurseScript script={alert.data.script} date={alert.data.date} today={metrics.data.today} />
      )}

      <Link
        to="/home"
        style={{ minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', background: 'var(--color-red)', color: 'var(--color-surface)', textDecoration: 'none', fontSize: 26, fontWeight: 700 }}
      >
        End call
      </Link>
      <p style={{ margin: 0, fontSize: 'var(--text-tag)', lineHeight: '24px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
        Demo only — no real call is made.
      </p>
    </div>
  );
}
