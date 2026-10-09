import type { CSSProperties, ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { AlertsLatestResponse, MetricsResponse } from '@ventra/core';
import { SOSSlot } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useLatestAlert, useMetrics } from '../lib/api';
import { alertSentence } from '../lib/copy';

// S1–S3 · What each colour means (design/StatusGreen|Yellow|Red.dc.html).
// The patient's own zone still comes from the core rules; this page only explains.
// "TODAY" / "RIGHT NOW" is shown only for the zone the patient is actually in.
type Colour = 'green' | 'yellow' | 'red';
const COLOURS: Colour[] = ['green', 'yellow', 'red'];

export default function Status() {
  const { colour } = useParams();
  const metrics = useMetrics();
  const alert = useLatestAlert();

  if (!COLOURS.includes(colour as Colour)) return <Navigate to="/status/green" replace />;
  if (metrics.isLoading || alert.isLoading) return <Loading what="your status" />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => { metrics.refetch(); alert.refetch(); }} />;

  return <StatusView colour={colour as Colour} metrics={metrics.data} alert={alert.data} />;
}

function StatusView({ colour, metrics, alert }: { colour: Colour; metrics: MetricsResponse; alert?: AlertsLatestResponse }) {
  const current = metrics.zone === colour;
  const family = alert?.family.name ? alert.family : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/home" aria-label="Back to home" style={backButton}>
          <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 style={{ flex: 1, margin: 0, fontSize: 36, lineHeight: '42px', fontWeight: 700, letterSpacing: '-0.02em' }}>My status</h1>
        <SOSSlot />
      </header>

      {colour === 'green' && (
        <>
          <Hero colour="green" label={current ? 'TODAY' : 'IF YOU SEE'} name="Green" line="All good" />
          <Card title="What this means">
            <p style={bodyText}>Your weight, drinks and medicine are on track. Your heart is doing well{current ? ' today' : ''}.</p>
          </Card>
          <Steps title="Keep doing this" colour="green" items={['Weigh yourself every morning', 'Take your medicine on time', 'Stay under your drink limit']} />
          <Note colour="green">No one needs to be called{current ? ' today' : ''}.</Note>
          <Link to="/home" style={{ ...pillButton, minHeight: 76, background: 'var(--color-blue)', color: 'var(--color-ink)', fontSize: 24 }}>
            Back to today
          </Link>
        </>
      )}

      {colour === 'yellow' && (
        <>
          <Hero colour="yellow" label={current ? 'TODAY' : 'IF YOU SEE'} name="Yellow" line="Call your nurse today" />
          <Card title="What this means">
            <p style={bodyText}>
              {current && alert?.zone === 'yellow' && alert.reasons.length > 0
                ? `${alertSentence(alert.reasons, alert.date)} `
                : 'Your weight went up, you missed a water pill, you drank too much or you felt unwell. '}
              This can mean extra fluid in your body. It is not an emergency, but your nurse should know today.
            </p>
          </Card>
          <Steps title="What to do now" colour="yellow" items={['Call your heart nurse today', 'Read them what to say — we wrote it for you', 'Rest, and keep taking your medicine']} />
          {family && (
            <Note colour="yellow">
              Your {family.relation} {family.name} {current && alert?.familyTold ? 'has been told.' : 'is told when this happens.'}
            </Note>
          )}
          <Link to="/nurse" style={{ ...pillButton, minHeight: 92, gap: 14, background: 'var(--color-blue)', color: 'var(--color-ink)', fontSize: 28 }}>
            <PhoneIcon size={38} />
            Call heart nurse
          </Link>
          <Link to="/alert" style={{ ...pillButton, minHeight: 76, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontSize: 24 }}>
            What to say to the nurse
          </Link>
        </>
      )}

      {colour === 'red' && (
        <>
          <Hero colour="red" label={current ? 'RIGHT NOW' : 'IF YOU SEE'} name="Red" line="Get help now" />
          <Link
            to="/emergency"
            style={{ ...pillButton, minHeight: 104, gap: 14, background: 'var(--color-red)', color: 'var(--color-surface)', fontSize: 32, boxShadow: '0 0 0 4px var(--color-canvas), 0 0 0 8px var(--color-red)' }}
          >
            <PhoneIcon size={42} />
            Call 995
          </Link>
          <Card title="What this means" red>
            <p style={bodyText}>This could be a heart emergency. You need an ambulance if you:</p>
            <ul style={{ margin: '4px 0 0', paddingLeft: 26, fontSize: 22, lineHeight: '34px', fontWeight: 600 }}>
              <li>cannot breathe</li>
              <li>have chest pain</li>
              <li>feel faint or very dizzy</li>
              <li>are very, very swollen</li>
            </ul>
          </Card>
          <Steps title="While you wait" colour="red" items={['Sit upright', 'Stay where you are', 'Unlock your door if you can']} />
          {family && <Note colour="red">When you call, {family.name} is told straight away.</Note>}
        </>
      )}

      <nav aria-label="What the colours mean" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink-muted)' }}>What do the colours mean?</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {COLOURS.map((c) => (
            <Link key={c} to={`/status/${c}`} replace aria-current={c === colour ? 'page' : undefined} style={{ ...chip, ...(c === colour ? CHIP_ON[c] : CHIP_OFF[c]) }}>
              {LABEL[c]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

const LABEL: Record<Colour, string> = { green: 'Green', yellow: 'Yellow', red: 'Red' };

const CHIP_ON: Record<Colour, CSSProperties> = {
  green: { background: 'var(--color-green)', color: 'var(--color-surface)' },
  yellow: { background: 'var(--color-yellow-ink)', color: 'var(--color-surface)' },
  red: { background: 'var(--color-red)', color: 'var(--color-surface)' },
};

const CHIP_OFF: Record<Colour, CSSProperties> = {
  green: { background: 'var(--color-green-soft)', border: '2.5px solid var(--color-green)', color: 'var(--color-green)' },
  yellow: { background: 'var(--color-yellow)', border: '2.5px solid var(--color-yellow-ink)', color: 'var(--color-ink)' },
  red: { background: 'var(--color-red-soft)', border: '2.5px solid var(--color-red)', color: 'var(--color-red)' },
};

const chip: CSSProperties = {
  height: 64,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-pill)',
  textDecoration: 'none',
  fontSize: 20,
  fontWeight: 700,
};

