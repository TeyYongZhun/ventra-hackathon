import { useState, type ReactNode } from 'react';
import type { FamilySettingsResponse, FamilySettingsUpdateRequest } from '@ventra/core';
import { LockedSwitch, PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useFamilySettings, useResetTelegramLink, useSendFamilySummary, useUpdateFamilySettings } from '../lib/api';

// F3 · Summary for my family (design/Family.dc.html). The preview is built by
// packages/core (familySummaryLines), the same text the family gets on Telegram.
const header = <PageHeader back={{ to: '/more', label: 'Back' }} title="Summary for my family" titleSize={30} />;

export default function Family() {
  const settings = useFamilySettings();

  if (settings.isLoading) return <Loading what="family sharing" header={header} />;
  if (settings.isError || !settings.data) return <LoadError onRetry={() => settings.refetch()} header={header} />;
  return <FamilyView settings={settings.data} />;
}

type Choice = keyof FamilySettingsUpdateRequest;

const ROWS: Array<{ key: 'alerts' | 'status' | 'medicines' | Choice; label: string; sub: string }> = [
  { key: 'alerts', label: 'Yellow and red alerts', sub: 'Straight away, when they happen' },
  { key: 'status', label: "Today's status", sub: 'Green, yellow or red' },
  { key: 'weight', label: 'My weight', sub: "This morning's number" },
  { key: 'medicines', label: 'My medicines', sub: 'Taken or missed' },
  { key: 'drinks', label: 'My drinks', sub: 'How much I drank' },
  { key: 'symptoms', label: 'How I feel', sub: 'What I logged today' },
];

const LOCKED = new Set(['alerts', 'status', 'medicines']);

function FamilyView({ settings }: { settings: FamilySettingsResponse }) {
  const update = useUpdateFamilySettings();
  const send = useSendFamilySummary();
  const [error, setError] = useState('');
  const name = settings.family?.name ?? 'your family';

  function toggle(key: Choice) {
    update.mutate({ [key]: !settings[key] });
  }

  function sendNow() {
    setError('');
    send.mutate(undefined, {
      onError: (failure) => setError(failure.message || "The summary couldn't be sent. Please try again."),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {header}

      {!settings.linked && <ConnectTelegram settings={settings} reset={settings.linkCode ? <ResetLink linked={false} name={name} /> : null} />}
      {settings.linked && <LinkedTelegram name={name} />}

      <section aria-label="Preview" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-zest-soft)', border: '3px solid var(--color-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 'var(--text-body)', fontWeight: 700 }}>What {name} will get</span>
          <span style={{ padding: '4px 12px', borderRadius: 8, background: 'var(--color-surface)', fontSize: 16, fontWeight: 700 }}>PREVIEW</span>
        </div>
        {settings.preview.map((line) => (
          <div key={line.key} style={{ display: 'flex', gap: 10, fontSize: 20, lineHeight: '28px' }}>
            <span style={{ fontWeight: 700, minWidth: 108 }}>{line.label}</span>
            <span>{line.value}</span>
          </div>
        ))}
      </section>

      <section aria-label={`What ${name} can see`} style={{ display: 'flex', flexDirection: 'column', padding: '8px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
        <h2 style={{ margin: 0, padding: '12px 0 8px', fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>What {name} can see</h2>
        {ROWS.map((row) => {
          const locked = LOCKED.has(row.key);
          const on = locked || Boolean(settings[row.key as Choice]);
          return (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 84, borderTop: '2px solid var(--color-line)' }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>{row.label}</span>
                <span style={{ fontSize: 'var(--text-tag)', lineHeight: '24px', color: 'var(--color-ink-muted)' }}>{row.sub}</span>
                <span style={{ fontSize: 'var(--text-tag)', lineHeight: '24px', fontWeight: 700, color: locked ? '#4A4F49' : on ? 'var(--color-blue-ink)' : 'var(--color-ink-muted)' }}>
                  {locked ? 'Always shared · for your safety' : on ? 'Sharing' : 'Not shared'}
                </span>
              </span>
              {locked ? (
                <LockedSwitch />
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={row.label}
                  disabled={update.isPending}
                  onClick={() => toggle(row.key as Choice)}
                  style={{ position: 'relative', width: 84, height: 50, flexShrink: 0, borderRadius: 'var(--radius-pill)', padding: 0, background: on ? 'var(--color-blue)' : 'var(--color-surface)', border: '3px solid var(--color-ink)', cursor: 'pointer' }}
                >
                  <span style={{ position: 'absolute', top: 4, left: on ? 38 : 4, width: 36, height: 36, borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', transition: 'left 200ms ease-out' }} />
                </button>
              )}
            </div>
          );
        })}
      </section>

      <button
        type="button"
        onClick={sendNow}
        disabled={!settings.linked || settings.sentToday || send.isPending}
        style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-blue)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 'var(--text-title)', fontWeight: 700, cursor: 'pointer', opacity: !settings.linked || settings.sentToday ? 0.5 : 1 }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
        {send.isPending ? 'Sending…' : "Send today's summary now"}
      </button>
      <p role="status" style={{ margin: '-6px 0 0', fontSize: 19, lineHeight: '26px', fontWeight: 600, textAlign: 'center', color: error ? 'var(--color-red)' : settings.sentToday ? 'var(--color-green)' : 'var(--color-ink)' }}>
        {error
          || (settings.sentToday
            ? `Sent to ${name} for today. Tonight's 10 PM summary is skipped.`
            : "If you don't tap it, we'll send it automatically at 10 PM every night.")}
      </p>
      <p style={{ margin: 0, fontSize: 19, lineHeight: '27px', color: 'var(--color-ink-muted)' }}>
        Alerts, status and medicines are always shared for your safety. You choose the rest, and can change it any time.
      </p>
    </div>
  );
}

function ConnectTelegram({ settings, reset }: { settings: FamilySettingsResponse; reset?: ReactNode }) {
  const name = settings.family?.name ?? 'your family member';
  return (
    <section aria-label="Connect Telegram" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-blue-soft)', border: '3px solid var(--color-blue-ink)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>Connect {name} on Telegram</h2>
      {settings.linkCode ? (
        <>
          <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>
            Ask {name} to open this on their phone, then tap <strong>Start</strong>:
          </p>
          {settings.linkUrl ? (
            <a href={settings.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700, color: 'var(--color-blue-ink)', overflowWrap: 'anywhere' }}>
              {settings.linkUrl}
            </a>
          ) : (
            <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>Send this to the Ventra bot: <strong>/start {settings.linkCode}</strong></p>
          )}
          <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>
            Code: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 28, letterSpacing: '0.12em' }}>{settings.linkCode}</strong> · works for 24 hours
          </p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>Add a family contact first.</p>
      )}
      {reset}
    </section>
  );
}

