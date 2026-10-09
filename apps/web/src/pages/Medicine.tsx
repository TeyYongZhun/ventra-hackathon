import { useState } from 'react';
import { clock, type DoseStatus, type IsoDate, type MetricsResponse } from '@ventra/core';
import { PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useConfirmDose, useMetrics } from '../lib/api';

// D1 · Today's medicines (design/Medicines.dc.html). Doses come from GET /api/metrics;
// "I took it" → check → POST /api/doses/confirm → locked. There is no undo.
export default function Medicine() {
  const metrics = useMetrics();

  if (metrics.isLoading) return <Loading what="your medicines" header={<Heading />} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} header={<Heading />} />;
  return <MedicineView metrics={metrics.data} />;
}

function doseKey(dose: DoseStatus) {
  return `${dose.med.id}@${dose.time}`;
}

function MedicineView({ metrics }: { metrics: MetricsResponse }) {
  const { morning, evening, next } = metrics.pillsToday;
  // The next dose to take starts open, so it is one tap away.
  const [open, setOpen] = useState<Record<string, boolean>>(() => (next ? { [doseKey(next)]: true } : {}));
  // Doses confirmed on this screen, shown as locked straight away while metrics refresh.
  const [justTaken, setJustTaken] = useState<Record<string, string>>({});

  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));
  const markTaken = (key: string, at: string) => setJustTaken((current) => ({ ...current, [key]: at }));

  if (morning.length === 0 && evening.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Heading />
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
          No medicines are set up yet. Your care team can add them.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Heading />
      {[
        { label: 'Morning', doses: morning, icon: <SunIcon /> },
        { label: 'Evening', doses: evening, icon: <MoonIcon /> },
      ]
        .filter((group) => group.doses.length > 0)
        .map((group) => (
          <DoseGroup
            key={group.label}
            label={group.label}
            icon={group.icon}
            doses={group.doses}
            today={metrics.today}
            open={open}
            justTaken={justTaken}
            onToggle={toggle}
            onTaken={markTaken}
          />
        ))}
      <p style={{ margin: 0, display: 'flex', gap: 10, fontSize: 'var(--text-caption)', lineHeight: '27px', color: 'var(--color-ink-muted)' }}>
        <svg style={{ flexShrink: 0 }} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx={12} cy={12} r={10} />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        Pill pictures help you check you have the right one. If your pill looks different, ask your pharmacist.
      </p>
    </div>
  );
}

function Heading() {
  return <PageHeader title="Medicine" />;
}

interface DoseGroupProps {
  label: string;
  icon: React.ReactNode;
  doses: DoseStatus[];
  today: IsoDate;
  open: Record<string, boolean>;
  justTaken: Record<string, string>;
  onToggle: (key: string) => void;
  onTaken: (key: string, at: string) => void;
}

function DoseGroup({ label, icon, doses, today, open, justTaken, onToggle, onTaken }: DoseGroupProps) {
  const times = [...new Set(doses.map((dose) => clock(dose.time)))].join(', ');
  const taken = doses.filter((dose) => dose.taken || justTaken[doseKey(dose)]).length;
  const all = taken === doses.length;
  const chip = all ? 'All taken' : taken === 0 ? 'Not yet' : `${taken} of ${doses.length} taken`;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={`${label} medicines`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>
          {icon}
          {label} · {times}
        </h2>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 'var(--text-tag)',
            lineHeight: 'var(--lh-tag)',
            fontWeight: 700,
            background: all ? 'var(--color-green-soft)' : 'var(--color-yellow)',
            color: all ? 'var(--color-green)' : 'var(--color-ink)',
          }}
        >
          {chip}
        </span>
      </div>
      {doses.map((dose) => {
        const key = doseKey(dose);
        return (
          <DoseCard
            key={key}
            dose={dose}
            today={today}
            open={Boolean(open[key])}
            takenNow={justTaken[key]}
            onToggle={() => onToggle(key)}
            onTaken={(at) => onTaken(key, at)}
          />
        );
      })}
    </section>
  );
}

interface DoseCardProps {
  dose: DoseStatus;
  today: IsoDate;
  open: boolean;
  takenNow?: string;
  onToggle: () => void;
  onTaken: (at: string) => void;
}

