import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { FluidEntryResponse, MetricsResponse } from '@ventra/core';
import { LoadError, Loading } from '../components/QueryState';
import { WaterBottle } from '../components/WaterBottle';
import { useAddFluid, useDeleteLastFluid, useFluid, useMetrics } from '../lib/api';
import { ml } from '../lib/copy';
import { capOptions, drinkState } from '../lib/drinks';

// C1 · Fluid tracker (design/Fluid.dc.html). Totals come from GET /api/metrics;
// the list is today's raw entries from GET /api/fluid.
export function DrinksTab() {
  const metrics = useMetrics();
  const fluid = useFluid();

  if (metrics.isLoading || fluid.isLoading) return <Loading what="your drinks" />;
  if (metrics.isError || fluid.isError || !metrics.data || !fluid.data) {
    return <LoadError onRetry={() => { metrics.refetch(); fluid.refetch(); }} />;
  }

  const today = fluid.data.entries.filter((entry) => entry.date === metrics.data.today);
  return <DrinksView metrics={metrics.data} todayEntries={today} />;
}

function DrinksView({ metrics, todayEntries }: { metrics: MetricsResponse; todayEntries: FluidEntryResponse[] }) {
  const addFluid = useAddFluid();
  const undoFluid = useDeleteLastFluid();
  const [risen, setRisen] = useState(false);
  const [splash, setSplash] = useState<{ text: string; id: number } | null>(null);
  const [message, setMessage] = useState('');
  const splashTimer = useRef<ReturnType<typeof setTimeout>>();

  // The bottle fills up from empty when the screen opens.
  useEffect(() => {
    const timer = setTimeout(() => setRisen(true), 80);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => () => clearTimeout(splashTimer.current), []);

  const { fluidMl, capMl } = metrics.targets;
  const used = metrics.fluidToday;
  const state = drinkState(used, fluidMl);
  const caps = capOptions(capMl);
  const busy = addFluid.isPending || undoFluid.isPending;

  function addDrink(amount: number) {
    addFluid.mutate({ what: 'Water', ml: amount }, {
      onSuccess: () => {
        setMessage(`Added ${amount} ml.`);
        setSplash({ text: `+${amount} ml`, id: Date.now() });
        clearTimeout(splashTimer.current);
        splashTimer.current = setTimeout(() => setSplash(null), 1450);
      },
      onError: () => setMessage("We couldn't save that drink. Please try again."),
    });
  }

  function undoLast() {
    undoFluid.mutate(undefined, {
      onSuccess: () => setMessage('Last drink removed.'),
      onError: (error) => setMessage(error.message || "We couldn't undo that. Please try again."),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section
        aria-label="Today's drinks"
        style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 'var(--space-6)', borderRadius: 32, background: 'var(--color-sky-soft)' }}
      >
        <WaterBottle percent={risen ? state.percent : 0} splash={splash} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {state.limitSet ? (
            <>
              <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>Left today</span>
              <span style={{ fontSize: 'var(--text-big-number)', lineHeight: 'var(--lh-big-number)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                {ml(state.left)}
              </span>
              <span style={{ fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 600 }}>ml</span>
              <span style={{ fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>
                {ml(used)} of {ml(fluidMl)} ml drunk
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 'var(--text-big-number)', lineHeight: 'var(--lh-big-number)', fontWeight: 600 }}>{ml(used)}</span>
              <span style={{ fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 600 }}>ml today</span>
              <span style={{ fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>
                Your daily limit is not set yet. Ask your care team.
              </span>
            </>
          )}
        </div>
      </section>

      {state.near && (
        <Banner tone="near">Almost at your limit. Small sips for the rest of today.</Banner>
      )}
      {state.over && (
        <Banner tone="over">You've reached today's limit. That's okay — let's slow down on drinks until tomorrow.</Banner>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {caps.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {caps.map((cap) => (
                <button
                  key={cap.label}
                  type="button"
                  disabled={busy}
                  onClick={() => addDrink(cap.ml)}
                  aria-label={`Add ${cap.label}, ${cap.ml} ml`}
                  style={{
                    minHeight: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 14,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface)',
                    border: '3px solid var(--color-ink)',
                    color: 'var(--color-ink)',
                    cursor: busy ? 'wait' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <CupIcon fraction={cap.fraction} />
                  <span style={{ fontSize: 28, lineHeight: '32px', fontWeight: 700 }}>{cap.label}</span>
                  <span style={{ fontSize: 18, lineHeight: '22px', color: 'var(--color-ink-muted)' }}>{cap.ml} ml</span>
                </button>
              ))}
            </div>
            <Link to="/cap" style={capLink}>
              <DropIcon />
              <span>1 full cap = {capMl} ml · Change my cap size</span>
            </Link>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
              Your cap size is not set yet, so drinks can't be logged here.
            </p>
            <Link to="/cap" style={capLink}>
              <DropIcon />
              <span>Set my cap size</span>
            </Link>
          </>
        )}
        <p aria-live="polite" role="status" style={{ margin: 0, minHeight: 'var(--lh-body)', fontSize: 'var(--text-caption)', fontWeight: 600 }}>
          {message}
        </p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Today</h2>
          <button
            type="button"
            onClick={undoLast}
            disabled={busy || todayEntries.length === 0}
            style={{
              height: 'var(--touch-min)',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 'var(--radius-pill)',
              border: '2.5px solid var(--color-ink)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              fontSize: 20,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: busy || todayEntries.length === 0 ? 0.5 : 1,
            }}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Undo last
          </button>
        </div>
        {todayEntries.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 0', borderTop: '2px solid var(--color-line)', fontSize: 'var(--text-body)', color: 'var(--color-ink-muted)' }}>
            No drinks logged yet today.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {todayEntries.map((entry) => (
              <li key={entry.id} style={{ minHeight: 'var(--touch-min)', display: 'flex', alignItems: 'center', gap: 14, borderTop: '2px solid var(--color-line)' }}>
                <span style={{ width: 92, fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)' }}>{entry.time}</span>
                <span style={{ flex: 1, fontSize: 'var(--text-body)', fontWeight: 600 }}>{entry.what}</span>
                <span style={{ fontSize: 'var(--text-body)', fontWeight: 700 }}>{entry.ml} ml</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'near' | 'over'; children: string }) {
  const near = tone === 'near';
  const ink = near ? 'var(--color-yellow-ink)' : 'var(--color-green)';
  return (
    <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 14, background: near ? 'var(--color-yellow-soft)' : 'var(--color-green-soft)', border: `3px solid ${ink}` }}>
      <svg style={{ flexShrink: 0, color: ink }} width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {near ? (
          <>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </>
        ) : (
          <>
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </>
        )}
      </svg>
      <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>{children}</p>
    </div>
  );
}

function CupIcon({ fraction }: { fraction: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ width: 62, height: 9, borderRadius: '5px 5px 0 0', background: 'var(--color-ink)' }} />
      <span style={{ position: 'relative', width: 52, height: 46, border: '4px solid var(--color-ink)', borderTop: 0, borderRadius: '0 0 14px 14px', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fraction * 100}%`, background: 'var(--color-water)' }} />
      </span>
    </span>
  );
}

// "1 full cap = 150 ml · Change my cap size" (design/Fluid.dc.html) → /cap
const capLink: CSSProperties = {
  minHeight: 'var(--touch-min)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  color: 'var(--color-blue-ink)',
  fontSize: 21,
  lineHeight: '28px',
  fontWeight: 700,
};

function DropIcon() {
  return (
    <svg style={{ flexShrink: 0 }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}
