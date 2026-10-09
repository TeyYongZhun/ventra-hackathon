import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components';
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
  // "Yesterday" as in the design when the last weigh-in was yesterday, else "last time".
  const wasYesterday = previous != null && today != null && previous.date === addDay(today, -1);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader back={{ to: '/track?tab=weight', label: 'Back' }} title="What does the scale say?" titleSize={30} />

      <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 22, borderRadius: 32, background: 'var(--color-surface)', border: '4px solid var(--color-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 76, lineHeight: '84px', fontWeight: 700, letterSpacing: '-0.03em', color: buffer ? 'var(--color-ink)' : '#8C877B' }}>{buffer || '—'}</span>
          <span style={{ fontSize: 32, fontWeight: 700 }}>kg</span>
        </div>
        {previous && <span style={{ fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>{wasYesterday ? 'Yesterday' : 'Last time'}: {previous.kg.toFixed(1)} kg</span>}
      </section>

      {bigJump && (
        <div role="alert" style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 20, background: 'var(--color-yellow-soft)', border: '3px solid var(--color-yellow-ink)' }}>
          <svg style={{ flexShrink: 0, color: 'var(--color-yellow-ink)' }} width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>
            That's {gainKg} kg or more away from {wasYesterday ? 'yesterday' : 'last time'}. Please check the number, then save.
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
            style={{ minHeight: 80, borderRadius: 20, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 36, fontWeight: 700, cursor: 'pointer' }}
          >
            {key === 'del' ? '⌫' : key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!valid || save.isPending}
        style={{ minHeight: 80, borderRadius: 'var(--radius-pill)', border: 0, background: valid ? 'var(--color-blue)' : 'var(--color-sunken)', color: valid ? 'var(--color-ink)' : 'var(--color-ink-muted)', fontFamily: 'inherit', fontSize: valid ? 26 : 24, fontWeight: 700, cursor: valid ? 'pointer' : 'default' }}
      >
        {save.isPending ? 'Saving…' : valid ? 'Save my weight' : 'Type your weight first'}
      </button>
      {error && <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>{error}</p>}
    </div>
  );
}

function addDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
