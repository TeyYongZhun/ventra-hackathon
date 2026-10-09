import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components';
import { useMe, useSaveProfile } from '../lib/api';
import { micEnabled, setMicEnabled } from '../lib/prefs';
import { applyTextSize } from '../lib/textSize';

// F5 · Text size and sound (design/TextSound.dc.html), opened from My details (More → Change my setup).
// Text size is saved on the account (same as set-up); the microphone switch is saved on this phone.
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const card = (on: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: 22,
  borderRadius: 24,
  textAlign: 'left',
  fontFamily: 'inherit',
  color: 'var(--color-ink)',
  background: on ? 'var(--color-blue-soft)' : 'var(--color-surface)',
  border: on ? '4px solid var(--color-blue-ink)' : '4px solid var(--color-surface)',
  cursor: 'pointer',
});

export default function TextSound() {
  const me = useMe();
  const save = useSaveProfile();
  const navigate = useNavigate();
  const [size, setSize] = useState<'large' | 'xl'>(me.data?.text_size === 'large' ? 'large' : 'xl');
  const [mic, setMic] = useState(micEnabled());

  // Preview: the whole app resizes as soon as a size is tapped. Leaving without saving puts
  // the saved size back (a save updates me.text_size, which RequireAuth applies).
  const saved = useRef(me.data?.text_size);
  saved.current = me.data?.text_size;
  useEffect(() => applyTextSize(size), [size]);
  useEffect(() => () => applyTextSize(saved.current), []);

  function test() {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Drink 1 cap of water.');
    utterance.lang = 'en-SG';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function saveAll() {
    setMicEnabled(mic);
    save.mutate({ textSize: size }, { onSuccess: () => navigate('/settings', { state: { saved: 'Text size and sound' } }) });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <PageHeader back={{ to: '/settings', label: 'Back to my details' }} />
      <h1 style={{ margin: 0, fontSize: 38, lineHeight: '44px', fontWeight: 700, letterSpacing: '-0.02em' }}>Make it easy to read and hear</h1>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Text size</h2>
        {(['large', 'xl'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)} style={card(size === value)}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{value === 'large' ? 'Large' : 'Extra large'}</span>
              {size === value && (
                <span aria-hidden="true" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)' }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
              )}
            </span>
            <span style={{ fontSize: value === 'large' ? 22 : 30, lineHeight: value === 'large' ? '30px' : '38px' }}>Drink 1 cap of water.</span>
          </button>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Voice</h2>
        {canSpeak() && (
          <div style={voiceRow}>
            <IconBox>
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </IconBox>
            <span style={{ flex: 1, minWidth: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>Sound</span>
            <button type="button" onClick={test} style={{ height: 64, padding: '0 24px', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>
              Test
            </button>
          </div>
        )}
        <div style={voiceRow}>
          <IconBox>
            <rect x={9} y={2} width={6} height={12} rx={3} />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <path d="M12 18v4" />
          </IconBox>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>Microphone</span>
            <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>Talk instead of type</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={mic}
            aria-label="Microphone"
            onClick={() => setMic(!mic)}
            style={{ position: 'relative', width: 84, height: 50, flexShrink: 0, borderRadius: 'var(--radius-pill)', padding: 0, background: mic ? 'var(--color-blue)' : 'var(--color-surface)', border: '3px solid var(--color-ink)', cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 4, left: mic ? 38 : 4, width: 36, height: 36, borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', transition: 'left 200ms ease-out' }} />
          </button>
        </div>
        <span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700, color: mic ? 'var(--color-blue-ink)' : 'var(--color-ink-muted)' }}>
          Microphone is {mic ? 'ON' : 'OFF'}
        </span>
      </section>

      {save.isError && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>We couldn't save that. Please try again.</p>
      )}
      <button
        type="button"
        disabled={save.isPending}
        onClick={saveAll}
        style={{ height: 76, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-blue)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: 'pointer' }}
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

// Sound / Microphone rows. Sized so the switch fits inside the card on a 360px-wide phone.
const voiceRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, background: 'var(--color-surface)' };

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--color-iris)', color: 'var(--color-ink)' }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </div>
  );
}
