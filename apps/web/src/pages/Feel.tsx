import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { dayShort, symptomLabel, type SymptomKey } from '@ventra/core';
import { PageHeader } from '../components';
import { useAddSymptom, useMetrics } from '../lib/api';
import { micEnabled } from '../lib/prefs';
import { recognitionClass, speechErrorMessage, type Recognition } from '../lib/speech';

// C4 · How I feel (design/Symptoms.dc.html). Symptoms feed the alert rules on the server
// (e.g. swollen ankles + missed water pill, or medium/bad breathlessness → yellow).
// Not built yet (they need new storage): "Something else", the voice/typed note and
// "Did it start after taking medicine?".
const icon = (children: ReactNode, size = 48) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const SYMPTOMS: Array<{ key: SymptomKey; label: string; icon: ReactNode }> = [
  { key: 'dizzy', label: 'Dizzy', icon: icon(<><circle cx={12} cy={12} r={9} /><path d="M12 7a5 5 0 1 1-5 5" /><path d="M12 10a2 2 0 1 1-2 2" /></>) },
  { key: 'tired', label: 'Tired', icon: icon(<><rect x={2} y={7} width={16} height={10} rx={2} /><path d="M22 11v2" /><path d="M6 11v2" /></>) },
  { key: 'ankles', label: 'Swollen ankles', icon: icon(<><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" /><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" /></>) },
  { key: 'breath', label: 'Short of breath', icon: icon(<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>) },
  { key: 'cough', label: 'Cough at night', icon: icon(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />) },
  { key: 'sleep', label: 'Poor sleep', icon: icon(<><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></>) },
];

const SMILE = <><circle cx={12} cy={12} r={10} /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></>;

const SEVERITY = [
  { sev: 'Mild', label: 'A little', bg: 'var(--color-green-soft)', border: 'var(--color-green)', face: SMILE },
  { sev: 'Moderate', label: 'Medium', bg: 'var(--color-yellow-soft)', border: 'var(--color-yellow-ink)', face: <><circle cx={12} cy={12} r={10} /><path d="M8 15h8" /><path d="M9 9h.01" /><path d="M15 9h.01" /></> },
  { sev: 'Severe', label: 'Bad', bg: 'var(--color-red-soft)', border: 'var(--color-red)', face: <><circle cx={12} cy={12} r={10} /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></> },
] as const;
type Sev = (typeof SEVERITY)[number]['sev'];

// Severity chip in Recent check-ins.
const SEV_CHIP: Record<string, { bg: string; ink: string }> = {
  Mild: { bg: 'var(--color-green-soft)', ink: 'var(--color-green)' },
  Moderate: { bg: 'var(--color-yellow-soft)', ink: 'var(--color-yellow-ink)' },
  Severe: { bg: 'var(--color-red-soft)', ink: 'var(--color-red)' },
};

const tile = (on: boolean): CSSProperties => ({
  minHeight: 132,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '14px 10px',
  borderRadius: 24,
  fontFamily: 'inherit',
  fontSize: 21,
  lineHeight: '26px',
  fontWeight: 700,
  textAlign: 'center',
  background: on ? 'var(--color-blue)' : 'var(--color-surface)',
  color: 'var(--color-ink)',
  border: on ? '3px solid var(--color-blue-ink)' : '3px solid var(--color-ink)',
  cursor: 'pointer',
});

// Words heard → tiles. Runs on the phone; nothing is recorded or sent anywhere.
const HEARD: Array<[RegExp, SymptomKey]> = [
  [/dizz|giddy|light.?headed/, 'dizzy'],
  [/tired|weak|no energy/, 'tired'],
  [/ankle|feet|foot|leg|swell|swollen/, 'ankles'],
  [/breath|breathe|breathing|puff/, 'breath'],
  [/cough/, 'cough'],
  [/sleep|awake|insomnia/, 'sleep'],
];

