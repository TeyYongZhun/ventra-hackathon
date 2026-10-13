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
// Same limit as the server (MAX_NOTE_CHARS).
const NOTE_MAX = 200;

// Today's totals and the limits that count today (a limit changed today starts tomorrow).
export interface ScanTotals {
  saltUsedMg: number;
  saltLimitMg: number;
  drinksUsedMl: number;
  drinksLimitMl: number;
}

// "Scan my meal" (design/Meals.dc.html): take a photo (with an optional note about the meal),
// the AI estimates the salt (POST /api/vision/meal), and the patient checks the result before it
// is logged (POST /api/meals { scanId }). Soup or a drink in the meal is added to today's drinks
// with it. If the AI got it wrong, the patient can say what it is and check the same photo again.
export function MealScan({ totals, onLogged }: { totals: ScanTotals; onLogged: (meal: MealListEntry) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const status = useVisionStatus();
  const scan = useScanMeal();
  const addMeal = useAddMeal();
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [context, setContext] = useState('');
  const [message, setMessage] = useState('');
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
    setMessage('');
    setReading(true);
    let jpeg: string;
    try {
      jpeg = await photoToJpeg(file);
    } catch {
      setReading(false);
      setMessage("We couldn't read that photo. Please try again.");
      return;
    }
    setReading(false);
    setResult(null);
    setPhoto(jpeg);
    const note = context.trim();
    scan.mutate(note ? { photo: jpeg, note } : { photo: jpeg }, {
      onSuccess: (response) => {
        if (response.found) {
          setResult(response);
          return;
        }
        setPhoto(null);
        setMessage("We couldn't see a meal in this photo. Try again with the whole plate in view.");
      },
      onError: (error) => {
        setPhoto(null);
        setMessage(error.message || "We couldn't check this photo. Please try again.");
      },
    });
  }

  // "Not right? Tell us what it is": the same photo, checked again with the patient's words.
  function checkAgain(scanId: number, note: string) {
    setMessage('');
    scan.mutate({ scanId, note }, {
      onSuccess: (response) => {
        if (response.found) setResult(response);
        else setMessage("We still couldn't see a meal. Try taking another photo.");
      },
      onError: (error) => setMessage(error.message || "We couldn't check it again. Please try again."),
    });
  }

  function logIt(scanId: number) {
    setMessage('');
    addMeal.mutate({ scanId }, {
      onSuccess: (meal) => {
        setResult(null);
        setPhoto(null);
        setContext('');
        onLogged(meal);
      },
      onError: (error) => setMessage(error.message || "We couldn't log that. Please try again."),
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
          key={result.scanId}
          result={result}
          photo={photo}
          totals={totals}
          message={message}
          busy={addMeal.isPending || checking}
          rechecking={scan.isPending}
          onLog={() => logIt(result.scanId)}
          onCheckAgain={(note) => checkAgain(result.scanId, note)}
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
      {!off && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="meal-context" style={{ fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>Anything we should know? (optional)</label>
          <input
            id="meal-context"
            value={context}
            disabled={checking}
            maxLength={NOTE_MAX}
            autoComplete="off"
            placeholder="e.g. fish soup, half portion, no gravy"
            onChange={(event) => setContext(event.target.value)}
            style={{ minHeight: 'var(--touch-min)', padding: '0 16px', borderRadius: 16, border: '2px solid #5B6563', background: '#2E3836', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 20 }}
          />
        </div>
      )}
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
      {message && <p role="alert" style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600, color: '#F8DA98' }}>{message}</p>}
    </section>
  );
}

function Result({ result, photo, totals, message, busy, rechecking, onLog, onCheckAgain, onRetake }: {
  result: ScanResult;
  photo: string;
  totals: ScanTotals;
  message: string;
  busy: boolean;
  rechecking: boolean;
  onLog: () => void;
  onCheckAgain: (note: string) => void;
  onRetake: () => void;
}) {
  const { estimate, sure } = result;
  const tone = TONE[level(estimate.sodiumMg)];
  const [fixing, setFixing] = useState(false);
  const [fix, setFix] = useState('');
  const button: CSSProperties = { minHeight: 72, padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 'var(--radius-pill)', fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 };

  const { saltUsedMg, saltLimitMg, drinksUsedMl, drinksLimitMl } = totals;
  const saltAfter = saltUsedMg + estimate.sodiumMg;
  const fluidMl = estimate.fluidMl ?? 0;
  const drinksOverBy = drinksUsedMl + fluidMl - drinksLimitMl;

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
          We're not very sure about this one. If it looks wrong, tell us what it is below.
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
            {saltLimitMg > 0 ? `That is ${Math.round((estimate.sodiumMg / saltLimitMg) * 100)}% of your day. ` : ''}{estimate.tip}
          </p>
        </div>
      </div>
      {saltLimitMg > 0 && saltAfter > saltLimitMg && (
        <Warning>
          {saltUsedMg >= saltLimitMg
            ? `You're already over today's salt limit (${num(saltLimitMg)} mg). This meal adds ${num(estimate.sodiumMg)} mg more.`
            : `This meal would take you ${num(saltAfter - saltLimitMg)} mg over today's salt limit (${num(saltLimitMg)} mg).`}
        </Warning>
      )}
      {fluidMl > 0 && (
        <section aria-label="Added to your drinks" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 20, background: 'var(--color-sky-soft)', border: '2.5px solid var(--color-blue-ink)' }}>
          <p style={{ margin: 0, display: 'flex', gap: 12, fontSize: 21, lineHeight: '29px', fontWeight: 600 }}>
            <svg style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-blue-ink)' }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
            </svg>
            {`This meal has about ${num(fluidMl)} ml of ${estimate.fluidWhat || 'soup'}. It will be added to today's drinks.`}
          </p>
          {drinksLimitMl > 0 && drinksOverBy > 0 && (
            <Warning>{`That takes you ${num(drinksOverBy)} ml over today's drink limit (${num(drinksLimitMl)} ml).`}</Warning>
          )}
        </section>
      )}
      <button type="button" disabled={busy} onClick={onLog} style={{ ...button, border: 0, background: '#7CC7FE' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        Yes, log it
      </button>
      {fixing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (fix.trim()) onCheckAgain(fix.trim());
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 20, background: 'var(--color-sunken)' }}
        >
          <label htmlFor="meal-fix" style={{ fontSize: 21, lineHeight: '28px', fontWeight: 700 }}>What is it?</label>
          <input
            id="meal-fix"
            value={fix}
            disabled={busy}
            maxLength={NOTE_MAX}
            autoComplete="off"
            autoFocus
            placeholder="e.g. fish soup with rice, half portion"
            onChange={(event) => setFix(event.target.value)}
            style={{ minHeight: 'var(--touch-min)', padding: '0 16px', borderRadius: 16, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 20 }}
          />
          <button type="submit" disabled={busy || !fix.trim()} style={{ ...button, minHeight: 64, fontSize: 22, border: 0, background: 'var(--color-blue)', opacity: busy || !fix.trim() ? 0.6 : 1 }}>
            {rechecking ? 'Checking again…' : 'Check again'}
          </button>
        </form>
      ) : (
        <button type="button" disabled={busy} onClick={() => setFixing(true)} style={{ ...button, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
          Not right? Tell us what it is
        </button>
      )}
      <button type="button" disabled={busy} onClick={onRetake} style={{ ...button, minHeight: 'var(--touch-min)', fontSize: 21, border: 0, background: 'transparent', color: 'var(--color-blue-ink)' }}>
        <CameraIcon />
        Take another photo
      </button>
      {message && <p role="alert" style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600, color: 'var(--color-red)' }}>{message}</p>}
      <p style={{ margin: 0, fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>Estimated from your photo. Nothing is logged until you say yes.</p>
    </section>
  );
}

function Warning({ children }: { children: string }) {
  return (
    <p style={{ margin: 0, display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--color-red-soft)', border: '2.5px solid var(--color-red)', fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>
      <svg style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-red)' }} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      {children}
    </p>
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
