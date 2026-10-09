import { useEffect, useState } from 'react';
import type { ScriptLine } from '@ventra/core';
import { dayHeading } from '../lib/copy';

interface NurseScriptProps {
  script: ScriptLine[];
  date: string;
  today: string;
}

function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

// "Read this to the nurse" card from design/YellowAlert.dc.html. The script is built from
// raw logs by packages/core (nurseScript); bold parts are the numbers the nurse needs.
export function NurseScript({ script, date, today }: NurseScriptProps) {
  const [speaking, setSpeaking] = useState(false);
  const text = script.map((line) => line.segs.map((seg) => seg.t).join('')).join(' ');

  useEffect(() => () => {
    if (canSpeak()) window.speechSynthesis.cancel();
  }, []);

  function readAloud() {
    if (!canSpeak()) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ''));
    utterance.lang = 'en-SG';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <section
      aria-label="Read this to the nurse"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', border: '3px solid var(--color-ink)' }}
    >
      <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Read this to the nurse</h2>
      <span style={{ marginTop: -8, fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>
        Made from what you logged on {dayHeading(date)}{date === today ? ' (today)' : ''}.
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 14, background: 'var(--color-sunken)', fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
        {script.map((line) => (
          <p key={line.i} style={{ margin: 0 }}>
            {line.segs.map((seg, index) => (seg.b ? <strong key={index}>{seg.t}</strong> : <span key={index}>{seg.t}</span>))}
          </p>
        ))}
      </div>
      {canSpeak() && (
        <button
          type="button"
          onClick={readAloud}
          aria-pressed={speaking}
          style={{ minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-iris)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 23, fontWeight: 700, cursor: 'pointer' }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          {speaking ? 'Stop reading' : 'Read it for me'}
        </button>
      )}
    </section>
  );
}
