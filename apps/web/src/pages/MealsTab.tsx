import { useState } from 'react';
import { FOODS } from '@ventra/core';
import { LoadError, Loading } from '../components/QueryState';
import { SaltBowl } from '../components/SaltBowl';
import { useAddMeal, useDeleteLastMeal, useMeals, useMetrics } from '../lib/api';
import { ml as num } from '../lib/copy';

// C3 · Meals (design/Meals.dc.html), manual food log. Salt totals come from GET /api/metrics.
function saltLevel(mg: number): { word: string; color: string; bg: string } {
  if (mg >= 800) return { word: 'High salt', color: 'var(--color-red)', bg: 'var(--color-red-soft)' };
  if (mg >= 600) return { word: 'Some salt', color: 'var(--color-yellow-ink)', bg: 'var(--color-yellow-soft)' };
  return { word: 'Low salt', color: 'var(--color-green)', bg: 'var(--color-green-soft)' };
}

export function MealsTab() {
  const metrics = useMetrics();
  const meals = useMeals();
  const addMeal = useAddMeal();
  const undoMeal = useDeleteLastMeal();
  const [message, setMessage] = useState('');

  if (metrics.isLoading || meals.isLoading) return <Loading what="your meals" />;
  if (metrics.isError || meals.isError || !metrics.data || !meals.data) {
    return <LoadError onRetry={() => { metrics.refetch(); meals.refetch(); }} />;
  }

  const limit = metrics.data.targets.sodiumMg;
  const used = metrics.data.sodiumToday;
  const entries = meals.data.entries;
  const busy = addMeal.isPending || undoMeal.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section aria-label="Today's salt" style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 'var(--space-6)', borderRadius: 32, background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <SaltBowl usedMg={used} limitMg={limit} />
          <span style={{ fontSize: 'var(--text-tag)', fontWeight: 700, color: 'var(--color-red)' }}>Limit line</span>
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

      <section aria-label="What did you eat?" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>What did you eat?</h2>
        {FOODS.map((food) => {
          const level = saltLevel(food.sodiumMg);
          return (
            <button
              key={food.id}
              type="button"
              disabled={busy}
              onClick={() => addMeal.mutate({ foodId: food.id }, {
                onSuccess: (meal) => setMessage(`${meal.what} logged. ${meal.tip}`),
                onError: () => setMessage("We couldn't save that meal. Please try again."),
              })}
              aria-label={`Add ${food.what}, about ${num(food.sodiumMg)} mg salt`}
              style={{ minHeight: 76, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 'var(--radius-lg)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', textAlign: 'left', cursor: busy ? 'wait' : 'pointer' }}
            >
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>{food.what}</span>
                <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>About {num(food.sodiumMg)} mg salt</span>
              </span>
              <span style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: level.bg, color: level.color, fontSize: 'var(--text-tag)', fontWeight: 700 }}>{level.word}</span>
            </button>
          );
        })}
        <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 'var(--lh-body)', fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)', fontWeight: 600 }}>{message}</p>
        <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>
          Salt amounts are estimates for a usual plate. Your dietitian can tell you more.
        </p>
      </section>

      <section aria-label="Today's food log" style={{ display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Today</h2>
          <button
            type="button"
            disabled={busy || entries.length === 0}
            onClick={() => undoMeal.mutate(undefined, {
              onSuccess: () => setMessage('Last meal removed.'),
              onError: (error) => setMessage(error.message || "We couldn't undo that."),
            })}
            style={{ height: 'var(--touch-min)', padding: '0 20px', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer', opacity: busy || entries.length === 0 ? 0.5 : 1 }}
          >
            Undo last
          </button>
        </div>
        {entries.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 0', borderTop: '2px solid var(--color-line)', fontSize: 'var(--text-body)', color: 'var(--color-ink-muted)' }}>No meals logged yet today.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {entries.map((meal) => (
              <li key={meal.id} style={{ minHeight: 'var(--touch-min)', display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderTop: '2px solid var(--color-line)' }}>
                <span style={{ width: 92, fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)' }}>{meal.time}</span>
                <span style={{ flex: 1, fontSize: 20, lineHeight: '26px', fontWeight: 600 }}>{meal.what}</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{num(meal.sodiumMg)} mg</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
