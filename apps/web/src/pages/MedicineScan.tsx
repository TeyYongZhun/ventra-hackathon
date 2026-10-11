import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { IScannerControls } from '@zxing/browser';
import type { DecodeHintType as HintType } from '@zxing/library';
import { clock, type MedicineScanResponse } from '@ventra/core';
import { PageHeader } from '../components';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { useLookupBarcode } from '../lib/api';
import { PillShape } from './Medicine';

// D1 · Scan a medicine box (design/ScanFound.dc.html, design/ScanUnknown.dc.html).
// The camera reads the box's barcode on the phone (ZXing, loaded only on this screen), then
// GET /api/medicines/barcode/:code says what it is and whether it is on the patient's list.
// Explanation only: nothing here changes the list or gives a dose.
type Phase = 'starting' | 'scanning' | 'checking' | 'done' | 'no-camera';

const LIME = '#D2EE63';
const GREEN = '#3CCB7F';

// Starts the back camera in `video` and calls onCode once with the first barcode read.
// Returns the controls to stop it.
async function startScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<IScannerControls> {
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
  const hints = new Map<HintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, formats]]);
  const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 150 });
  let done = false;
  return reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: 'environment' } } }, video, (result, _error, controls) => {
    if (!result || done) return;
    done = true;
    controls.stop();
    onCode(result.getText());
  });
}

export default function MedicineScan() {
  const video = useRef<HTMLVideoElement>(null);
  const lookup = useLookupBarcode();
  const [phase, setPhase] = useState<Phase>('starting');
  const [attempt, setAttempt] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');

  function check(code: string) {
    setPhase('checking');
    lookup.mutate(code, { onSettled: () => setPhase('done') });
  }

  // (Re)start the camera on open and on "Scan another"; stop it when leaving.
  useEffect(() => {
    let stopped = false;
    let controls: IScannerControls | null = null;
    if (!video.current || !navigator.mediaDevices?.getUserMedia) {
      setPhase('no-camera');
      return;
    }
    startScanner(video.current, (code) => {
      if (stopped) return;
      navigator.vibrate?.(60);
      check(code);
    })
      .then((started) => {
        if (stopped) started.stop();
        else {
          controls = started;
          setPhase((current) => (current === 'starting' ? 'scanning' : current));
        }
      })
      .catch(() => {
        if (!stopped) setPhase('no-camera');
      });
    return () => {
      stopped = true;
      controls?.stop();
    };
    // Only "Scan another" (attempt) restarts the camera; check() uses the stable mutate.
  }, [attempt]);

  function again() {
    lookup.reset();
    setTyped('');
    setTyping(false);
    setPhase('starting');
    setAttempt((n) => n + 1);
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    const code = typed.replace(/\D/g, '');
    if (code.length < 8 || code.length > 14) return;
    check(code);
  }

  const result = phase === 'done' ? lookup.data : undefined;
  const failed = phase === 'done' && lookup.isError;
  const live = phase === 'scanning';
  const frameColour = result?.status === 'yours' ? GREEN : LIME;
  const pill = phase === 'starting' ? 'Starting the camera…'
    : phase === 'scanning' ? 'Hold the box inside the frame'
      : phase === 'checking' ? 'Checking…'
        : phase === 'no-camera' ? 'Camera not available'
          : result?.status === 'unknown' ? "We don't know this box"
            : result ? `Found: ${result.medicine.name}`
              : "Couldn't check";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <PageHeader back={{ to: '/medicine', label: 'Back to medicine' }} title="Scan" />

      <div role="group" aria-label="Camera scanner" style={{ position: 'relative', height: 250, flexShrink: 0, borderRadius: 28, background: '#222C2A', overflow: 'hidden' }}>
        <video ref={video} muted playsInline aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: live ? 1 : 0, transition: 'opacity 200ms ease-out' }} />
        {!live && phase !== 'done' && <HeldBox />}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 224, height: 140, margin: '-88px 0 0 -112px' }}>
          <div aria-hidden="true" className="scan-anim" style={{ position: 'absolute', inset: 0, color: frameColour, transition: 'color 300ms ease-out', animation: phase === 'done' ? 'none' : 'scan-breathe 1.6s ease-in-out infinite' }}>
            <Corners />
          </div>
          {live && (
            <span aria-hidden="true" className="scan-anim" style={{ position: 'absolute', left: 12, right: 12, top: 6, height: 4, borderRadius: 2, background: LIME, boxShadow: '0 0 14px 3px rgba(210,238,99,0.65)', ['--scan-travel' as string]: '124px', animation: 'scan-line 1.2s ease-in-out infinite alternate' }} />
          )}
          {result?.status === 'yours' && <FoundTick />}
        </div>
        {phase === 'done' && (
          <button type="button" onClick={again} aria-label="Scan again" style={{ position: 'absolute', top: 12, right: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: 0, background: 'rgba(255,255,255,0.16)', color: '#FFFFFF', cursor: 'pointer' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        )}
        <span aria-live="polite" style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 'var(--radius-pill)', background: 'rgba(0,0,0,0.55)', color: '#FFFFFF', fontSize: 18, lineHeight: '24px', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 'calc(100% - 24px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span aria-hidden="true" className="scan-anim" style={{ width: 10, height: 10, flexShrink: 0, borderRadius: 'var(--radius-pill)', background: result?.status === 'yours' ? GREEN : LIME, animation: live || phase === 'starting' ? 'scan-blink 1s ease-in-out infinite' : 'none' }} />
          {pill}
        </span>
      </div>

      {phase === 'no-camera' && (
        <p role="alert" style={{ margin: 0, fontSize: 21, lineHeight: '30px' }}>
          We couldn't open the camera. Allow camera access for this site, or type the number under the barcode.
        </p>
      )}

      {phase !== 'done' && phase !== 'checking' && (
        typing || phase === 'no-camera' ? (
          <form onSubmit={submitTyped} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
            <label htmlFor="barcode-number" style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>Number under the barcode</label>
            <input
              id="barcode-number"
              inputMode="numeric"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value.replace(/[^\d ]/g, '').slice(0, 20))}
              placeholder="e.g. 2000000000022"
              style={{ height: 64, padding: '0 18px', borderRadius: 16, border: '2.5px solid var(--color-ink)', fontFamily: 'inherit', fontSize: 24, letterSpacing: '0.04em' }}
            />
            <button type="submit" disabled={typed.replace(/\D/g, '').length < 8} style={{ ...bigButton, background: 'var(--color-blue)', border: 0, opacity: typed.replace(/\D/g, '').length < 8 ? 0.5 : 1 }}>Check this number</button>
          </form>
        ) : (
          <button type="button" onClick={() => setTyping(true)} style={{ ...bigButton, height: 64, fontSize: 21, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
            Type the number instead
          </button>
        )
      )}

      {result && result.status !== 'unknown' && <MedicineFound result={result} />}
      {result?.status === 'unknown' && <UnknownBox />}
      {failed && (
        <p role="alert" style={{ margin: 0, fontSize: 21, lineHeight: '30px', fontWeight: 600 }}>
          We couldn't check that box right now. Please try again.
        </p>
      )}

      {phase === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {result?.status === 'yours' ? (
            <Link to="/medicine" style={{ ...bigButton, background: 'var(--color-blue)', border: 0, textDecoration: 'none' }}>Back to my medicines</Link>
          ) : (
            <Link to="/nurse" style={{ ...bigButton, background: 'var(--color-blue)', border: 0, textDecoration: 'none', gap: 12 }}>
              <PhoneIcon />
              Call my nurse
            </Link>
          )}
          <button type="button" onClick={again} style={{ ...bigButton, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
            {result?.status === 'yours' ? 'Scan another' : 'Try scanning again'}
          </button>
        </div>
      )}
    </div>
  );
}

const bigButton: CSSProperties = {
  height: 76,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-pill)',
  color: 'var(--color-ink)',
  fontFamily: 'inherit',
  fontSize: 24,
  fontWeight: 700,
  cursor: 'pointer',
};

