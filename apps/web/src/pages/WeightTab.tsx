import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MetricsResponse } from '@ventra/core';
import { LoadError, Loading } from '../components/QueryState';
import { WeightChart } from '../components/WeightChart';
import { useMe, useMetrics } from '../lib/api';
import { ml as num } from '../lib/copy';

// C2 · Weight & targets (design/Weight.dc.html). All numbers from GET /api/metrics.
// "Scale connected" shows for the demo patient only: a placeholder for the Bluetooth scale,
// which is not built yet. The reminder switch is left out (no reminders exist yet).
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
  const days = targets.alertDays || 3;
  const isDemo = useMe().data?.is_demo === true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {isDemo && (
        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-pill)', background: 'var(--color-green-soft)' }}>
          <svg style={{ color: 'var(--color-green)' }} width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m7 7 10 10-5 5V2l5 5L7 17" />
          </svg>
          <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700, color: 'var(--color-green)' }}>Scale connected</span>
        </div>
      )}

      <section aria-label="Today's weight" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 24, borderRadius: 32, background: 'var(--color-yellow)' }}>
        <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>{metrics.weighTimeToday ? `Today at ${metrics.weighTimeToday}` : 'Today'}</span>
        {weightToday != null ? (
          <>
            <span style={{ fontSize: 72, lineHeight: '74px', fontWeight: 600, letterSpacing: '-0.03em' }}>
              {weightToday.toFixed(1)}<span style={{ fontSize: 32, letterSpacing: 0 }}> kg</span>
            </span>
            <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-pill)', background: goingUp ? 'var(--color-yellow-ink)' : 'var(--color-green)', color: 'var(--color-surface)', fontSize: 20, fontWeight: 700 }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {goingUp ? <><path d="M12 9v4" /><path d="M12 17h.01" /></> : <path d="M20 6 9 17l-5-5" />}
              </svg>
              {goingUp ? 'Going up — call your nurse today' : 'Steady — all good'}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Not weighed yet today</span>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', padding: '8px 22px', borderRadius: 24, background: 'var(--color-surface)' }}>
        {[
          ['Since yesterday', signed(metrics.weightChange1)],
          [`Last ${days} days`, signed(metrics.weightChange)],
          ['My dry weight', targets.dryKg ? `${targets.dryKg.toFixed(1)} kg` : '—'],
        ].map(([label, value], i) => (
          <div key={label} style={{ minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 22, borderTop: i > 0 ? '2px solid var(--color-line)' : undefined }}>
            <span>{label}</span>
            <span style={{ fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22, borderRadius: 24, background: 'var(--color-surface)' }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>My weight over time</h2>
        <div role="radiogroup" aria-label="Time range" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--color-sunken)' }}>
          {(['week', 'all'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={range === value}
              onClick={() => setRange(value)}
              style={{ height: 60, borderRadius: 'var(--radius-pill)', border: 0, background: range === value ? 'var(--color-blue)' : 'transparent', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 21, fontWeight: 700, cursor: 'pointer' }}
            >
              {value === 'week' ? '7 days' : 'Since hospital'}
            </button>
          ))}
        </div>
        <WeightChart points={range === 'week' ? metrics.weightHistory.slice(-7) : metrics.weightHistory} dryKg={targets.dryKg} alertGainKg={targets.alertGainKg} />
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link to="/weigh/how" style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 24, fontWeight: 700 }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x={3} y={3} width={18} height={18} rx={4} />
            <path d="M7.5 10a6 6 0 0 1 9 0" />
            <path d="m12 10 1.6-2.2" />
          </svg>
          Weigh myself now
        </Link>
        <Link to="/weigh" style={{ height: 76, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 24, fontWeight: 700 }}>
          Type my weight
        </Link>
        <p style={{ margin: 0, fontSize: 19, lineHeight: '27px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
          Any bathroom scale works — just type the number.
        </p>
      </div>

      <section aria-label="My targets" style={{ display: 'flex', flexDirection: 'column', padding: '8px 22px', borderRadius: 24, background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0 10px' }}>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>My targets</h2>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--color-sunken)', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x={3} y={11} width={18} height={11} rx={2} />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Set by doctor
          </span>
        </div>
        {targets.dryKg > 0 ? (
          <>
            <Target label="Healthy weight" value={`${targets.dryKg.toFixed(1)} kg`} note="Your weight without extra fluid. Doctors call this “dry weight”." />
            <Target label="Water a day" value={`${num(targets.fluidMl)} ml`} />
            <Target label="Salt a day" value={`${num(targets.sodiumMg)} mg`} note="About ¾ teaspoon of salt — counting the salt already in food and sauces." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 0', borderTop: '2px solid var(--color-line)' }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>When to call the nurse</span>
              <span style={{ fontSize: 20, lineHeight: '28px' }}>If you gain more than <strong>{targets.alertGainKg} kg in {days} days</strong>.</span>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, padding: '16px 0', borderTop: '2px solid var(--color-line)', fontSize: 20, lineHeight: '28px' }}>Your care team has not set your targets yet.</p>
        )}
      </section>
    </div>
  );
}

function Target({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 0', borderTop: '2px solid var(--color-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 22 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span>
      </div>
      {note && <span style={{ fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>{note}</span>}
    </div>
  );
}