const backButton: CSSProperties = {
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

const pillButton: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  borderRadius: 'var(--radius-pill)',
  textDecoration: 'none',
  fontWeight: 700,
};

const bodyText: CSSProperties = { margin: 0, fontSize: 22, lineHeight: '32px' };

const HERO: Record<Colour, { bg: string; border?: string; ink: string; nameInk: string; lamp: number; aria: string }> = {
  green: { bg: 'var(--color-green-soft)', border: 'var(--color-green)', ink: 'var(--color-ink)', nameInk: 'var(--color-green)', lamp: 2, aria: 'green' },
  yellow: { bg: 'var(--color-yellow)', border: 'var(--color-yellow-ink)', ink: 'var(--color-ink)', nameInk: 'var(--color-ink)', lamp: 1, aria: 'yellow' },
  red: { bg: 'var(--color-red)', ink: 'var(--color-surface)', nameInk: 'var(--color-surface)', lamp: 0, aria: 'red' },
};

// Traffic light with one lamp on. Each lamp also has its own shape (heart, !, tick),
// so colour is never the only signal.
function Hero({ colour, label, name, line }: { colour: Colour; label: string; name: string; line: string }) {
  const h = HERO[colour];
  const lamps = [
    { on: 'var(--color-lamp-red)', glow: 'rgba(255,90,67,0.45)', icon: (
      <svg width={40} height={40} viewBox="0 0 24 24" fill="var(--color-ink)" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ) },
    { on: 'var(--color-lamp-yellow)', glow: 'rgba(255,194,51,0.4)', icon: (
      <span aria-hidden="true" style={{ fontSize: 46, lineHeight: '46px', fontWeight: 800, color: 'var(--color-ink)' }}>!</span>
    ) },
    { on: 'var(--color-lamp-green)', glow: 'rgba(60,203,127,0.35)', icon: (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth={3.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ) },
  ];

  return (
    <section
      aria-label={`Status: ${h.aria}`}
      style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24, borderRadius: 32, background: h.bg, border: h.border ? `3px solid ${h.border}` : undefined, color: h.ink }}
    >
      <div
        role="img"
        aria-label={`Traffic light: ${h.aria} is on`}
        style={{ width: 104, flexShrink: 0, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRadius: 40, background: 'var(--color-ink)' }}
      >
        {lamps.map((lamp, i) => (
          <span
            key={i}
            style={{
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-pill)',
              background: i === h.lamp ? lamp.on : 'var(--color-lamp-off)',
              boxShadow: i === h.lamp ? `0 0 0 6px ${lamp.glow}` : undefined,
            }}
          >
            {i === h.lamp && lamp.icon}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: h.nameInk }}>{label}</span>
        <span style={{ fontSize: 44, lineHeight: '46px', fontWeight: 700, letterSpacing: '-0.02em', color: h.nameInk }}>{name}</span>
        <span style={{ fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>{line}</span>
      </div>
    </section>
  );
}

function Card({ title, red, children }: { title: string; red?: boolean; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 22, borderRadius: 24, background: 'var(--color-surface)', border: red ? '3px solid var(--color-red)' : undefined }}>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 700, color: red ? 'var(--color-red)' : undefined }}>{title}</h2>
      {children}
    </section>
  );
}

const STEP_DOT: Record<Colour, CSSProperties> = {
  green: { background: 'var(--color-green)', color: 'var(--color-surface)' },
  yellow: { background: 'var(--color-yellow)', border: '2.5px solid var(--color-yellow-ink)', color: 'var(--color-ink)' },
  red: { background: 'var(--color-red)', color: 'var(--color-surface)' },
};

function Steps({ title, colour, items }: { title: string; colour: Colour; items: string[] }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 22, borderRadius: 24, background: 'var(--color-surface)' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>{title}</h2>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 72, borderTop: '2px solid var(--color-line)' }}>
            <span
              aria-hidden="true"
              style={{ width: 48, height: 48, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', fontSize: 24, fontWeight: 700, ...STEP_DOT[colour] }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const NOTE: Record<Colour, { bg: string; icon: string }> = {
  green: { bg: 'var(--color-blue-soft)', icon: 'var(--color-blue-ink)' },
  yellow: { bg: 'var(--color-sky-soft)', icon: 'var(--color-ink)' },
  red: { bg: 'var(--color-red-soft)', icon: 'var(--color-red)' },
};

function Note({ colour, children }: { colour: Colour; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, background: NOTE[colour].bg }}>
      <svg style={{ flexShrink: 0, color: NOTE[colour].icon }} width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx={9} cy={7} r={4} />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>{children}</p>
    </div>
  );
}

function PhoneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
