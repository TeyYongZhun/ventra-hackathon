import { cloneElement, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { EmergencyWhat } from '@ventra/core';
import { useEmergencyNotify, useMetrics } from '../lib/api';

// H0 → H1 → H2 (design/EmergencyChoose, Emergency, EmergencyCall .dc.html).
// Prototype: the 995 call is always simulated; tel:995 is never opened.

const CHOICES: Array<{ what: EmergencyWhat; icon: JSX.Element }> = [
  {
    what: "Can't breathe",
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
      </svg>
    ),
  },
  {
    what: 'Chest pain',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M3.2 12h5.3l1.5-3 3 6 1.5-3h6.3" />
      </svg>
    ),
  },
  {
    what: 'Fainted or very dizzy',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx={12} cy={12} r={9} />
        <path d="M12 7a5 5 0 1 1-5 5" />
        <path d="M12 10a2 2 0 1 1-2 2" />
      </svg>
    ),
  },
  {
    what: 'Other emergency',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
  },
];

const COUNTDOWN_SECONDS = 10;

function useWhat(): EmergencyWhat {
  const [params] = useSearchParams();
  const raw = params.get('what');
  return CHOICES.find((choice) => choice.what === raw)?.what ?? 'Other emergency';
}

const redPage = {
  minHeight: '100vh',
  maxWidth: 480,
  margin: '0 auto',
  padding: '36px 20px 32px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 20,
  background: 'var(--color-red)',
  color: 'var(--color-surface)',
};

const demoNote = (
  <p style={{ margin: 0, fontSize: 'var(--text-tag)', lineHeight: '24px', fontWeight: 600, textAlign: 'center', opacity: 0.9 }}>
    Demo: no real call is made. In a real emergency, call 995 yourself.
  </p>
);

// H0 · What's happening?
export default function Emergency() {
  return (
    <div style={redPage}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg role="img" aria-label="Warning" width={72} height={64} viewBox="0 0 24 21.5" style={{ flexShrink: 0 }}>
          <path d="M10.27 1.5a2 2 0 0 1 3.46 0l9.5 16.5a2 2 0 0 1-1.73 3H2.5a2 2 0 0 1-1.73-3z" fill="#FFFFFF" />
          <path d="M12 6.5v6.5" stroke="#B83A26" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={12} cy={17} r={1.6} fill="#B83A26" />
        </svg>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: '46px', fontWeight: 700, letterSpacing: '-0.02em' }}>What's happening?</h1>
      </div>
      <p style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: '34px', fontWeight: 600 }}>
        Tap one. You don't need to type or speak. We will call 995.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {CHOICES.map((choice) => (
          <Link
            key={choice.what}
            to={`/emergency/countdown?what=${encodeURIComponent(choice.what)}`}
            style={{ minHeight: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', color: 'var(--color-red)', textDecoration: 'none', textAlign: 'center' }}
          >
            {choice.icon}
            <span style={{ fontSize: 23, lineHeight: '28px', fontWeight: 700, color: 'var(--color-ink)' }}>{choice.what}</span>
          </Link>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <Link
        to="/home"
        style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderRadius: 'var(--radius-pill)', border: '3px solid var(--color-surface)', color: 'var(--color-surface)', textDecoration: 'none', fontSize: 'var(--text-body)', fontWeight: 700, textAlign: 'center' }}
      >
        Back — I pressed this by mistake
      </Link>
      {demoNote}
    </div>
  );
}

