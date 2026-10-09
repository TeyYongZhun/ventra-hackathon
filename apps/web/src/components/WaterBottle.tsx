// Bottle from design/Fluid.dc.html. The top of the bottle is the daily limit line.
interface WaterBottleProps {
  // 0–100: how full, where 100 means the limit is reached
  percent: number;
  // e.g. { text: '+150 ml', id }: shown briefly after a drink is logged; a new id replays it
  splash?: { text: string; id: number } | null;
}

export function WaterBottle({ percent, splash }: WaterBottleProps) {
  const height = Math.max(0, Math.min(percent, 100));

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: 56, height: 18, borderRadius: '8px 8px 0 0', background: 'var(--color-ink)' }} />
      <div
        style={{
          position: 'relative',
          width: 120,
          height: 250,
          border: '5px solid var(--color-ink)',
          borderRadius: '22px 22px 30px 30px',
          background: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="bottle-fill"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${height}%`,
            background: 'var(--color-water)',
            transition: 'height 1100ms cubic-bezier(0.34, 1.32, 0.64, 1)',
          }}
        >
          <svg aria-hidden="true" width={220} height={14} viewBox="0 0 240 16" preserveAspectRatio="none"
            style={{ position: 'absolute', left: 0, top: -9, display: 'block', opacity: 0.45, animation: 'vt-wave 4.2s linear infinite reverse' }}>
            <path d="M0 8 Q15 0 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0Z" fill="#4F8FD6" />
          </svg>
          <svg aria-hidden="true" width={220} height={12} viewBox="0 0 240 16" preserveAspectRatio="none"
            style={{ position: 'absolute', left: 0, top: -7, display: 'block', animation: 'vt-wave 2.6s linear infinite' }}>
            <path d="M0 8 Q15 2 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0Z" fill="#4F8FD6" />
          </svg>
          <span aria-hidden="true" style={{ position: 'absolute', left: 18, top: 18, width: 10, height: 46, borderRadius: 999, background: 'rgba(255,255,255,0.28)' }} />
        </div>
        {splash && (
          <span
            key={splash.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: 6,
              width: 14,
              height: 18,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: 'var(--color-water)',
              animation: 'vt-drop 600ms ease-in forwards',
            }}
          />
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: '4px dashed var(--color-ink)' }} />
      </div>
      <span style={{ marginTop: 8, fontSize: 'var(--text-tag)', lineHeight: 'var(--lh-tag)', fontWeight: 700 }}>Limit line</span>
      {splash && (
        <span
          key={splash.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: 92,
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-ink)',
            color: 'var(--color-surface)',
            fontSize: 20,
            lineHeight: '24px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            animation: 'vt-pop 1.4s ease-out forwards',
          }}
        >
          {splash.text}
        </span>
      )}
    </div>
  );
}