function DoseCard({ dose, today, open, takenNow, onToggle, onTaken }: DoseCardProps) {
  const confirmDose = useConfirmDose();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const taken = dose.taken || Boolean(takenNow);
  const takenAt = takenNow ?? dose.takenAt;
  const { med } = dose;
  const name = med.name;
  const amount = dose.of > 1 ? `${dose.index + 1} of ${dose.of}` : '1 tablet';
  const status = taken
    ? `Taken at ${takenAt ?? clock(dose.time)}`
    : dose.missed
      ? `Missed · was due at ${clock(dose.time)}`
      : `Due at ${clock(dose.time)}`;
  const statusColor = taken ? 'var(--color-green)' : dose.missed ? 'var(--color-red)' : 'var(--color-yellow-ink)';

  function confirm() {
    setError('');
    confirmDose.mutate({ date: today, medId: med.id, time: dose.time }, {
      onSuccess: (result) => {
        setChecking(false);
        onTaken(result.takenAt);
      },
      onError: (failure) => {
        setChecking(false);
        setError(failure.message || "We couldn't save that. Please try again.");
      },
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: taken ? 'var(--color-surface)' : 'var(--color-coral-soft)',
        border: taken ? `3px solid ${open ? 'var(--color-ink)' : 'var(--color-surface)'}` : '3px solid var(--color-coral)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          minHeight: 88,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 14px 12px 16px',
          border: 0,
          background: 'transparent',
          color: 'var(--color-ink)',
          textAlign: 'left',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <PillPicture dose={dose} taken={taken} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 23, lineHeight: '28px', fontWeight: 700 }}>{name}</span>
          <span style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)', fontWeight: 700, color: statusColor }}>{status}</span>
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-pill)',
            background: open ? 'var(--color-ink)' : 'var(--color-sunken)',
            color: open ? 'var(--color-surface)' : 'var(--color-ink)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease-out, background 200ms ease-out',
          }}
        >
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 18px 18px' }}>
          <span style={{ fontSize: 'var(--text-caption)', lineHeight: 'var(--lh-caption)', color: 'var(--color-ink-muted)' }}>
            {med.generic} {med.strength} · {amount}
          </span>
          <Detail title="What it's for" text={med.purpose} />
          <Detail title="Looks like" text={med.looks} />

          {taken ? (
            <div
              role="status"
              aria-label={`Taken at ${takenAt}. This can no longer be changed.`}
              style={{
                minHeight: 'var(--touch-button)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-green-soft)',
                color: 'var(--color-green)',
                border: '3px solid var(--color-green)',
                fontSize: 'var(--text-body)',
                fontWeight: 700,
              }}
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Taken at {takenAt}
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x={5} y={11} width={14} height={10} rx={2} />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
          ) : checking ? (
            <div
              role="group"
              aria-label="Check before saving"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 16,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-yellow-soft)',
                border: '2.5px solid var(--color-yellow-ink)',
              }}
            >
              <p style={{ margin: 0, fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>Did you just take your {name.toLowerCase()}?</p>
              <p style={{ margin: 0, fontSize: 18, lineHeight: '24px' }}>You can't change this after you say yes.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={confirmDose.isPending}
                  style={{ ...choiceButton, border: 0, background: 'var(--color-green)', color: 'var(--color-surface)', opacity: confirmDose.isPending ? 0.6 : 1 }}
                >
                  {confirmDose.isPending ? 'Saving…' : 'Yes, I took it'}
                </button>
                <button
                  type="button"
                  onClick={() => setChecking(false)}
                  disabled={confirmDose.isPending}
                  style={{ ...choiceButton, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}
                >
                  Not yet
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChecking(true)}
              style={{
                width: '100%',
                height: 'var(--touch-button)',
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-title)',
                fontWeight: 700,
                background: 'var(--color-blue)',
                color: 'var(--color-ink)',
                border: '3px solid var(--color-blue)',
                cursor: 'pointer',
              }}
            >
              I took it
            </button>
          )}
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const choiceButton = {
  minHeight: 68,
  padding: '6px 10px',
  borderRadius: 'var(--radius-pill)',
  fontSize: 21,
  lineHeight: '24px',
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
} as const;

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12, borderTop: '2px solid var(--color-line)' }}>
      <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 20, lineHeight: '28px' }}>{text}</span>
    </div>
  );
}

// Pill drawn from the medicine's own colours (round tablet with score line, or oval).
function PillPicture({ dose, taken }: { dose: DoseStatus; taken: boolean }) {
  const { round, oval, tile, looks } = dose.med;
  return (
    <span
      role="img"
      aria-label={`Pill: ${looks.toLowerCase()}`}
      style={{
        position: 'relative',
        width: 60,
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: taken ? tile ?? 'var(--color-sunken)' : 'var(--color-surface)',
      }}
    >
      {round ? (
        <span style={{ position: 'relative', width: round.size, height: round.size, borderRadius: '50%', background: round.bg, border: `2px solid ${round.border}` }}>
          <span style={{ position: 'absolute', left: round.size / 2 - 3, top: 3, bottom: 3, width: 2, background: round.line }} />
        </span>
      ) : oval ? (
        <span style={{ width: 46, height: 22, borderRadius: 11, background: oval.bg, border: `2px solid ${oval.border}` }} />
      ) : (
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-surface)', border: '2px solid var(--color-line)' }} />
      )}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -6,
          bottom: -6,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-pill)',
          border: `2.5px solid ${taken ? 'var(--color-surface)' : 'var(--color-coral-soft)'}`,
          background: taken ? 'var(--color-green)' : 'var(--color-yellow)',
          color: taken ? 'var(--color-surface)' : 'var(--color-ink)',
        }}
      >
        {taken ? (
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={9} />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
      </span>
    </span>
  );
}

function SunIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
