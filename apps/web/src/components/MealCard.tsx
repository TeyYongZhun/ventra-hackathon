import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { MealListEntry } from '@ventra/core';
import { ml as num } from '../lib/copy';

// One logged meal on Track → Meals → Today (design/Meals.dc.html, "Meals you scanned today").
// Collapsed: name, meal and time, salt level. Expanded: salt box, then "In this meal" as a
// plate (Visual) or numbers (Detailed). All values are estimates from the food list.
// The design's meal photo is left out: meals are picked from the list, so there is no photo.
type Level = 'high' | 'medium' | 'low';

const TONE: Record<Level, { word: string; short: string; head: string; ink: string; box: string; edge: string; row: string }> = {
  high: { word: 'High salt', short: 'High', head: 'High in salt', ink: 'var(--color-red)', box: 'var(--color-yellow-soft)', edge: 'var(--color-yellow-ink)', row: 'var(--color-red-soft)' },
  medium: { word: 'Some salt', short: 'OK', head: 'Some salt', ink: 'var(--color-yellow-ink)', box: 'var(--color-yellow-soft)', edge: 'var(--color-yellow-ink)', row: 'var(--color-yellow-soft)' },
  low: { word: 'Low salt', short: 'Low', head: 'Low in salt', ink: 'var(--color-green)', box: 'var(--color-green-soft)', edge: 'var(--color-green)', row: 'var(--color-green-soft)' },
};

// Same thresholds as the "What did you eat?" chips.
const level = (mg: number): Level => (mg >= 800 ? 'high' : mg >= 600 ? 'medium' : 'low');
const fraction = (f: number) => ({ 0.125: '⅛', 0.25: '¼', 0.5: '½', 0.75: '¾' } as Record<number, string>)[f] ?? `${Math.round(f * 100)}%`;
// About 2,667 mg of sodium in a teaspoon of salt.
const teaspoons = (mg: number) => { const t = mg / 2667; return t < 0.3 ? '¼' : t < 0.6 ? '½' : t < 0.85 ? '¾' : '1'; };

const SLICE = ['#D2EE63', '#F2785C', '#1F6FB2'];
const SLICE_TEXT = ['#16201E', '#16201E', '#FFFFFF'];

const forkIcon = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

export function MealCard({ meal, limitMg, defaultOpen = false }: { meal: MealListEntry; limitMg: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState<'visual' | 'detailed'>('visual');
  const lv = level(meal.sodiumMg);
  const tone = TONE[lv];
  const mg = `${num(meal.sodiumMg)} mg`;
  const detailsId = `meal-${meal.id}-details`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={detailsId}
        style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 88, padding: '14px 16px', borderRadius: 24, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
      >
        <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: '#E2F59B' }}>{forkIcon(30)}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>{meal.meal} · {meal.time}</span>
          <span style={{ fontSize: 21, lineHeight: '27px', fontWeight: 700 }}>{meal.what}</span>
          <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700, color: tone.ink }}>{tone.word} · {mg}</span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-blue-ink)' }}>
          <span aria-hidden="true" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: open ? 'var(--color-ink)' : 'var(--color-sky-soft)', color: open ? 'var(--color-surface)' : 'var(--color-blue-ink)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease-out' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </span>
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div id={detailsId} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', gap: 14, padding: 20, borderRadius: 24, background: tone.box, border: `3px solid ${tone.edge}`, color: tone.edge }}>
            <svg style={{ flexShrink: 0 }} width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-ink)' }}>
              <p style={{ margin: 0, fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{tone.head} — about {teaspoons(meal.sodiumMg)} teaspoon</p>
              <p style={{ margin: 0, fontSize: 21, lineHeight: '30px' }}>
                {limitMg > 0 ? `That is ${Math.round((meal.sodiumMg / limitMg) * 100)}% of your day. ` : ''}{meal.tip}
              </p>
            </div>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, borderRadius: 24, background: 'var(--color-surface)' }}>
            <h3 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>In this meal</h3>
            <div role="group" aria-label="Show meal info as" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, padding: 5, borderRadius: 'var(--radius-pill)', background: 'var(--color-sunken)' }}>
              <ViewButton on={view === 'visual'} onClick={() => setView('visual')} icon={<><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>}>Visual</ViewButton>
              <ViewButton on={view === 'detailed'} onClick={() => setView('detailed')} icon={<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>}>Detailed</ViewButton>
            </div>
            {view === 'visual' ? <Visual meal={meal} lv={lv} mg={mg} /> : <Detailed meal={meal} lv={lv} mg={mg} />}
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx={12} cy={12} r={10} /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              Estimates only
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function ViewButton({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-pill)', border: 0, fontFamily: 'inherit', fontSize: 20, fontWeight: 700, background: on ? 'var(--color-surface)' : 'transparent', color: 'var(--color-ink)', boxShadow: on ? '0 2px 6px rgba(22,32,30,0.14)' : 'none', cursor: 'pointer' }}
    >
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      {children}
    </button>
  );
}

// Plate chart, drawn in SVG so the slice edges are smooth: carbs, protein, fat clockwise from
// the top, separated by white lines, with each label in the middle of its slice. Whenever this
// view mounts, the pie draws itself clockwise from 12 o'clock like a clock hand, and each
// label fades in once its slice is complete (useSweep).
const PLATE = { c: 125, r: 95 };
const point = (turn: number, r: number) => {
  const a = turn * 2 * Math.PI;
  return { x: PLATE.c + r * Math.sin(a), y: PLATE.c - r * Math.cos(a) };
};

