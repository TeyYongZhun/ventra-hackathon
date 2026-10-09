import { dayHeading } from '../lib/copy';

// Line chart scaled to the data, the dry weight and the line 2 kg above it.
export function WeightChart({ points, dryKg, alertGainKg }: { points: Array<{ date: string; kg: number }>; dryKg: number; alertGainKg: number }) {
  if (points.length < 2) {
    return <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>Weigh yourself for a few mornings to see your chart.</p>;
  }

  const width = 310;
  const height = 190;
  const watch = dryKg > 0 ? dryKg + alertGainKg : null;
  const values = points.map((point) => point.kg);
  const lo = Math.min(...values, dryKg > 0 ? dryKg : Infinity) - 0.5;
  const hi = Math.max(...values, watch ?? -Infinity) + 0.5;
  const y = (kg: number) => 10 + ((hi - kg) / (hi - lo)) * (height - 20);
  const x = (index: number) => 15 + (index * (width - 30)) / (points.length - 1);
  const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.kg).toFixed(1)}`).join(' ');
  const last = points[points.length - 1]!;
  const label = `Weight from ${dayHeading(points[0]!.date)} (${points[0]!.kg.toFixed(1)} kg) to ${dayHeading(last.date)} (${last.kg.toFixed(1)} kg)`;

  return (
    <>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: 'block' }}>
        {watch != null && (
          <>
            <rect x={0} y={10} width={width} height={Math.max(y(watch) - 10, 0)} fill="#FDF2D8" />
            <line x1={0} y1={y(watch)} x2={width} y2={y(watch)} stroke="#8A5B00" strokeWidth={3} strokeDasharray="8 6" />
          </>
        )}
        {dryKg > 0 && <line x1={0} y1={y(dryKg)} x2={width} y2={y(dryKg)} stroke="#8C877B" strokeWidth={2} strokeDasharray="4 6" />}
        <polyline points={line} fill="none" stroke="#1F6FB2" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(last.kg)} r={9} fill="#1F6FB2" stroke="#FFFFFF" strokeWidth={3} />
      </svg>
      {dryKg > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 19, lineHeight: '26px' }}>
          {watch != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span aria-hidden="true" style={{ width: 32, height: 0, flexShrink: 0, borderTop: '4px dashed #8A5B00' }} />
              <span><strong>{kgLabel(watch)}</strong> — call the nurse above this</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 32, height: 0, flexShrink: 0, borderTop: '3px dashed #8C877B' }} />
            <span>{kgLabel(dryKg)} — my dry weight</span>
          </div>
        </div>
      )}
    </>
  );
}

// "60 kg", "58.5 kg" (design legend drops a trailing .0).
function kgLabel(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}
