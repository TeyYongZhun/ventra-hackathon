// Home grid illustrations, copied from design/Main.dc.html.
const line = {
  fill: 'none',
  stroke: '#16201E',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function DrinksIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <path d="M11 7h26l-3.2 35H14.2Z" fill="#FFFFFF" />
      <path d="M12.5 21h23l-1.9 21H14.4Z" fill="#4F8FD6" stroke="none" />
      <path d="M11 7h26l-3.2 35H14.2Z" />
      <path d="M12.5 21h23" />
      <circle cx={20} cy={30} r={1.8} fill="#FFFFFF" stroke="none" />
      <circle cx={27} cy={35} r={1.4} fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

export function WeightIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <rect x={7} y={9} width={34} height={32} rx={8} fill="#F5B544" />
      <rect x={14} y={14} width={20} height={11} rx={4} fill="#FFFFFF" />
      <path d="M24 23l3.5-6" stroke="#B83A26" />
      <path d="M15 34h5M28 34h5" strokeWidth={3} />
    </svg>
  );
}

export function MedicineIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <rect x={6} y={8} width={21} height={7} rx={2} fill="#FFFFFF" />
      <rect x={8} y={15} width={17} height={27} rx={3} fill="#F2785C" />
      <rect x={11} y={22} width={11} height={10} rx={1.5} fill="#FFFFFF" />
      <g transform="rotate(35 36 29)">
        <rect x={31} y={16} width={10} height={26} rx={5} fill="#FFFFFF" />
        <path d="M31 29h10v8a5 5 0 0 1-10 0Z" fill="#1F6FB2" />
        <rect x={31} y={16} width={10} height={26} rx={5} />
      </g>
    </svg>
  );
}

export function MealsIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <path d="M31 4 23 19M38 6l-9 13" stroke="#8A5B00" strokeWidth={3} />
      <path d="M9 23c2-7 28-7 30 0Z" fill="#FFFFFF" />
      <path d="M6 23h36c0 10-8 18-18 18S6 33 6 23Z" fill="#4CC27E" />
      <path d="M14 30h20" stroke="#FFFFFF" strokeWidth={2} />
    </svg>
  );
}

export function FeelIcon() {
  return (
    <svg width={66} height={66} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <path d="M24 42 8.6 27.2C3.4 22 4.6 12.6 11.8 10.4c4.8-1.5 9.3.6 12.2 4.6 2.9-4 7.4-6.1 12.2-4.6 7.2 2.2 8.4 11.6 3.2 16.8Z" fill="#F2785C" />
      <path d="M16 22.5q2.5-3 5 0M27 22.5q2.5-3 5 0" strokeWidth={2.4} />
      <path d="M18.5 28.5q5.5 5.5 11 0" fill="#FFFFFF" strokeWidth={2.4} />
      <circle cx={14} cy={28} r={2.4} fill="#FBD5CA" stroke="none" />
      <circle cx={34} cy={28} r={2.4} fill="#FBD5CA" stroke="none" />
      <path d="M12.5 15.5q2-2.5 5-3" stroke="#FFFFFF" strokeWidth={2} opacity={0.7} />
    </svg>
  );
}

export function AskAiIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 128 128" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <path d="M64 26V14" stroke="#4A4FC2" strokeWidth={7} strokeLinecap="round" />
      <circle cx={64} cy={12} r={8} fill="#F2785C" />
      <rect x={6} y={56} width={16} height={30} rx={8} fill="#8D93F6" stroke="#16201E" strokeWidth={5} />
      <rect x={106} y={56} width={16} height={30} rx={8} fill="#8D93F6" stroke="#16201E" strokeWidth={5} />
      <rect x={16} y={26} width={96} height={90} rx={36} fill="#FFFFFF" stroke="#16201E" strokeWidth={6} />
      <rect x={28} y={46} width={72} height={52} rx={26} fill="#16201E" />
      <ellipse cx={49} cy={68} rx={9} ry={11} fill="#7CC7FE" />
      <ellipse cx={79} cy={68} rx={9} ry={11} fill="#7CC7FE" />
      <path d="M54 84q10 8 20 0" fill="none" stroke="#7CC7FE" strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon({ day, num }: { day: string; num: string }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 15, lineHeight: '18px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-red)' }}>{day}</span>
      <span style={{ fontSize: 44, lineHeight: '46px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--color-ink)' }}>{num}</span>
    </span>
  );
}

export function VisitPrepIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <path d="M13 6v12a11 11 0 0 0 22 0V6" />
      <path d="M10 6h6M32 6h6" strokeWidth={3.5} />
      <path d="M24 29v5a7 7 0 0 0 14 0v-3" />
      <circle cx={38} cy={27} r={5} fill="#2BA39A" />
      <circle cx={38} cy={27} r={1.6} fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

export function ReportIcon() {
  return (
    <svg width={62} height={62} viewBox="0 0 48 48" {...line} aria-hidden="true">
      <path d="M30 5H12a3 3 0 0 0-3 3v32a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V14Z" fill="#FFFFFF" />
      <path d="M30 5v9h9" />
      <rect x={14} y={28} width={5} height={10} fill="#1F6FB2" stroke="none" />
      <rect x={21.5} y={22} width={5} height={16} fill="#F2785C" stroke="none" />
      <rect x={29} y={31} width={5} height={7} fill="#4CC27E" stroke="none" />
      <path d="M13 39h22" />
      <path d="M14 12h10" strokeWidth={2} />
    </svg>
  );
}
