import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LockedSwitch, PageHeader } from '../components';

// F4 · Who can see my information (design/Privacy.dc.html), from Calendar (More) and My report.
// The design's wording is adapted to what this app really shares: the nurse call is simulated
// (nothing is sent to a nurse), family always get alerts, status and medicines, and Ask AI gets
// the question plus a few of today's numbers (see docs/safety.md).
export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <PageHeader back={{ to: '/more', label: 'Back' }} />
      <h1 style={{ margin: 0, fontSize: 38, lineHeight: '44px', fontWeight: 700, letterSpacing: '-0.02em' }}>Who can see my information</h1>

      <Who color="var(--color-blue)" title="Me" icon={<><circle cx={12} cy={8} r={5} /><path d="M20 21a8 8 0 0 0-16 0" /></>}>
        Everything.
      </Who>

      <Who color="#D2EE63" title="My family" icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}>
        <p style={text}>By Telegram: yellow and red alerts, today's status and medicines. Weight, drinks and how you feel only if you choose.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 14, borderTop: '2px solid var(--color-line)' }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>Alerts, status, medicines</span>
            <span style={{ fontSize: 18, lineHeight: '26px', fontWeight: 700, color: '#4A4F49' }}>Always on · for your safety</span>
          </span>
          <LockedSwitch label="Alerts, status and medicines" />
        </div>
        <Link to="/family" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700, color: 'var(--color-blue-ink)' }}>Choose what else my family sees</Link>
      </Who>

      <Who color="var(--color-sky)" title="My doctor" icon={<><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" /><circle cx={20} cy={10} r={2} /></>}>
        Only the report you choose to print or show.
      </Who>

      <Who color="var(--color-iris)" title="Ask AI" icon={<><path d="M12 8V4H8" /><rect width={16} height={12} x={4} y={8} rx={2} /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>}>
        Your question and a few of today's numbers, like your drink limit. Never your name, phone number or medicines.
      </Who>

      <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 14, background: 'var(--color-blue-soft)' }}>
        <svg style={{ flexShrink: 0, color: 'var(--color-blue-ink)' }} width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x={3} y={11} width={18} height={11} rx={2} />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>No one else can see your information.</p>
      </div>

      <Link to="/home" style={{ height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 26, fontWeight: 700 }}>
        I understand
      </Link>
    </div>
  );
}

const text = { margin: 0, fontSize: 21, lineHeight: '30px' } as const;

function Who({ color, title, icon, children }: { color: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span aria-hidden="true" style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: color, color: 'var(--color-ink)' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </span>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{title}</h2>
      </div>
      {typeof children === 'string' ? <p style={text}>{children}</p> : children}
    </section>
  );
}
