import { useEffect, useState } from 'react';

// Salt bowl from design/Meals.dc.html. The red dashed line is the daily limit; the salt
// rises towards it (and a little past it when over).
export function SaltBowl({ usedMg, limitMg }: { usedMg: number; limitMg: number }) {
  const [risen, setRisen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setRisen(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const ratio = limitMg > 0 ? Math.min(usedMg / limitMg, 1.08) : 0;
  // Bowl bottom is y=150, limit line y=82.
  const surface = 150 - ratio * (150 - 82);
  const percent = limitMg > 0 ? Math.round((usedMg / limitMg) * 100) : 0;

  return (
    <svg role="img" aria-label={`Bowl of salt, ${percent} percent of the way to the limit line`} width={136} height={160} viewBox="0 0 140 165" style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <clipPath id="vt-bowl"><path d="M10 75 H130 C130 120 104 150 70 150 C36 150 10 120 10 75 Z" /></clipPath>
        <pattern id="vt-grain" width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={1.5} cy={1.5} r={0.9} fill="#B8B2A4" />
          <circle cx={4.5} cy={4.2} r={0.7} fill="#CFC9BB" />
        </pattern>
      </defs>
      <g style={{ opacity: risen ? 1 : 0, transition: 'opacity 300ms ease-out' }}>
        <g transform="rotate(-28 96 28)">
          <rect x={96} y={25} width={44} height={7} rx={3.5} fill="#16201E" />
          <ellipse cx={84} cy={28.5} rx={16} ry={10} fill="#FFFFFF" stroke="#16201E" strokeWidth={3} />
          <ellipse cx={84} cy={27} rx={10} ry={5} fill="url(#vt-grain)" />
        </g>
      </g>
      <path d="M10 75 H130 C130 120 104 150 70 150 C36 150 10 120 10 75 Z" fill="#2B3331" />
      <g clipPath="url(#vt-bowl)">
        <g style={{ transform: risen ? 'translateY(0)' : `translateY(${(150 - surface + 6).toFixed(0)}px)`, transition: 'transform 1300ms cubic-bezier(0.34, 1.12, 0.64, 1) 250ms' }}>
          <rect x={0} y={surface} width={140} height={120} fill="#FFFFFF" />
          <rect x={0} y={surface} width={140} height={120} fill="url(#vt-grain)" />
          <ellipse cx={70} cy={surface} rx={44} ry={5} fill="#FFFFFF" />
        </g>
      </g>
      <path d="M10 75 H130 C130 120 104 150 70 150 C36 150 10 120 10 75 Z" fill="none" stroke="#16201E" strokeWidth={5} strokeLinejoin="round" />
      <rect x={44} y={150} width={52} height={9} rx={4} fill="#16201E" />
      <line x1={2} y1={82} x2={138} y2={82} stroke="#B83A26" strokeWidth={3} strokeDasharray="7 5" />
    </svg>
  );
}
