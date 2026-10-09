import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MetricsResponse } from '@ventra/core';
import { LoadError, Loading } from '../components/QueryState';
import { WeightChart } from '../components/WeightChart';
import { useMetrics } from '../lib/api';
import { ml as num } from '../lib/copy';

// C2 · Weight & targets (design/Weight.dc.html). All numbers from GET /api/metrics.
function signed(value: number | null): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)} kg`;
}

export function WeightTab() {
  const metrics = useMetrics();
  if (metrics.isLoading) return <Loading what="your weight" />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} />;
  return <WeightView metrics={metrics.data} />;
}

function WeightView({ metrics }: { metrics: MetricsResponse }) {
  const [range, setRange] = useState<'week' | 'all'>('week');
  const { targets, weightToday } = metrics;
  const goingUp = metrics.reasons.some((reason) => reason.key === 'weight');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section aria-label="Today's weight" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 'var(--space-6)', borderRadius: 32, background: 'var(--color-butter-soft)', textAlign: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Today</span>
        {weightToday != null ? (
          <>
            <span style={{ fontSize: 64, lineHeight: '68px', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {weightToday.toFixed(1)}<span style={{ fontSize: 28 }}> kg</span>
            </span>
            <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: goingUp ? 'var(--color-yellow)' : 'var(--color-green-soft)', color: goingUp ? 'var(--color-ink)' : 'var(--color-green)', fontSize: 20, fontWeight: 700 }}>
              {goingUp ? 'Going up — call your nurse today' : 'Steady — all good'}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Not weighed yet today</span>
        )}
      </section>

      <Link
        to="/weigh"
        style={{ minHeight: 'var(--touch-button)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 'var(--text-title)', fontWeight: 700 }}
      >
        Type my weight
      </Link>
      <p style={{ margin: '-12px 0 0', fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
        Any bathroom scale works. Weigh after the toilet, before breakfast.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {[
          ['Since yesterday', signed(metrics.weightChange1)],
          [`Last ${targets.alertDays || 3} days`, signed(metrics.weightChange)],
          ['My dry weight', targets.dryKg ? `${targets.dryKg.toFixed(1)} kg` : '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <span style={{ fontSize: 16, lineHeight: '20px', color: 'var(--color-ink-muted)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>My weight over time</h2>
        <div role="radiogroup" aria-label="Time range" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-sunken)' }}>
          {(['week', 'all'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={range === value}
              onClick={() => setRange(value)}
              style={{ height: 56, borderRadius: 'var(--radius-pill)', border: 0, background: range === value ? 'var(--color-blue)' : 'transparent', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
            >
              {value === 'week' ? '7 days' : 'Since hospital'}
            </button>
          ))}
        </div>
        <WeightChart points={range === 'week' ? metrics.weightHistory.slice(-7) : metrics.weightHistory} dryKg={targets.dryKg} alertGainKg={targets.alertGainKg} />
      </section>

      <section aria-label="My targets" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>My targets</h2>
          <span style={{ fontSize: 'var(--text-tag)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>Set by your care team</span>
        </div>
        {targets.dryKg > 0 ? (
          <>
            <Target label="Healthy weight" value={`${targets.dryKg.toFixed(1)} kg`} note="Your weight without extra fluid. Doctors call this “dry weight”." />
            <Target label="Water a day" value={`${num(targets.fluidMl)} ml`} />
            <Target label="Salt a day" value={`${num(targets.sodiumMg)} mg`} note="Counting the salt already in food and sauces." />
            <Target label="When to call the nurse" value={`If you gain ${targets.alertGainKg} kg or more in ${targets.alertDays} days`} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>Your care team has not set your targets yet.</p>
        )}
      </section>
    </div>
  );
}

function Target({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: '2px solid var(--color-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 700, textAlign: 'right' }}>{value}</span>
      </div>
      {note && <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>{note}</span>}
    </div>
  );
}