function MedicineFound({ result }: { result: Extract<MedicineScanResponse, { medicine: unknown }> }) {
  const { medicine, leaflet, status } = result;
  const yours = status === 'yours';
  const when = medicine.times.map(clock).join(' and ');
  const howToTake = yours ? `As your doctor told you: ${when}. Swallow with water.` : '';
  const spoken = yours
    ? `${medicine.name}. ${medicine.generic} ${medicine.strength}. What it's for: ${medicine.purpose} How to take it: ${howToTake} You may feel: ${leaflet.mayFeel} When to call the nurse: ${leaflet.callNurse}`
    : `${medicine.name}. ${medicine.generic} ${medicine.strength}. This is not on your medicine list. Please ask your pharmacist or nurse before you take it.`;

  return (
    <section aria-label={yours ? 'Found it' : 'Not on your list'} style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, borderRadius: 32, background: 'var(--color-surface)', border: `3px solid ${yours ? '#1B6F45' : 'var(--color-yellow-ink)'}`, animation: 'vt-rise 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-pill)', background: yours ? '#1B6F45' : 'var(--color-yellow-soft)', color: yours ? '#FFFFFF' : 'var(--color-ink)', border: yours ? 0 : '2px solid var(--color-yellow-ink)', fontSize: 20, fontWeight: 700 }}>
          {yours ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          ) : (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          )}
          {yours ? 'Found it' : 'Not on your list'}
        </span>
        <ReadAloudButton text={spoken} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 32, lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.015em' }}>{medicine.name}</h2>
        <span style={{ fontSize: 21, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>{medicine.generic} {medicine.strength}</span>
      </div>
      {!yours && (
        <p style={{ margin: 0, fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>
          This is not one of your medicines. Please ask your pharmacist or nurse before you take it.
        </p>
      )}
      <Section title="What it's for">{medicine.purpose}</Section>
      {yours && (
        <>
          <Section title="How to take it">{howToTake}</Section>
          <Section title="You may feel">{leaflet.mayFeel}</Section>
          <Section title="When to call the nurse" danger>{leaflet.callNurse}</Section>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, background: 'var(--color-sunken)' }}>
        <span role="img" aria-label={`Pill: ${medicine.looks.toLowerCase()}`} style={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--color-surface)' }}>
          <PillShape med={medicine} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink-muted)' }}>Looks like</span>
          <span style={{ fontSize: 20, lineHeight: '27px', fontWeight: 700 }}>{medicine.looks}</span>
        </span>
      </div>
    </section>
  );
}

function Section({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '2px solid var(--color-line)' }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: danger ? 'var(--color-red)' : undefined }}>{title}</span>
      <p style={{ margin: 0, fontSize: 21, lineHeight: '30px' }}>{children}</p>
    </div>
  );
}