// Already linked: say so, with the reset to link a different Telegram account.
function LinkedTelegram({ name }: { name: string }) {
  return (
    <section aria-label="Telegram link" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-green-soft)', border: '3px solid var(--color-green)' }}>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>
        <svg style={{ flexShrink: 0, color: 'var(--color-green)' }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        {name} is connected on Telegram
      </p>
      <ResetLink linked name={name} />
    </section>
  );
}

// Unlinks the family's Telegram (if linked) and makes a new code; the Connect card then shows
// the new code and link. Unlinking stops alerts reaching the family until they link again, so
// it asks first; a new code while not linked needs no check.
function ResetLink({ linked, name }: { linked: boolean; name: string }) {
  const reset = useResetTelegramLink();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div role="group" aria-label="Unlink Telegram?" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 20, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
        <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>Unlink {name}'s Telegram?</p>
        <p style={{ margin: 0, fontSize: 18, lineHeight: '26px' }}>{name} won't get alerts or summaries until they link again with the new code.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button
            type="button"
            disabled={reset.isPending}
            onClick={() => reset.mutate(undefined, { onSettled: () => setConfirming(false) })}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-red)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            {reset.isPending ? 'Unlinking…' : 'Yes, unlink'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          >
            Keep linked
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '2px dashed var(--color-line)' }}>
      <button
        type="button"
        disabled={reset.isPending}
        onClick={() => (linked ? setConfirming(true) : reset.mutate())}
        style={{ minHeight: 'var(--touch-min)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: reset.isPending ? 'wait' : 'pointer' }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {reset.isPending ? 'Resetting…' : linked ? 'Unlink and get a new code' : 'Get a new code'}
      </button>
      {reset.isError && (
        <p role="alert" style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: 'var(--color-red)' }}>Could not reset the Telegram link.</p>
      )}
    </div>
  );
}
