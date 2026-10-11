import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const LIME = '#D2EE63';

// "Scan a medicine box" card at the top of the medicine screen (design/Medicines.dc.html).
export function ScanBoxCard() {
  return (
    <Link to="/medicine/scan" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, borderRadius: 32, background: '#16201E', color: '#FFFFFF', textDecoration: 'none', boxShadow: '0 12px 28px rgba(22,32,30,0.18)' }}>
      <span aria-hidden="true" style={{ position: 'relative', height: 150, borderRadius: 22, background: '#2E3836', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: '#26302E' }} />
        <span className="scan-anim" style={{ position: 'absolute', left: '50%', top: '50%', width: 96, height: 60, margin: '-32px 0 0 -48px', display: 'flex', borderRadius: 6, background: '#FFFFFF', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.35)', animation: 'scan-hold 3.2s ease-in-out infinite' }}>
          <span style={{ width: 18, flexShrink: 0, background: '#4F8FD6' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '0 9px' }}>
            <span style={{ width: 44, height: 6, borderRadius: 3, background: '#16201E' }} />
            <span style={{ width: 30, height: 5, borderRadius: 3, background: '#8C877B' }} />
            <span style={{ width: 38, height: 10, marginTop: 2, background: 'repeating-linear-gradient(90deg, #16201E 0 2px, #FFFFFF 2px 4px)' }} />
          </span>
        </span>
        <span className="scan-anim" style={{ position: 'absolute', left: '50%', top: '50%', width: 150, height: 100, margin: '-52px 0 0 -75px', color: LIME, animation: 'scan-breathe 1.6s ease-in-out infinite' }}>
          <SmallCorners />
          <span className="scan-anim" style={{ position: 'absolute', left: 12, right: 12, top: 8, height: 3, borderRadius: 2, background: LIME, boxShadow: '0 0 12px 3px rgba(210,238,99,0.6)', ['--scan-travel' as string]: '81px', animation: 'scan-line 1.3s ease-in-out infinite alternate' }} />
        </span>
        <span style={{ position: 'absolute', left: 12, top: 12, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: LIME, color: '#16201E', fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>Quick check</span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.015em' }}>Scan a medicine box</span>
        <span style={{ fontSize: 20, lineHeight: '28px', color: '#D6DAD4' }}>Not sure what a pill is for? Point your camera at the box. We'll explain it simply.</span>
      </span>
      <span style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', background: '#7CC7FE', color: '#16201E', fontSize: 24, fontWeight: 700 }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx={12} cy={13} r={3} />
        </svg>
        Open camera
      </span>
    </Link>
  );
}

function SmallCorners() {
  const corner = (side: 'left' | 'right', end: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute', [side]: 0, [end]: 0, width: 26, height: 26,
    [`border${side === 'left' ? 'Left' : 'Right'}`]: '5px solid currentColor',
    [`border${end === 'top' ? 'Top' : 'Bottom'}`]: '5px solid currentColor',
    borderRadius: side === 'left' ? (end === 'top' ? '10px 0 0 0' : '0 0 0 10px') : (end === 'top' ? '0 10px 0 0' : '0 0 10px 0'),
  });
  return (
    <>
      <span style={corner('left', 'top')} />
      <span style={corner('right', 'top')} />
      <span style={corner('left', 'bottom')} />
      <span style={corner('right', 'bottom')} />
    </>
  );
}