// H1 · 10-second countdown with a big Cancel.
export function EmergencyCountdown() {
  const what = useWhat();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const callUrl = `/emergency/call?what=${encodeURIComponent(what)}`;

  useEffect(() => {
    if (cancelled) return;
    if (seconds <= 0) {
      navigate(callUrl, { replace: true });
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, cancelled, navigate, callUrl]);

  const circumference = 691.15;
  const label = `Calling 995 in ${seconds} second${seconds === 1 ? '' : 's'}. Press Cancel to stop.`;

  return (
    <div style={{ ...redPage, alignItems: 'center', textAlign: 'center', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px 10px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-red)' }}>
        <span aria-hidden="true" style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-red)', color: 'var(--color-surface)' }}>
          {/* The icon of the choice that was tapped, as in design/Emergency.dc.html. */}
          {cloneElement(CHOICES.find((choice) => choice.what === what)?.icon ?? CHOICES[CHOICES.length - 1]!.icon, { width: 32, height: 32 })}
        </span>
        <span style={{ fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>{what}</span>
      </div>

      {!cancelled ? (
        <>
          <div role="timer" aria-label={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 30, lineHeight: '36px', fontWeight: 700 }}>Calling 995 in</span>
            <div style={{ position: 'relative', width: 248, height: 248 }}>
              <svg width={248} height={248} viewBox="0 0 248 248" aria-hidden="true" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
                <circle cx={124} cy={124} r={110} fill="none" stroke="#8E2C1C" strokeWidth={18} />
                <circle
                  cx={124}
                  cy={124}
                  r={110}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={18}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  style={{ strokeDashoffset: (circumference * (1 - seconds / COUNTDOWN_SECONDS)).toFixed(1), transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 128, lineHeight: '124px', fontWeight: 700, letterSpacing: '-0.04em' }}>{seconds}</span>
                <span style={{ fontSize: 28, lineHeight: '32px', fontWeight: 700 }}>{seconds === 1 ? 'second' : 'seconds'}</span>
              </div>
            </div>
            <span aria-live="assertive" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCancelled(true)}
            style={{ width: '100%', minHeight: 144, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 40, border: 0, background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 0 0 8px rgba(255,255,255,0.3), 0 16px 32px rgba(22,32,30,0.3)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 48, lineHeight: '54px', fontWeight: 700 }}>
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Cancel
            </span>
            <span style={{ fontSize: 21, lineHeight: '26px', fontWeight: 600, color: '#4A4F49' }}>Don't call 995</span>
          </button>
          <div style={{ flex: 1 }} />
          <Link
            to={callUrl}
            replace
            style={{ width: '100%', minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '3px solid var(--color-surface)', color: 'var(--color-surface)', textDecoration: 'none', fontSize: 'var(--text-body)', fontWeight: 700 }}
          >
            Call now — don't wait
          </Link>
        </>
      ) : (
        <>
          <span role="status" style={{ fontSize: 34, lineHeight: '42px', fontWeight: 700 }}>Call cancelled</span>
          <span style={{ fontSize: 'var(--text-title)', lineHeight: '34px' }}>No one was called. If you feel worse, press SOS again.</span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => {
              setSeconds(COUNTDOWN_SECONDS);
              setCancelled(false);
            }}
            style={{ width: '100%', minHeight: 88, borderRadius: 'var(--radius-pill)', border: '3px solid var(--color-surface)', background: 'transparent', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: 'pointer' }}
          >
            I need help — call 995
          </button>
          <Link
            to="/home"
            style={{ width: '100%', minHeight: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 26, fontWeight: 700 }}
          >
            I'm OK — go home
          </Link>
        </>
      )}
      {demoNote}
    </div>
  );
}