function hear(text: string): { keys: SymptomKey[]; fine: boolean; sev?: Sev } {
  const said = text.toLowerCase();
  const keys = HEARD.filter(([pattern]) => pattern.test(said)).map(([, key]) => key);
  const sev: Sev | undefined = /very|really bad|terrible|worse|a lot/.test(said) ? 'Severe' : /a bit|a little|slightly|abit/.test(said) ? 'Mild' : undefined;
  return { keys, fine: keys.length === 0 && /fine|good|okay|ok|well/.test(said), sev };
}


export default function Feel() {
  const metrics = useMetrics();
  const add = useAddSymptom();
  const [picked, setPicked] = useState<SymptomKey[]>([]);
  const [fine, setFine] = useState(false);
  const [sev, setSev] = useState<Sev>('Mild');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const recognition = useRef<Recognition | null>(null);
  // Hidden when the browser cannot listen, or the patient turned the microphone off.
  const Speech = micEnabled() ? recognitionClass() : null;

  useEffect(() => () => recognition.current?.stop(), []);

  const toggle = (key: SymptomKey) => {
    setFine(false);
    setStatus('idle');
    setPicked((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

  function listen() {
    if (!Speech) return;
    if (listening) { recognition.current?.stop(); return; }
    const rec = new Speech();
    rec.lang = 'en-SG';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? '';
      const result = hear(text);
      setStatus('idle');
      if (result.keys.length > 0) {
        setFine(false);
        setPicked((current) => [...new Set([...current, ...result.keys])]);
        if (result.sev) setSev(result.sev);
        setHeard(`We heard: “${text}”. Check the tiles below, then save.`);
      } else if (result.fine) {
        setPicked([]);
        setFine(true);
        setHeard(`We heard: “${text}”.`);
      } else {
        setHeard(`We heard: “${text}”. Please tap what you feel below.`);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (event) => {
      setListening(false);
      const reason = speechErrorMessage(event.error);
      if (reason) setHeard(`${reason} You can also tap what you feel below.`);
    };
    recognition.current = rec;
    setHeard('');
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setHeard(`${speechErrorMessage(undefined)} You can also tap what you feel below.`);
    }
  }

  async function save() {
    setStatus('saving');
    try {
      for (const key of picked) await add.mutateAsync({ key, sev });
      await metrics.refetch();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  const recent = metrics.data?.symptomsRecent ?? [];
  const yellow = metrics.data?.zone !== undefined && metrics.data.zone !== 'green';
  const ready = picked.length > 0 || fine;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader back={{ to: '/track', label: 'Back to track' }} title="How I feel" />

      {Speech && (
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '26px 22px', borderRadius: 32, background: 'var(--color-iris-soft)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 26, lineHeight: '34px', fontWeight: 700 }}>How are you feeling today?</p>
          <button
            type="button"
            onClick={listen}
            aria-label={listening ? 'Stop listening' : 'Tap and speak'}
            aria-pressed={listening}
            style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-iris)', color: 'var(--color-ink)', boxShadow: listening ? '0 0 0 10px #FFFFFF, 0 0 0 18px rgba(141,147,246,0.45)' : '0 0 0 10px #FFFFFF', cursor: 'pointer' }}
          >
            {icon(<><rect x={9} y={2} width={6} height={12} rx={3} /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /></>, 60)}
          </button>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#4A4FC2' }}>{listening ? 'Listening… tap to stop' : 'Tap and speak'}</span>
          {heard && <p aria-live="polite" style={{ margin: 0, fontSize: 19, lineHeight: '27px' }}>{heard}</p>}
        </section>
      )}

      <section aria-label="What do you feel?" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>{Speech ? 'Or tap what you feel' : 'Tap what you feel'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {SYMPTOMS.map((symptom) => (
            <button key={symptom.key} type="button" aria-pressed={picked.includes(symptom.key)} onClick={() => toggle(symptom.key)} style={tile(picked.includes(symptom.key))}>
              {symptom.icon}
              <span>{symptom.label}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={fine}
            onClick={() => { setFine(!fine); setPicked([]); setStatus('idle'); }}
            style={tile(fine)}
          >
            {icon(SMILE)}
            <span>I feel fine</span>
          </button>
        </div>
      </section>

      {picked.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>How bad is it?</h2>
          <div role="radiogroup" aria-label="How bad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {SEVERITY.map((option) => (
              <button
                key={option.sev}
                type="button"
                role="radio"
                aria-checked={sev === option.sev}
                onClick={() => { setSev(option.sev); setStatus('idle'); }}
                style={{ minHeight: 128, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24, fontFamily: 'inherit', fontSize: 21, fontWeight: 700, color: 'var(--color-ink)', background: sev === option.sev ? option.bg : 'var(--color-surface)', border: sev === option.sev ? `5px solid ${option.border}` : '3px solid var(--color-ink)', cursor: 'pointer' }}
              >
                {icon(option.face, 52)}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {picked.includes('breath') && (
        <div role="alert" style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
          <svg style={{ flexShrink: 0 }} width={38} height={34} viewBox="0 0 24 21.5" aria-hidden="true">
            <path d="M10.27 1.5a2 2 0 0 1 3.46 0l9.5 16.5a2 2 0 0 1-1.73 3H2.5a2 2 0 0 1-1.73-3z" fill="#B83A26" />
            <path d="M12 6.5v6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={12} cy={17} r={1.6} fill="#FFFFFF" />
          </svg>
          <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
            If breathing is very hard right now, press the red <strong>SOS</strong> button at the top.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!ready || status === 'saving'}
        onClick={() => (fine ? setStatus('saved') : save())}
        style={{ minHeight: 80, borderRadius: 'var(--radius-pill)', border: 0, background: ready ? 'var(--color-blue)' : 'var(--color-sunken)', color: ready ? 'var(--color-ink)' : 'var(--color-ink-muted)', fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: ready ? 'pointer' : 'default' }}
      >
        {status === 'saving' ? 'Saving…' : 'Save how I feel'}
      </button>

      <div aria-live="polite">
        {status === 'saved' && (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 20, background: yellow ? 'var(--color-yellow-soft)' : 'var(--color-green-soft)', border: `3px solid ${yellow ? 'var(--color-yellow-ink)' : 'var(--color-green)'}` }}>
            <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
              {fine ? 'Good to hear. Thank you for checking in.' : yellow ? 'Saved. Today needs a call to your nurse.' : 'Saved. Thank you for telling us.'}
            </p>
            {yellow && !fine && (
              <Link to="/alert" style={{ fontSize: 21, fontWeight: 700, color: 'var(--color-yellow-ink)' }}>What to do now</Link>
            )}
          </div>
        )}
        {status === 'error' && (
          <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>We couldn't save that. Please try again.</p>
        )}
      </div>

      {recent.length > 0 && (
        <section aria-label="Recent check-ins" style={{ display: 'flex', flexDirection: 'column', padding: '8px 20px', borderRadius: 24, background: 'var(--color-surface)' }}>
          <h2 style={{ margin: 0, padding: '12px 0', fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>Recent check-ins</h2>
          {recent.map((symptom) => (
            <div key={`${symptom.date}-${symptom.key}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, borderTop: '2px solid var(--color-line)' }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 21, fontWeight: 700 }}>{symptomLabel(symptom.key)}</span>
                <span style={{ fontSize: 18, color: 'var(--color-ink-muted)' }}>{dayShort(symptom.date)}</span>
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 8, background: SEV_CHIP[symptom.sev]?.bg ?? 'var(--color-sunken)', color: SEV_CHIP[symptom.sev]?.ink ?? 'var(--color-ink)', fontSize: 17, fontWeight: 700 }}>
                {symptom.sev}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
