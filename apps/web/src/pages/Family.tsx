import { useState } from 'react';
import type { FamilySettingsResponse, FamilySettingsUpdateRequest } from '@ventra/core';
import { LockedSwitch, PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useFamilySettings, useSendFamilySummary, useUpdateFamilySettings } from '../lib/api';

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

      {!settings.linked && <ConnectTelegram settings={settings} />}

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

function ConnectTelegram({ settings }: { settings: FamilySettingsResponse }) {
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
    </section>
  );
}
