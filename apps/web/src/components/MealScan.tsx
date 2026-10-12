import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MealListEntry, MealScanResponse } from '@ventra/core';
import { useAddMeal, useScanMeal, useVisionStatus } from '../lib/api';
import { ml as num } from '../lib/copy';
import { photoToJpeg } from '../lib/photo';
import { level, MealPhoto, teaspoons, TONE } from './MealCard';

type ScanResult = Extract<MealScanResponse, { found: true }>;

// A check usually takes 10–40 s (the AI thinks first, and the server may try twice).
// After this long, the card tells the patient to keep waiting.
export const SLOW_CHECK_MS = 20_000;

// "Scan my meal" (design/Meals.dc.html): take a photo, the AI estimates the salt
// (POST /api/vision/meal), and the patient checks the result before it is logged
// (POST /api/meals { scanId }). The photo is kept with the meal and shown on its card.
export function MealScan({ limitMg, onLogged }: { limitMg: number; onLogged: (meal: MealListEntry) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const status = useVisionStatus();
  const scan = useScanMeal();
  const addMeal = useAddMeal();
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [note, setNote] = useState('');
  const [reading, setReading] = useState(false);

  const off = status.data?.meal === false;
  const checking = reading || scan.isPending;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setSlow(false);
    if (!checking) return;
    const timer = setTimeout(() => setSlow(true), SLOW_CHECK_MS);
    return () => clearTimeout(timer);
  }, [checking]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setNote('');
    setReading(true);
    let jpeg: string;
    try {
      jpeg = await photoToJpeg(file);
    } catch {
      setReading(false);
      setNote("We couldn't read that photo. Please try again.");
      return;
    }
    setReading(false);
    setResult(null);
    setPhoto(jpeg);
    scan.mutate({ photo: jpeg }, {
      onSuccess: (response) => {
        if (response.found) {
          setResult(response);
          return;
        }
        setPhoto(null);
        setNote("We couldn't see a meal in this photo. Try again with the whole plate in view.");
      },
      onError: (error) => {
        setPhoto(null);
        setNote(error.message || "We couldn't check this photo. Please try again.");
      },
    });
  }

  function logIt(scanId: number) {
    setNote('');
    addMeal.mutate({ scanId }, {
      onSuccess: (meal) => {
        setResult(null);
        setPhoto(null);
        onLogged(meal);
      },
      onError: (error) => setNote(error.message || "We couldn't log that. Please try again."),
    });
  }

  const camera = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      capture="environment"
      aria-label="Meal photo"
      style={{ display: 'none' }}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        void onPhoto(file);
      }}
    />
  );

  if (result && photo) {
    return (
      <>
        {camera}
        <Result
          result={result}
          photo={photo}
          limitMg={limitMg}
          note={note}
          busy={addMeal.isPending || checking}
          onLog={() => logIt(result.scanId)}
          onRetake={() => input.current?.click()}
        />
      </>
    );
  }

  return (
    <section aria-label="Scan my meal" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, borderRadius: 32, background: '#16201E', color: '#FFFFFF', boxShadow: '0 12px 28px rgba(22,32,30,0.18)' }}>
      {camera}
      <ScanPicture photo={checking ? photo : null} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.015em' }}>Scan my meal</h2>
        <p aria-live="polite" style={{ margin: 0, fontSize: 20, lineHeight: '28px', color: checking && slow ? '#FFFFFF' : '#D6DAD4', fontWeight: checking && slow ? 600 : 400 }}>
          {off ? "Photo checking isn't switched on yet."
            : checking && slow ? 'Still checking — please wait. This can take a minute or so.'
              : "Take a photo before you eat. We'll tell you how salty it is."}
        </p>
      </div>
      <button
        type="button"
        disabled={checking || off}
        onClick={() => input.current?.click()}
        aria-live="polite"
        style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', border: 0, fontFamily: 'inherit', fontSize: 24, fontWeight: 700, background: checking ? '#D2EE63' : '#7CC7FE', color: '#16201E', opacity: off ? 0.5 : 1, cursor: checking || off ? 'default' : 'pointer', transition: 'background 200ms ease-out' }}
      >
        <CameraIcon />
        {checking ? 'Checking the salt…' : 'Take a photo'}
      </button>
      {note && <p role="alert" style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600, color: '#F8DA98' }}>{note}</p>}
    </section>
  );
}

