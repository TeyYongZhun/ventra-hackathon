import { Link } from 'react-router-dom';
import type { AlertsLatestResponse } from '@ventra/core';
import { PageHeader, SOSSlot } from '../components';
import { NurseScript } from '../components/NurseScript';
import { LoadError, Loading } from '../components/QueryState';
import { useLatestAlert, useMetrics } from '../lib/api';
import { dayHeading } from '../lib/copy';

// G1 · Yellow alert (design/YellowAlert.dc.html). Reasons, headline and nurse script all
// come from GET /api/alerts/latest, built from raw logs by the core rules.
// "Remind me in 1 hour" is left out: the app has no reminders yet.
const header = <PageHeader back={{ to: '/home', label: 'Back to home' }} title="My status" />;
export default function Alert() {
  const alert = useLatestAlert();
  const metrics = useMetrics();

  if (alert.isLoading || metrics.isLoading) return <Loading what="your alert" header={header} />;
  if (alert.isError || !alert.data || !metrics.data) {
    return <LoadError onRetry={() => { alert.refetch(); metrics.refetch(); }} header={header} />;
  }
  return <AlertView alert={alert.data} today={metrics.data.today} />;
}

function AlertView({ alert, today }: { alert: AlertsLatestResponse; today: string }) {
  const { family } = alert;

  if (alert.zone === 'green' && !alert.time) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {header}
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
          No alerts. You're on track — keep logging your drinks, weight and pills.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section
        aria-label="Warning"
        style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 20px 28px', margin: '-28px -20px 0', background: 'var(--color-yellow)', borderBottom: '6px solid var(--color-yellow-ink)', borderRadius: '0 0 32px 32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span aria-hidden="true" style={{ width: 80, height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', color: 'var(--color-yellow)' }}>
            <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <span style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', color: 'var(--color-yellow)', fontSize: 19, lineHeight: '24px', fontWeight: 700 }}>
            YELLOW · CALL TODAY
          </span>
          <span style={{ marginLeft: 'auto' }}>
            <SOSSlot size="page" />
          </span>
        </div>
        {alert.time && (
          <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 700 }}>
            Alert · {dayHeading(alert.date)}, {alert.time}
          </span>
        )}
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: '42px', fontWeight: 700, letterSpacing: '-0.02em' }}>{alert.headline}</h1>
        <ul aria-label="What we noticed" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {alert.reasons.map((reason) => (
            <li key={reason.chip} style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', border: '2px solid var(--color-yellow-ink)', fontSize: 19, lineHeight: '24px', fontWeight: 700 }}>
              {reason.chip}
            </li>
          ))}
        </ul>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
          This can mean extra fluid in your body. Please call your heart nurse today.
        </p>
      </section>

      <Link
        to="/nurse"
        style={{ minHeight: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 30, fontWeight: 700, boxShadow: '0 8px 24px rgba(22,32,30,0.14)' }}
      >
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        Call heart nurse
      </Link>

      <NurseScript script={alert.script} date={alert.date} today={today} />

      {family.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--color-blue-soft)' }}>
          <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)' }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx={9} cy={7} r={4} />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
            Your {family.relation} <strong>{family.name}</strong> {alert.familyTold ? 'has been told.' : 'has not been told yet.'}
          </p>
        </div>
      )}

      <Link
        to="/home"
        style={{ minHeight: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 'var(--text-body)', fontWeight: 700 }}
      >
        I've called
      </Link>

      <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
        <svg style={{ flexShrink: 0 }} width={34} height={30} viewBox="0 0 24 21.5" aria-hidden="true">
          <path d="M10.27 1.5a2 2 0 0 1 3.46 0l9.5 16.5a2 2 0 0 1-1.73 3H2.5a2 2 0 0 1-1.73-3z" fill="#B83A26" />
          <path d="M12 6.5v6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={12} cy={17} r={1.6} fill="#FFFFFF" />
        </svg>
        <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
          Chest pain or can't breathe? <Link to="/emergency" style={{ color: 'var(--color-red)', fontWeight: 700 }}>Get emergency help</Link>
        </p>
      </div>
    </div>
  );
}
