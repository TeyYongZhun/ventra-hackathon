import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MetricsResponse } from '@ventra/core';
import { PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useDemoReset, useDemoYellowDay, useLogout, useMe, useMetrics } from '../lib/api';

// F1 · Calendar, the "More" tab (design/Calendar.dc.html): this month's days coloured by the
// core rules, the report card, settings links and log out.
// Left out on purpose: the clinic visit cards and "Add a visit" (the app stores no appointments yet).
// Kept from the old More page: "Change my setup" (opens My details, where numbers, medicines,
// cap size, contact and text size and sound are edited) and the demo tools.
const header = <PageHeader title="Calendar" />;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SPARKLE = 'M12 2c.6 4.8 2.4 7.2 10 10-7.6 2.8-9.4 5.2-10 10-.6-4.8-2.4-7.2-10-10 7.6-2.8 9.4-5.2 10-10z';

export default function More() {
  const metrics = useMetrics();
  if (metrics.isLoading) return <Loading what="your calendar" header={header} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} header={header} />;
  return <CalendarView metrics={metrics.data} />;
}

function CalendarView({ metrics }: { metrics: MetricsResponse }) {
  const me = useMe();
  const navigate = useNavigate();
  const logout = useLogout();
  const yellowDay = useDemoYellowDay();
  const reset = useDemoReset();
  const [message, setMessage] = useState('');
  const [askOut, setAskOut] = useState(false);
  const greenThisMonth = metrics.dayZones.filter((day) => day.zone === 'green' && day.date.slice(0, 7) === metrics.today.slice(0, 7)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {header}

      {greenThisMonth > 0 && (
        <section aria-label="This month" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24, background: 'var(--color-green-soft)', border: '3px solid var(--color-green)' }}>
          <span aria-hidden="true" style={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-green)' }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="#D2EE63"><path d={SPARKLE} /></svg>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{greenThisMonth} green day{greenThisMonth === 1 ? '' : 's'} this month</span>
            <span style={{ fontSize: 19, lineHeight: '26px' }}>Days your weight, drinks and medicine were on track.</span>
          </span>
        </section>
      )}

      <Month today={metrics.today} zones={metrics.dayZones} />

      <Link to="/report" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, borderRadius: 32, background: 'var(--color-blue-ink)', color: 'var(--color-surface)', textDecoration: 'none', boxShadow: '0 12px 28px rgba(31,111,178,0.28)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span aria-hidden="true" style={{ position: 'relative', width: 66, height: 80, flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 10px', borderRadius: 10, background: 'var(--color-surface)', boxShadow: '6px 6px 0 #7CC7FE' }}>
            <span style={{ width: 34, height: 6, borderRadius: 3, background: 'var(--color-ink)' }} />
            <span style={{ width: 44, height: 4, borderRadius: 2, background: '#C9CED6' }} />
            <span style={{ width: 38, height: 4, borderRadius: 2, background: '#C9CED6' }} />
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 22, marginTop: 'auto' }}>
              {[[10, '#7CC7FE'], [16, '#1F6FB2'], [13, '#7CC7FE'], [22, '#1F6FB2']].map(([h, c], i) => (
                <span key={i} style={{ width: 8, height: h as number, borderRadius: 2, background: c as string }} />
              ))}
            </span>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-blue-soft)' }}>FOR YOUR DOCTOR</span>
            <span style={{ fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>Summarize my report</span>
          </span>
        </span>
        <span style={{ fontSize: 20, lineHeight: '28px', color: 'var(--color-blue-soft)' }}>One PDF with your weight, medicine, drinks, salt and how you felt.</span>
        <span style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontSize: 23, fontWeight: 700 }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="#1F6FB2" aria-hidden="true"><path d={SPARKLE} /></svg>
          Make my report
        </span>
      </Link>

      <nav aria-label="More" style={{ display: 'flex', flexDirection: 'column', padding: '4px 20px', borderRadius: 24, background: 'var(--color-surface)' }}>
        <Row to="/privacy" label="Who sees my information" first icon={<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />} />
        <Row to="/family" label="My family contacts" icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
        <Row to="/settings" label="Change my setup" icon={<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />
      </nav>

      {me.data?.is_demo && (
        <section aria-label="Demo tools" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-butter-soft)', border: '2.5px dashed var(--color-yellow-ink)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>Demo tools</h2>
          <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>
            Only for the demo patient. Synthetic data is rebuilt; you stay logged in.
          </p>
          <button
            type="button"
            disabled={yellowDay.isPending}
            onClick={() => yellowDay.mutate(undefined, {
              onSuccess: () => navigate('/home'),
              onError: () => setMessage('Could not start the yellow-day demo.'),
            })}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-yellow)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            Start yellow-day demo (water pill missed)
          </button>
          <button
            type="button"
            disabled={reset.isPending}
            onClick={() => reset.mutate(undefined, {
              onSuccess: () => navigate('/home'),
              onError: () => setMessage('Could not reset the demo.'),
            })}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            Reset demo day
          </button>
          {message && <p role="alert" style={{ margin: 0, fontSize: 18, color: 'var(--color-red)' }}>{message}</p>}
        </section>
      )}

      {!askOut ? (
        <button
          type="button"
          onClick={() => setAskOut(true)}
          style={{ alignSelf: 'flex-start', minHeight: 72, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', border: '3px solid var(--color-red)', background: 'var(--color-surface)', color: 'var(--color-red)', fontFamily: 'inherit', fontSize: 23, fontWeight: 700, cursor: 'pointer' }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Log out
        </button>
      ) : (
        <div role="group" aria-label="Log out?" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 24, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
          <p style={{ margin: 0, fontSize: 23, lineHeight: '30px', fontWeight: 700 }}>Log out of Ventra?</p>
          <p style={{ margin: 0, fontSize: 19, lineHeight: '27px' }}>You'll need your phone number and PIN to log in again.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
              style={{ minHeight: 68, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-red)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 21, fontWeight: 700, cursor: 'pointer' }}
            >
              Yes, log out
            </button>
            <button
              type="button"
              onClick={() => setAskOut(false)}
              style={{ minHeight: 68, borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 21, fontWeight: 700, cursor: 'pointer' }}
            >
              Stay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ to, label, icon, first }: { to: string; label: string; icon: ReactNode; first?: boolean }) {
  return (
    <Link to={to} style={{ minHeight: 76, display: 'flex', alignItems: 'center', gap: 14, color: 'var(--color-ink)', textDecoration: 'none', fontSize: 22, fontWeight: 700, borderTop: first ? undefined : '2px solid var(--color-line)' }}>
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      <span style={{ flex: 1 }}>{label}</span>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

const FILL = { green: 'var(--color-green-soft)', yellow: 'var(--color-yellow)' };
const EDGE = { green: 'var(--color-green)', yellow: 'var(--color-yellow-ink)' };

// Month grid (Monday first). Days with a logged weight get their zone colour; today has a coral ring.
function Month({ today, zones }: { today: string; zones: MetricsResponse['dayZones'] }) {
  const [year, month] = today.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const todayNum = Number(today.slice(8, 10));
  const zoneOf = new Map(zones.filter((z) => z.date.slice(0, 7) === today.slice(0, 7)).map((z) => [Number(z.date.slice(8, 10)), z.zone]));
  const cells: Array<number | null> = [...Array(lead).fill(null), ...Array.from({ length }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const title = `${MONTHS[month - 1]} ${year}`;

  return (
    <section aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 8px', borderRadius: 24, background: 'var(--color-surface)' }}>
      <h2 style={{ margin: 0, padding: '0 10px 4px', fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>{title}</h2>
      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'var(--color-ink-muted)' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: 6 }}>
        {cells.map((n, i) => {
          if (n == null) return <span key={`b${i}`} style={{ height: 56 }} />;
          const zone = zoneOf.get(n);
          const isToday = n === todayNum;
          const label = [`${MONTHS[month - 1]} ${n}`, zone === 'green' ? 'green day' : zone === 'yellow' ? 'yellow day, warning' : '', isToday ? 'today' : ''].filter(Boolean).join(', ');
          const style: CSSProperties = {
            width: 46,
            maxWidth: '100%',
            height: 52,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderRadius: 12,
            fontSize: 20,
            lineHeight: '22px',
            fontWeight: isToday || zone ? 700 : 500,
            background: zone ? FILL[zone] : 'transparent',
            color: 'var(--color-ink)',
            border: isToday ? '4px solid var(--color-coral)' : zone ? `2px solid ${EDGE[zone]}` : '2px solid transparent',
          };
          return (
            <span key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56 }}>
              <span role="img" aria-label={label} style={style}>
                <span aria-hidden="true">{n}</span>
                {zone === 'green' && <svg width={14} height={14} viewBox="0 0 24 24" fill="#1B6F45" aria-hidden="true"><path d={SPARKLE} /></svg>}
                {zone === 'yellow' && <span aria-hidden="true" style={{ fontSize: 14, lineHeight: '14px', fontWeight: 800, color: 'var(--color-yellow-ink)' }}>!</span>}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 10px', padding: '10px 10px 2px', fontSize: 18, lineHeight: '22px', fontWeight: 600 }}>
        <Legend swatch={<span style={{ ...swatch, background: 'var(--color-green-soft)', border: '2px solid var(--color-green)' }}><svg width={14} height={14} viewBox="0 0 24 24" fill="#1B6F45" aria-hidden="true"><path d={SPARKLE} /></svg></span>} text="Green · did well" />
        <Legend swatch={<span style={{ ...swatch, background: 'var(--color-yellow)', border: '2px solid var(--color-yellow-ink)', color: 'var(--color-yellow-ink)' }}>!</span>} text="Yellow · warning" />
        <Legend swatch={<span style={{ ...swatch, border: '4px solid var(--color-coral)' }} />} text="Today" />
      </div>
    </section>
  );
}

const swatch: CSSProperties = { width: 30, height: 30, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 14, fontWeight: 800 };

function Legend({ swatch: box, text }: { swatch: ReactNode; text: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{box}{text}</span>;
}