function Result({ result, photo, limitMg, note, busy, onLog, onRetake }: {
  result: ScanResult;
  photo: string;
  limitMg: number;
  note: string;
  busy: boolean;
  onLog: () => void;
  onRetake: () => void;
}) {
  const { estimate, sure } = result;
  const tone = TONE[level(estimate.sodiumMg)];
  const button: CSSProperties = { height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 'var(--radius-pill)', fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 };

  return (
    <section aria-label="Your meal photo" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 20, borderRadius: 32, background: 'var(--color-surface)', border: '2.5px solid var(--color-ink)' }}>
      <MealPhoto src={photo} what={estimate.what} chip="Just now" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 18, lineHeight: '24px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>We think this is</span>
        <h2 style={{ margin: 0, fontSize: 30, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.015em' }}>{estimate.what}</h2>
        <span style={{ fontSize: 20, lineHeight: '28px' }}>About {num(estimate.kcal)} calories</span>
      </div>
      {!sure && (
        <p style={{ margin: 0, padding: '14px 16px', borderRadius: 18, background: 'var(--color-yellow-soft)', fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>
          We're not very sure about this one. If it looks wrong, take another photo.
        </p>
      )}
      <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 24, background: tone.box, border: `3px solid ${tone.edge}`, color: tone.edge }}>
        <svg style={{ flexShrink: 0 }} width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-ink)' }}>
          <p style={{ margin: 0, fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{tone.head} — about {teaspoons(estimate.sodiumMg)} teaspoon</p>
          <p style={{ margin: 0, fontSize: 21, lineHeight: '30px' }}>
            {limitMg > 0 ? `That is ${Math.round((estimate.sodiumMg / limitMg) * 100)}% of your day. ` : ''}{estimate.tip}
          </p>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={onLog} style={{ ...button, border: 0, background: '#7CC7FE' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        Yes, log it
      </button>
      <button type="button" disabled={busy} onClick={onRetake} style={{ ...button, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
        <CameraIcon />
        Take another photo
      </button>
      {note && <p role="alert" style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600, color: 'var(--color-red)' }}>{note}</p>}
      <p style={{ margin: 0, fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>Estimated from your photo. Nothing is logged until you say yes.</p>
    </section>
  );
}

// The design's camera picture: a plate under a breathing frame with a scan line. While a photo
// is being checked, the photo takes the plate's place.
function ScanPicture({ photo }: { photo: string | null }) {
  const corner = (side: 'left' | 'right', end: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute', [side]: 0, [end]: 0, width: 26, height: 26,
    [`border${side === 'left' ? 'Left' : 'Right'}`]: '5px solid currentColor',
    [`border${end === 'top' ? 'Top' : 'Bottom'}`]: '5px solid currentColor',
    borderRadius: side === 'left' ? (end === 'top' ? '10px 0 0 0' : '0 0 0 10px') : (end === 'top' ? '0 10px 0 0' : '0 0 10px 0'),
  });
  const blob = (left: number, top: number, width: number, height: number, extra: CSSProperties): CSSProperties => ({ position: 'absolute', left, top, width, height, borderRadius: 'var(--radius-pill)', ...extra });

  return (
    <div aria-hidden="true" style={{ position: 'relative', height: 150, borderRadius: 22, background: '#2E3836', overflow: 'hidden' }}>
      {photo ? (
        <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      ) : (
        <>
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: '#26302E' }} />
          <span className="scan-anim" style={{ position: 'absolute', left: '50%', top: '50%', width: 108, height: 108, margin: '-58px 0 0 -54px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: '#FFFFFF', boxShadow: '0 8px 16px rgba(0,0,0,0.35)', animation: 'scan-bob 3.2s ease-in-out infinite' }}>
            <span style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--radius-pill)', background: '#F8DA98', boxShadow: 'inset 0 0 0 3px #ECE9E2' }}>
              <span style={{ position: 'absolute', left: 20, top: 34, width: 38, height: 3, borderRadius: 2, background: '#E2B04A' }} />
              <span style={{ position: 'absolute', left: 24, top: 40, width: 32, height: 3, borderRadius: 2, background: '#E2B04A' }} />
              <span style={blob(12, 16, 24, 13, { background: '#FFF6EC', boxShadow: 'inset 0 0 0 2px #F2785C', transform: 'rotate(-20deg)' })} />
              <span style={blob(42, 50, 24, 13, { background: '#FFF6EC', boxShadow: 'inset 0 0 0 2px #F2785C', transform: 'rotate(15deg)' })} />
              <span style={blob(46, 14, 16, 10, { background: '#3CCB7F' })} />
              <span style={blob(16, 50, 14, 9, { background: '#3CCB7F' })} />
            </span>
          </span>
        </>
      )}
      <span className="scan-anim" style={{ position: 'absolute', left: '50%', top: '50%', width: 150, height: 110, margin: '-59px 0 0 -75px', color: '#D2EE63', animation: 'scan-breathe 1.6s ease-in-out infinite' }}>
        <span style={corner('left', 'top')} />
        <span style={corner('right', 'top')} />
        <span style={corner('left', 'bottom')} />
        <span style={corner('right', 'bottom')} />
        <span className="scan-anim" style={{ position: 'absolute', left: 12, right: 12, top: 8, height: 3, borderRadius: 2, background: '#D2EE63', boxShadow: '0 0 12px 3px rgba(210,238,99,0.6)', ['--scan-travel' as string]: '91px', animation: `scan-line ${photo ? '0.8s' : '1.3s'} ease-in-out infinite alternate` }} />
      </span>
      <span style={{ position: 'absolute', left: 12, top: 12, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: '#D2EE63', color: '#16201E', fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>
        {photo ? 'Checking…' : 'Check the salt'}
      </span>
    </div>
  );
}

export function CameraIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx={12} cy={13} r={3} />
    </svg>
  );
}