function UnknownBox() {
  return (
    <section aria-label="Unknown product" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 22px', borderRadius: 32, background: 'var(--color-yellow-soft)', border: '3px solid var(--color-yellow-ink)', textAlign: 'center', animation: 'vt-rise 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both' }}>
      <span aria-hidden="true" style={{ width: 112, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: '#F8DA98', color: 'var(--color-ink)' }}>
        <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
      </span>
      <h2 style={{ margin: 0, fontSize: 32, lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.015em' }}>I don't know this product</h2>
      <p style={{ margin: 0, fontSize: 22, lineHeight: '32px' }}>It may be a herbal remedy or supplement. Some of these can be unsafe with heart medicine.</p>
      <p style={{ margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 700 }}>Please ask your pharmacist before you take it.</p>
    </section>
  );
}

function Corners() {
  const corner = (side: 'left' | 'right', end: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute', [side]: 0, [end]: 0, width: 40, height: 40,
    [`border${side === 'left' ? 'Left' : 'Right'}`]: '6px solid currentColor',
    [`border${end === 'top' ? 'Top' : 'Bottom'}`]: '6px solid currentColor',
    borderRadius: side === 'left' ? (end === 'top' ? '12px 0 0 0' : '0 0 0 12px') : (end === 'top' ? '0 12px 0 0' : '0 0 12px 0'),
  });
  return (
    <>
      <span style={corner('left', 'top')} />
      <span style={corner('right', 'top')} />
      <span style={corner('left', 'bottom')} />
      <span style={corner('right', 'bottom')} />
    </>
  );
}

function FoundTick() {
  const dot: CSSProperties = { position: 'absolute', left: '50%', top: '50%', width: 72, height: 72, margin: '-36px 0 0 -36px', borderRadius: 'var(--radius-pill)', background: GREEN };
  return (
    <>
      <span aria-hidden="true" className="scan-anim" style={{ ...dot, animation: 'scan-ping 1.2s ease-out 1 both' }} />
      <span aria-hidden="true" className="scan-anim" style={{ ...dot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16201E', boxShadow: '0 0 0 6px rgba(60,203,127,0.35)', animation: 'scan-pop 420ms cubic-bezier(0.2, 1.4, 0.4, 1) both' }}>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.25} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    </>
  );
}

// The design's picture of a medicine box held up to the camera, shown until the camera is live.
function HeldBox() {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, background: '#2E3836' }} />
      <div aria-hidden="true" className="scan-anim" style={{ position: 'absolute', left: '50%', top: '50%', width: 176, height: 96, margin: '-66px 0 0 -88px', display: 'flex', borderRadius: 8, background: '#FFFFFF', overflow: 'hidden', boxShadow: '0 14px 24px rgba(0,0,0,0.35)', animation: 'scan-hold 3.2s ease-in-out infinite' }}>
        <span style={{ width: 30, flexShrink: 0, background: '#4F8FD6' }} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '0 12px' }}>
          <span style={{ width: 84, height: 9, borderRadius: 4, background: '#16201E' }} />
          <span style={{ width: 56, height: 7, borderRadius: 4, background: '#8C877B' }} />
          <span style={{ width: 70, height: 14, marginTop: 4, background: 'repeating-linear-gradient(90deg, #16201E 0 2px, #FFFFFF 2px 4px)' }} />
        </span>
      </div>
    </>
  );
}

function PhoneIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
