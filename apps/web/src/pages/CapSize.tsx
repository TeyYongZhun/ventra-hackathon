import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useMetrics, useSaveCap } from '../lib/api';

// Change my cap size (design/CapSize.dc.html). Opened from the Drinks tab; saves through
// the same endpoint as set-up, then goes back to Drinks.
const SIZES = [100, 150, 200];
// Same range the API accepts.
const MIN_ML = 20;
const MAX_ML = 1000;
const DRINKS = '/track?tab=drinks';

// Opened from Drinks, or from My details (?from=settings): Back and Save return there.
function useReturn() {
  const [params] = useSearchParams();
  return params.get('from') === 'settings'
    ? { to: '/settings', label: 'Back to my details', state: { saved: 'Your cap size' } }
    : { to: DRINKS, label: 'Back to drinks', state: undefined };
}

export default function CapSize() {
  const metrics = useMetrics();
  const back = useReturn();
  const header = <PageHeader back={{ to: back.to, label: back.label }} />;
  if (metrics.isLoading) return <Loading what="your cap size" header={header} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} header={header} />;
  return <CapSizeForm current={metrics.data.targets.capMl} header={header} />;
}

function CapSizeForm({ current, header }: { current: number; header: ReactNode }) {
  const back = useReturn();
  const navigate = useNavigate();
  const save = useSaveCap();
  // 0 means not set yet.
  const start = current > 0 ? current : 150;
  const [picked, setPicked] = useState(SIZES.includes(start) ? start : 150);
  const [other, setOther] = useState(!SIZES.includes(start));
  const [custom, setCustom] = useState(SIZES.includes(start) ? 180 : start);
  const capMl = other ? custom : picked;
  const step = (delta: number) => setCustom((v) => Math.min(MAX_ML, Math.max(MIN_ML, v + delta)));

  const options = [
    ...SIZES.map((ml) => ({ label: `${ml} ml`, on: !other && picked === ml, pick: () => { setPicked(ml); setOther(false); } })),
    { label: other ? `Other · ${custom} ml` : 'Other', on: other, pick: () => setOther(true) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>How much does your cap hold?</h1>
        <p style={{ margin: 0, fontSize: 22, lineHeight: '32px' }}>Use the lid of your own thermos. Later you just tap "Full cap" — we count for you.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, minHeight: 230, borderRadius: 32, background: 'var(--color-sky-soft)' }}>
        <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ width: 132, height: 20, borderRadius: '10px 10px 0 0', background: 'var(--color-ink)' }} />
          <span style={{ position: 'relative', width: 112, height: 112, boxSizing: 'border-box', border: '5px solid var(--color-ink)', borderTop: 0, borderRadius: '0 0 28px 28px', background: 'var(--color-surface)', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '82%', background: 'var(--color-water)' }} />
          </span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>1 full cap</span>
          <span aria-live="polite" style={{ fontSize: 60, lineHeight: '64px', fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{capMl}</span>
          <span style={{ fontSize: 24, fontWeight: 600 }}>ml</span>
        </span>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Choose a size</h2>
        <div role="radiogroup" aria-label="Cap size" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {options.map((option) => (
            <button key={option.label} type="button" role="radio" aria-checked={option.on} onClick={option.pick} style={sizeRow(option.on)}>
              <span>{option.label}</span>
              <span aria-hidden="true" style={radioDot(option.on)} />
            </button>
          ))}
        </div>
        {other && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 24, background: 'var(--color-surface)', border: '3px solid var(--color-blue-ink)' }}>
            <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>Set your cap size</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" aria-label="10 ml less" onClick={() => step(-10)} style={{ ...roundButton, width: 72, height: 72, cursor: 'pointer' }}>
                <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
              </button>
              <span style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 44, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.02em' }}>{custom}</span>
                <span style={{ fontSize: 22, fontWeight: 600 }}>ml</span>
              </span>
              <button type="button" aria-label="10 ml more" onClick={() => step(10)} style={{ ...roundButton, width: 72, height: 72, border: 0, background: 'var(--color-blue)', cursor: 'pointer' }}>
                <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              </button>
            </div>
            <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>Each tap changes it by 10 ml.</span>
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 14, background: 'var(--color-surface)' }}>
        <svg style={{ flexShrink: 0, color: 'var(--color-blue-ink)' }} width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx={12} cy={12} r={10} />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>Not sure? Pour one full cap into a measuring jug and check the number.</p>
      </div>

      {save.isError && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>
          Could not save your cap size. Please try again.
        </p>
      )}
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate({ capMl }, { onSuccess: () => navigate(back.to, { state: back.state }) })}
        style={{ minHeight: 76, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-blue)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: save.isPending ? 'wait' : 'pointer', opacity: save.isPending ? 0.6 : 1 }}
      >
        Save cap size
      </button>
    </div>
  );
}

const roundButton: CSSProperties = {
  width: 64,
  height: 64,
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  border: '2.5px solid var(--color-ink)',
};

function sizeRow(on: boolean): CSSProperties {
  return {
    minHeight: 76,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px 0 26px',
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'inherit',
    fontSize: 26,
    fontWeight: 700,
    background: on ? 'var(--color-blue)' : 'var(--color-surface)',
    color: 'var(--color-ink)',
    border: on ? '3px solid var(--color-ink)' : '2.5px solid var(--color-ink)',
    cursor: 'pointer',
  };
}

function radioDot(on: boolean): CSSProperties {
  return {
    width: 36,
    height: 36,
    flexShrink: 0,
    boxSizing: 'border-box',
    borderRadius: 'var(--radius-pill)',
    border: on ? '10px solid var(--color-surface)' : '3px solid var(--color-ink)',
    background: on ? 'var(--color-ink)' : 'var(--color-surface)',
  };
}
