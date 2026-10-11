import { ml as num } from '../lib/copy';

// Shown under the Drinks bottle or the salt bowl when the limit was lowered today below what was
// already drunk or eaten: today still counts against the old limit (no yellow day), and the new
// limit starts tomorrow.
export function LimitChangedNote({ what, from, to, unit }: { what: 'drink' | 'salt'; from: number; to: number; unit: 'ml' | 'mg' }) {
  return (
    <div role="status" style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--color-blue-soft)', border: '3px solid var(--color-blue-ink)' }}>
      <svg style={{ flexShrink: 0, color: 'var(--color-blue-ink)' }} width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx={12} cy={12} r={10} />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontSize: 21, lineHeight: '29px', fontWeight: 700 }}>
          Your {what} limit was just changed to {num(to)} {unit}.
        </p>
        <p style={{ margin: 0, fontSize: 19, lineHeight: '27px' }}>
          Today still counts with the old limit ({num(from)} {unit}). Please keep to {num(to)} {unit} from tomorrow.
        </p>
      </div>
    </div>
  );
}