function slicePath(from: number, to: number): string {
  const { c, r } = PLATE;
  if (to - from >= 0.999) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`;
  const a = point(from, r);
  const b = point(to, r);
  return `M ${c} ${c} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

// 0 → 1 over the sweep, eased out. Jumps straight to 1 when motion is reduced or the
// browser has no animation frames (tests).
const SWEEP_MS = 900;
function useSweep(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof window.requestAnimationFrame !== 'function') {
      setProgress(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / SWEEP_MS, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return progress;
}

function Visual({ meal, lv, mg }: { meal: MealListEntry; lv: Level; mg: string }) {
  const tone = TONE[lv];
  const sweep = useSweep();
  let acc = 0;
  const slices = meal.plate.map((f, i) => {
    const from = acc;
    acc += f;
    const mid = point(from + f / 2, f < 0.2 ? 66 : 54);
    // The part of this slice the sweep has reached so far.
    const shown = Math.min(acc, sweep) - from;
    return { i, f, shown, done: sweep >= acc - 0.001, path: shown > 0.001 ? slicePath(from, from + shown) : '', label: fraction(f), x: mid.x, y: mid.y };
  });
  const labels = slices.map((slice) => ({ t: slice.label }));
  const parts = [
    { name: 'Carbs', macro: meal.carbs, color: SLICE[0] },
    { name: 'Protein', macro: meal.protein, color: SLICE[1] },
    { name: 'Fat', macro: meal.fat, color: SLICE[2] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 6 }}>
        <div
          role="img"
          aria-label={`Plate: carbs ${labels[0]?.t}, protein ${labels[1]?.t}, fat ${labels[2]?.t}`}
          style={{ position: 'relative', width: 250, height: 250, flexShrink: 0, borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', boxShadow: '0 10px 24px rgba(22,32,30,0.16), inset 0 0 0 2px #E3DFD6' }}
        >
          <svg width={250} height={250} viewBox="0 0 250 250" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            <circle cx={PLATE.c} cy={PLATE.c} r={111} fill="none" stroke="#ECE9E2" strokeWidth={2} />
            {slices.filter((slice) => slice.path).map((slice) => (
              <path key={slice.i} d={slice.path} fill={SLICE[slice.i]} stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" />
            ))}
            <circle cx={PLATE.c} cy={PLATE.c} r={PLATE.r} fill="none" stroke="rgba(22,32,30,0.08)" strokeWidth={2} />
            {slices.filter((slice) => slice.f > 0).map((slice) => (
              <text key={slice.i} x={slice.x} y={slice.y} textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontSize={slice.f < 0.2 ? 22 : 28} fontWeight={700} fill={SLICE_TEXT[slice.i]} style={{ opacity: slice.done ? 1 : 0, transition: 'opacity 200ms ease-out' }}>
                {slice.label}
              </text>
            ))}
          </svg>
        </div>
        <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>About {num(meal.kcal)} calories</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {parts.map((part, i) => (
          <div key={part.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: part.color, boxShadow: i === 0 ? 'inset 0 0 0 2px rgba(22,32,30,0.15)' : undefined }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 21, lineHeight: '26px', fontWeight: 700 }}>{part.name} · {labels[i]?.t} plate</span>
              <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>{part.macro.what} · {part.macro.g} g</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, background: tone.row }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: tone.ink, color: 'var(--color-surface)' }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 11h8l-1.2 10H9.2z" /><path d="M8 11a4 4 0 0 1 8 0" /><path d="M11 5.5h.01" /><path d="M13 5.5h.01" /><path d="M12 3.5h.01" />
          </svg>
        </span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>Salt</span>
          <span style={{ fontSize: 18, lineHeight: '24px' }}>{mg} · about {teaspoons(meal.sodiumMg)} teaspoon</span>
        </span>
        <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: tone.ink, color: 'var(--color-surface)', fontSize: 18, lineHeight: '24px', fontWeight: 700 }}>{tone.short}</span>
      </div>
    </div>
  );
}

function Detailed({ meal, lv, mg }: { meal: MealListEntry; lv: Level; mg: string }) {
  const tone = TONE[lv];
  const segment = (on: boolean, i: number): CSSProperties => ({
    height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: i === 0 ? '12px 0 0 12px' : i === 2 ? '0 12px 12px 0' : 0,
    fontSize: 18, fontWeight: 700, background: on ? tone.ink : 'var(--color-sunken)', color: on ? 'var(--color-surface)' : 'var(--color-ink-muted)',
  });
  const bar = (value: number, max: number) => (
    <div style={{ height: 20, borderRadius: 'var(--radius-pill)', background: 'var(--color-sunken)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue-ink)' }} />
    </div>
  );
  const heading = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {heading('Salt (sodium)', mg)}
        <div role="img" aria-label={`Salt level: ${tone.short}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <span style={segment(lv === 'low', 0)}>Low</span>
          <span style={segment(lv === 'medium', 1)}>OK</span>
          <span style={segment(lv === 'high', 2)}>High</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {heading('Potassium', `${num(meal.potassiumMg)} mg`)}
        {bar(meal.potassiumMg, 1600)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {heading('Phosphorus', `${num(meal.phosphorusMg)} mg`)}
        {bar(meal.phosphorusMg, 900)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, paddingTop: 6 }}>
        {[['Calories', num(meal.kcal)], ['Protein', `${meal.protein.g} g`], ['Carbs', `${meal.carbs.g} g`], ['Fat', `${meal.fat.g} g`]].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', padding: 14, borderRadius: 14, background: 'var(--color-sunken)' }}>
            <span style={{ fontSize: 18, color: 'var(--color-ink-muted)' }}>{label}</span>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
