import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SOSSlot } from '../components';
import { NurseScript } from '../components/NurseScript';
import { useLatestAlert, useMetrics } from '../lib/api';

// G2 · Calling the nurse (design/NurseCall.dc.html). A simulated call: no real call is made.
// Full screen like the design (no bottom menu), so it brings its own page padding and SOS.
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
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', maxWidth: 480, margin: '0 auto', padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: 'var(--color-canvas)' }}>
      <section
        aria-live="polite"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', padding: '40px 20px 28px', margin: '0 -20px 6px', background: 'var(--color-blue)', borderRadius: '0 0 32px 32px', textAlign: 'center' }}
      >
        <span style={{ position: 'absolute', top: 62, right: 20 }}>
          <SOSSlot size="page" />
        </span>
        <div aria-hidden="true" style={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', boxShadow: '0 0 0 12px rgba(255,255,255,0.45)' }}>
          <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
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
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
          <path d="M22 2 2 22" />
        </svg>
        End call
      </Link>
      <p style={{ margin: 0, fontSize: 'var(--text-tag)', lineHeight: '24px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
        Demo only — no real call is made.
      </p>
    </div>
  );
}