// H2 · Simulated 995 call. The family member is messaged for real (if linked).
export function EmergencyCall() {
  const what = useWhat();
  const metrics = useMetrics();
  const notify = useEmergencyNotify();
  const [step, setStep] = useState(2);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const notified = useRef(false);
  const { mutate: sendSos } = notify;

  // Once per call screen (the ref also stops React's dev double-run from sending twice).
  useEffect(() => {
    if (notified.current) return;
    notified.current = true;
    sendSos({ what });
  }, [sendSos, what]);

  useEffect(() => {
    const first = setTimeout(() => setStep(3), 3500);
    const second = setTimeout(() => setStep(4), 7000);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  const data = metrics.data;
  const medicines = data ? [...new Set(data.pillsToday.all.map((dose) => dose.med.generic))].join(', ') : '';
  const profile = data ? [data.patient.condition, String(data.patient.age), medicines].filter(Boolean).join(' · ') : '';
  const steps = [
    ['Sharing your location', 'Your home address'],
    ['Reading your heart profile', profile],
    ['Help is on the way', 'An ambulance is coming to you'],
  ];
  const family = notify.data?.family;
  const familyLine = notify.isPending
    ? 'Sending a message to your family…'
    : notify.data?.told && family
      ? `We've also sent a message to ${family.name}.`
      : family
        ? `We couldn't message ${family.name}. Please call them if you can.`
        : null;

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 22, background: 'var(--color-canvas)' }}>
      <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '36px 20px 28px', background: 'var(--color-red)', color: 'var(--color-surface)', borderRadius: '0 0 32px 32px', textAlign: 'center' }}>
        <div aria-hidden="true" style={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-red)', boxShadow: '0 0 0 14px rgba(255,255,255,0.25)' }}>
          <svg width={52} height={52} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h1 style={{ margin: '12px 0 0', fontSize: 40, lineHeight: '46px', fontWeight: 700, letterSpacing: '-0.02em' }}>Calling 995</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: '30px', fontWeight: 600 }}>{what}</p>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
        <p role="note" style={{ margin: 0, padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-yellow-soft)', border: '3px solid var(--color-yellow-ink)', fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>
          Demo: no real call is made. In a real emergency, call 995 yourself.
        </p>

        <section aria-label="Call progress" style={{ display: 'flex', flexDirection: 'column', padding: '6px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
          {steps.map(([title, sub], index) => {
            const n = index + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: index ? '2px solid var(--color-line)' : 0, opacity: step < n ? 0.55 : 1 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', fontSize: 22, fontWeight: 700, background: done ? 'var(--color-green)' : active ? 'var(--color-red-soft)' : 'var(--color-surface)', color: done ? 'var(--color-surface)' : 'var(--color-ink)', border: done ? 0 : active ? '4px solid var(--color-red)' : '3px solid #8C877B' }}
                >
                  {done ? '✓' : n}
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--text-body)', lineHeight: '28px', fontWeight: 700 }}>{title}</span>
                  <span style={{ fontSize: 18, lineHeight: '25px', color: 'var(--color-ink-muted)' }}>{active ? 'Working on it…' : sub}</span>
                </span>
              </div>
            );
          })}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', border: '4px solid var(--color-ink)' }}>
          {['Stay seated upright.', 'Unlock your door if you can.'].map((tip, index) => (
            <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span aria-hidden="true" style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', color: 'var(--color-surface)', fontSize: 22, fontWeight: 700 }}>{index + 1}</span>
              <span style={{ fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>{tip}</span>
            </div>
          ))}
        </section>

        {familyLine && (
          <p role="status" style={{ margin: 0, padding: 18, borderRadius: 'var(--radius-lg)', background: notify.data?.told ? 'var(--color-green-soft)' : 'var(--color-sunken)', fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
            {familyLine}
          </p>
        )}

        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          style={{ minHeight: 72, borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 'var(--text-body)', fontWeight: 700, cursor: 'pointer' }}
        >
          Cancel call
        </button>
      </div>

      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', background: 'rgba(22,32,30,0.55)' }}>
          <div role="dialog" aria-modal="true" aria-label="Cancel the emergency call?" style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '28px 20px 32px', borderRadius: '32px 32px 0 0', background: 'var(--color-surface)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>Cancel the emergency call?</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: '30px' }}>Only cancel if you are safe.</p>
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmCancel(false)}
              style={{ minHeight: 88, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-red)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: 'pointer' }}
            >
              No, keep calling
            </button>
            <Link
              to="/home"
              style={{ minHeight: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 'var(--text-body)', fontWeight: 700 }}
            >
              Yes, cancel — I'm safe
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
