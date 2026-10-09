import { useState } from 'react';
import { MealCard } from '../components/MealCard';
import { LoadError, Loading } from '../components/QueryState';
import { SaltBowl } from '../components/SaltBowl';
import { useDeleteLastMeal, useMeals, useMetrics } from '../lib/api';
import { ml as num } from '../lib/copy';

// C3 · Meals (design/Meals.dc.html): today's salt and today's meals. Salt totals come from
// GET /api/metrics. The "What did you eat?" food list was removed, so this tab only shows and
// undoes meals already logged (POST /api/meals still exists for a future way to log them).
export function MealsTab() {
  const metrics = useMetrics();
  const meals = useMeals();
  const undoMeal = useDeleteLastMeal();
  const [message, setMessage] = useState('');

  if (metrics.isLoading || meals.isLoading) return <Loading what="your meals" />;
  if (metrics.isError || meals.isError || !metrics.data || !meals.data) {
    return <LoadError onRetry={() => { metrics.refetch(); meals.refetch(); }} />;
  }

  const limit = metrics.data.targets.sodiumMg;
  const used = metrics.data.sodiumToday;
  const entries = meals.data.entries;
  const busy = undoMeal.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section aria-label="Today's salt" style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 'var(--space-6)', borderRadius: 32, background: 'var(--color-yellow-soft)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SaltBowl usedMg={used} limitMg={limit} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-tag)', lineHeight: '22px', fontWeight: 700 }}>
            <svg width={22} height={4} viewBox="0 0 22 4" aria-hidden="true"><line x1={0} y1={2} x2={22} y2={2} stroke="#B83A26" strokeWidth={3} strokeDasharray="6 4" /></svg>
            Limit line
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {limit > 0 ? (
            <>
              <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>Left today</span>
              <span style={{ fontSize: 'var(--text-big-number)', lineHeight: 'var(--lh-big-number)', fontWeight: 600, letterSpacing: '-0.02em' }}>{num(Math.max(limit - used, 0))}</span>
              <span style={{ fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 600 }}>mg salt</span>
              <span style={{ fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>{num(used)} of {num(limit)} mg eaten</span>
            </>
          ) : (
            <span style={{ fontSize: 20, lineHeight: '28px' }}>Your salt limit is not set yet. Ask your care team.</span>
          )}
        </div>
      </section>

      {/* Today: one expandable card per meal, newest first (design: "Meals you scanned today"). */}
      <section aria-label="Today's food log" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>Today</h2>
          <button
            type="button"
            disabled={busy || entries.length === 0}
            onClick={() => undoMeal.mutate(undefined, {
              onSuccess: () => setMessage('Last meal removed.'),
              onError: (error) => setMessage(error.message || "We couldn't undo that."),
            })}
            style={{ height: 'var(--touch-min)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer', opacity: busy || entries.length === 0 ? 0.5 : 1 }}
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Undo last
          </button>
        </div>
        {entries.length === 0 ? (
          <p style={{ margin: 0, padding: 18, borderRadius: 24, background: 'var(--color-surface)', fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)', color: 'var(--color-ink-muted)' }}>No meals logged yet today.</p>
        ) : (
          entries.map((meal) => <MealCard key={meal.id} meal={meal} limitMg={limit} />)
        )}
        <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 'var(--lh-body)', fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)', fontWeight: 600 }}>{message}</p>
      </section>
    </div>
  );
}
