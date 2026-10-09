import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAddWeight, useMetrics } from '../lib/api';

// C2b · Type my weight (design/WeighEnter.dc.html). Big keypad, then POST /api/weight.
// The alert rules run on the server; if today turns yellow we go to the alert screen.
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export default function WeighEnter() {
  const metrics = useMetrics();
  const save = useAddWeight();
  const navigate = useNavigate();
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState('');

  const history = metrics.data?.weightHistory ?? [];
  const today = metrics.data?.today;
  const previous = [...history].reverse().find((point) => point.date !== today);
  const gainKg = metrics.data?.targets.alertGainKg || 2;
  const value = Number.parseFloat(buffer);
  const valid = !Number.isNaN(value) && value >= 20 && value <= 250;
  const bigJump = valid && previous != null && Math.abs(value - previous.kg) >= gainKg;

  function press(key: string) {
    setError('');
    setBuffer((current) => {
      if (key === 'del') return current.slice(0, -1);
      if (key === '.') return current.includes('.') || !current ? current : `${current}.`;
      const dot = current.indexOf('.');
      if (dot >= 0 && current.length - dot > 1) return current; // one decimal place
      if (dot < 0 && current.length >= 3) return current;
      return current + key;
    });
  }

  function submit() {
    save.mutate({ weightKg: value }, {
      onSuccess: async () => {
        const fresh = await metrics.refetch();
        const weightAlert = fresh.data?.reasons.some((reason) => reason.key === 'weight');
        navigate(weightAlert ? '/alert' : '/track?tab=weight');
      },
      onError: () => setError("We couldn't save your weight. Please try again."),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          to="/track?tab=weight"
          aria-label="Back"
          style={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-ink)', border: '2.5px solid var(--color-ink)' }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>What does the scale say?</h1>
      </header>

      <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', border: '3px solid var(--color-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 76, lineHeight: '84px', fontWeight: 700, letterSpacing: '-0.03em', color: buffer ? 'var(--color-ink)' : '#8C877B' }}>{buffer || '—'}</span>
          <span style={{ fontSize: 30, fontWeight: 700 }}>kg</span>
        </div>
        {previous && <span style={{ fontSize: 20, color: 'var(--color-ink-muted)' }}>Last time: {previous.kg.toFixed(1)} kg</span>}
      </section>

      {bigJump && (
        <div role="alert" style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 14, background: 'var(--color-yellow-soft)', border: '3px solid var(--color-yellow-ink)' }}>
          <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>
            That's {gainKg} kg or more away from last time. Please check the number, then save.
          </p>
        </div>
      )}

      <div role="group" aria-label="Number keypad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === 'del' ? 'Delete' : key === '.' ? 'Decimal point' : key}
            style={{ minHeight: 76, borderRadius: 'var(--radius-md)', border: '2.5px solid var(--color-ink)', background: key === 'del' ? 'var(--color-sunken)' : 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 34, fontWeight: 700, cursor: 'pointer' }}
          >
            {key === 'del' ? '⌫' : key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!valid || save.isPending}
        style={{ minHeight: 'var(--touch-button)', borderRadius: 'var(--radius-pill)', border: 0, background: valid ? 'var(--color-ink)' : 'var(--color-sunken)', color: valid ? 'var(--color-surface)' : 'var(--color-ink-muted)', fontFamily: 'inherit', fontSize: 'var(--text-title)', fontWeight: 700, cursor: valid ? 'pointer' : 'default' }}
      >
        {save.isPending ? 'Saving…' : valid ? 'Save my weight' : 'Type your weight first'}
      </button>
      {error && <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}
