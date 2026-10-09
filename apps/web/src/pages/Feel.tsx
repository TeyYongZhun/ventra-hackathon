import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SymptomKey } from '@ventra/core';
import { useAddSymptom, useMetrics } from '../lib/api';

// C4 · How I feel (design/Symptoms.dc.html). Symptoms feed the alert rules on the server
// (e.g. swollen ankles + missed water pill, or medium/bad breathlessness → yellow).
const SYMPTOMS: Array<{ key: SymptomKey; label: string }> = [
  { key: 'ankles', label: 'Swollen ankles' },
  { key: 'breath', label: 'Short of breath' },
  { key: 'dizzy', label: 'Dizzy' },
  { key: 'tired', label: 'Tired' },
];

const SEVERITY = [
  { sev: 'Mild', label: 'A little', bg: 'var(--color-green-soft)', border: 'var(--color-green)' },
  { sev: 'Moderate', label: 'Medium', bg: 'var(--color-yellow-soft)', border: 'var(--color-yellow-ink)' },
  { sev: 'Severe', label: 'Bad', bg: 'var(--color-red-soft)', border: 'var(--color-red)' },
] as const;

const tile = (on: boolean) => ({
  minHeight: 108,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 10px',
  borderRadius: 'var(--radius-lg)',
  fontFamily: 'inherit',
  fontSize: 21,
  lineHeight: '26px',
  fontWeight: 700,
  textAlign: 'center' as const,
  background: on ? 'var(--color-blue)' : 'var(--color-surface)',
  color: 'var(--color-ink)',
  border: on ? '3px solid var(--color-blue-ink)' : '3px solid var(--color-ink)',
  cursor: 'pointer',
});

export default function Feel() {
  const metrics = useMetrics();
  const add = useAddSymptom();
  const [picked, setPicked] = useState<SymptomKey[]>([]);
  const [fine, setFine] = useState(false);
  const [sev, setSev] = useState<(typeof SEVERITY)[number]['sev']>('Mild');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const toggle = (key: SymptomKey) => {
    setFine(false);
    setStatus('idle');
    setPicked((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

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

  const today = metrics.data?.symptomsToday ?? [];
  const yellow = metrics.data?.zone !== undefined && metrics.data.zone !== 'green';
  const ready = picked.length > 0 || fine;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>How I feel</h1>

      <section aria-label="What do you feel?" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Tap what you feel</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {SYMPTOMS.map((symptom) => (
            <button key={symptom.key} type="button" aria-pressed={picked.includes(symptom.key)} onClick={() => toggle(symptom.key)} style={tile(picked.includes(symptom.key))}>
              {symptom.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={fine}
            onClick={() => { setFine(!fine); setPicked([]); setStatus('idle'); }}
            style={{ ...tile(fine), gridColumn: '1 / -1', minHeight: 'var(--touch-button)' }}
          >
            I feel fine
          </button>
        </div>
      </section>

      {picked.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>How bad is it?</h2>
          <div role="radiogroup" aria-label="How bad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {SEVERITY.map((option) => (
              <button
                key={option.sev}
                type="button"
                role="radio"
                aria-checked={sev === option.sev}
                onClick={() => { setSev(option.sev); setStatus('idle'); }}
                style={{ minHeight: 96, borderRadius: 'var(--radius-lg)', fontFamily: 'inherit', fontSize: 21, fontWeight: 700, color: 'var(--color-ink)', background: sev === option.sev ? option.bg : 'var(--color-surface)', border: sev === option.sev ? `5px solid ${option.border}` : '3px solid var(--color-ink)', cursor: 'pointer' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {picked.includes('breath') && (
        <div role="alert" style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--color-red-soft)', border: '3px solid var(--color-red)' }}>
          <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
            If breathing is very hard right now, press the red <strong>SOS</strong> button.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!ready || status === 'saving'}
        onClick={() => (fine ? setStatus('saved') : save())}
        style={{ minHeight: 'var(--touch-button)', borderRadius: 'var(--radius-pill)', border: 0, background: ready ? 'var(--color-ink)' : 'var(--color-sunken)', color: ready ? 'var(--color-surface)' : 'var(--color-ink-muted)', fontFamily: 'inherit', fontSize: 'var(--text-title)', fontWeight: 700, cursor: ready ? 'pointer' : 'default' }}
      >
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      <div aria-live="polite">
        {status === 'saved' && (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 20, background: yellow ? 'var(--color-yellow-soft)' : 'var(--color-green-soft)', border: `3px solid ${yellow ? 'var(--color-yellow-ink)' : 'var(--color-green)'}` }}>
            <p style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
              {fine ? "Good to hear. Thank you for checking in." : yellow ? 'Saved. Today needs a call to your nurse.' : 'Saved. Thank you for telling us.'}
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

      {today.length > 0 && (
        <section aria-label="Logged today" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>Logged today</h2>
          {today.map((symptom) => (
            <span key={symptom.key} style={{ fontSize: 20, lineHeight: '28px' }}>
              {SYMPTOMS.find((s) => s.key === symptom.key)?.label} · {SEVERITY.find((s) => s.sev === symptom.sev)?.label ?? symptom.sev}
            </span>
          ))}
        </section>
      )}
    </div>
  );
}
