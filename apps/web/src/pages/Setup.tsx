import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MEDICINE_CATALOG, clock } from '@ventra/core';
import { SOSButton } from '../components';
import { useSaveCap, useSaveContact, useSaveMedications, useSaveProfile, useSaveTargets } from '../lib/api';
import { field, fieldLabel, primaryButton, secondaryButton } from '../lib/formStyles';

// A2–A6 · Set-up after sign-up (design/Setup, Baselines, CapSize, Contacts .dc.html).
// A new patient starts empty; these steps give them their own limits and medicines.
const STEPS = 5;

export default function Setup() {
  const { step } = useParams();
  const n = Math.min(Math.max(Number(step) || 1, 1), STEPS);
  const navigate = useNavigate();
  const next = () => navigate(n < STEPS ? `/setup/${n + 1}` : '/home');

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '24px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--color-canvas)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {n > 1 && (
          <Link to={`/setup/${n - 1}`} aria-label="Back" style={{ width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-ink)', border: '2.5px solid var(--color-ink)' }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
        )}
        <span style={{ flex: 1, fontSize: 'var(--text-tag)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>Step {n + 1} of {STEPS + 1}</span>
        <SOSButton />
      </header>
      {n === 1 && <TextSizeStep onDone={next} />}
      {n === 2 && <NumbersStep onDone={next} />}
      {n === 3 && <MedicinesStep onDone={next} />}
      {n === 4 && <CapStep onDone={next} />}
      {n === 5 && <ContactStep onDone={next} />}
    </div>
  );
}

function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>{children}</h1>
      {sub && <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>{sub}</p>}
    </>
  );
}

function SaveError({ show }: { show: boolean }) {
  return show ? <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>We couldn't save that. Please check and try again.</p> : null;
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{ minHeight: 'var(--touch-button)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderRadius: 'var(--radius-lg)', border: on ? '3px solid var(--color-blue-ink)' : '2.5px solid var(--color-ink)', background: on ? 'var(--color-blue-soft)' : 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
    >
      {children}
      <span aria-hidden="true" style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-blue-ink)' }}>{on ? '✓' : ''}</span>
    </button>
  );
}

// A2 · Text size
function TextSizeStep({ onDone }: { onDone: () => void }) {
  const save = useSaveProfile();
  const [size, setSize] = useState<'large' | 'xl'>('large');
  return (
    <>
      <Title>Make it easy to read</Title>
      <Choice on={size === 'large'} onClick={() => setSize('large')}>
        <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ fontSize: 24 }}>Large</strong><span style={{ fontSize: 22 }}>Drink 1 cap of water.</span></span>
      </Choice>
      <Choice on={size === 'xl'} onClick={() => setSize('xl')}>
        <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ fontSize: 28 }}>Extra large</strong><span style={{ fontSize: 26 }}>Drink 1 cap of water.</span></span>
      </Choice>
      <SaveError show={save.isError} />
      <button type="button" disabled={save.isPending} onClick={() => save.mutate({ textSize: size }, { onSuccess: onDone })} style={primaryButton(!save.isPending)}>Next</button>
    </>
  );
}

// A3 · Clinic baselines (filled in by the care team)
function NumbersStep({ onDone }: { onDone: () => void }) {
  const profile = useSaveProfile();
  const targets = useSaveTargets();
  const [values, setValues] = useState({ age: '', dryKg: '', fluidMl: '1500', sodiumMg: '2000', alertGainKg: '2', alertDays: '3' });
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: event.target.value });
  const numbers = {
    age: Number(values.age), dryKg: Number(values.dryKg), fluidMl: Number(values.fluidMl),
    sodiumMg: Number(values.sodiumMg), alertGainKg: Number(values.alertGainKg), alertDays: Number(values.alertDays),
  };
  const ready = numbers.age >= 18 && numbers.dryKg >= 25 && numbers.fluidMl >= 500 && numbers.sodiumMg >= 500 && numbers.alertGainKg > 0 && numbers.alertDays >= 1;

  function save() {
    profile.mutate({ age: Math.round(numbers.age) }, {
      onSuccess: () => targets.mutate({
        dryKg: numbers.dryKg, fluidMl: Math.round(numbers.fluidMl), sodiumMg: Math.round(numbers.sodiumMg),
        alertGainKg: numbers.alertGainKg, alertDays: Math.round(numbers.alertDays),
      }, { onSuccess: onDone }),
    });
  }

  const input = (id: keyof typeof values, label: string, unit: string, mode: 'decimal' | 'numeric' = 'numeric') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={`n-${id}`} style={fieldLabel}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input id={`n-${id}`} inputMode={mode} value={values[id]} onChange={set(id)} style={{ ...field, flex: 1 }} />
        <span style={{ width: 40, fontSize: 20, fontWeight: 700 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <>
      <span style={{ alignSelf: 'flex-start', padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--color-ink)', color: 'var(--color-surface)', fontSize: 'var(--text-tag)', fontWeight: 700 }}>Clinic staff</span>
      <Title sub="The care team fills this in. The patient can see these numbers.">Patient's numbers</Title>
      {input('age', 'Age', 'yrs')}
      {input('dryKg', 'Dry weight', 'kg', 'decimal')}
      {input('fluidMl', 'Drink limit per day', 'ml')}
      {input('sodiumMg', 'Salt (sodium) limit per day', 'mg')}
      {input('alertGainKg', 'Warn when weight goes up by', 'kg', 'decimal')}
      {input('alertDays', '…within this many days', 'days')}
      {ready && (
        <p style={{ margin: 0, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-blue-soft)', fontSize: 19, lineHeight: '27px' }}>
          The patient will see: <strong>"Call the nurse if you gain {numbers.alertGainKg} kg or more in {numbers.alertDays} days."</strong>
        </p>
      )}
      <SaveError show={profile.isError || targets.isError} />
      <button type="button" disabled={!ready || profile.isPending || targets.isPending} onClick={save} style={primaryButton(ready)}>Save and next</button>
    </>
  );
}

// Medicines, picked from the heart-failure list
function MedicinesStep({ onDone }: { onDone: () => void }) {
  const save = useSaveMedications();
  const [picked, setPicked] = useState<Record<string, number[]>>({});
  const toggleMed = (id: string, times: number[]) =>
    setPicked((current) => {
      const copy = { ...current };
      if (copy[id]) delete copy[id];
      else copy[id] = times;
      return copy;
    });
  const toggleTime = (id: string, time: number) =>
    setPicked((current) => {
      const times = current[id] ?? [];
      const nextTimes = times.includes(time) ? times.filter((t) => t !== time) : [...times, time];
      return { ...current, [id]: nextTimes.length ? nextTimes : times };
    });

  return (
    <>
      <Title sub="Tick each medicine on the patient's list. Check the times with the discharge letter.">Medicines</Title>
      {MEDICINE_CATALOG.map((med) => {
        const times = picked[med.id];
        return (
          <div key={med.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Choice on={Boolean(times)} onClick={() => toggleMed(med.id, med.times)}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: 21 }}>{med.name}</strong>
                <span style={{ fontSize: 18, color: 'var(--color-ink-muted)' }}>{med.generic} {med.strength}</span>
              </span>
            </Choice>
            {times && (
              <div role="group" aria-label={`${med.name} times`} style={{ display: 'flex', gap: 8, paddingLeft: 12 }}>
                {[480, 1200].map((time) => (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={times.includes(time)}
                    onClick={() => toggleTime(med.id, time)}
                    style={{ minHeight: 56, padding: '0 18px', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: times.includes(time) ? 'var(--color-blue)' : 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 19, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {time < 720 ? 'Morning' : 'Evening'} {clock(time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <SaveError show={save.isError} />
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate({ meds: Object.entries(picked).map(([id, times]) => ({ id, times })) }, { onSuccess: onDone })}
        style={primaryButton(!save.isPending)}
      >
        {Object.keys(picked).length ? 'Save and next' : 'No medicines for now — next'}
      </button>
    </>
  );
}

// A5 · Cap size (design/CapSize.dc.html)
function CapStep({ onDone }: { onDone: () => void }) {
  const save = useSaveCap();
  const [capMl, setCapMl] = useState(150);
  const sizes = [100, 150, 200];
  return (
    <>
      <Title sub='Use the lid of your own thermos. Later you just tap "Full cap" — we count for you.'>How much does your cap hold?</Title>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--color-sky-soft)' }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>1 full cap</span>
        <span aria-live="polite" style={{ fontSize: 56, lineHeight: '60px', fontWeight: 700 }}>{capMl} <span style={{ fontSize: 26 }}>ml</span></span>
      </div>
      <div role="radiogroup" aria-label="Cap size" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {sizes.map((size) => (
          <button key={size} type="button" role="radio" aria-checked={capMl === size} onClick={() => setCapMl(size)}
            style={{ minHeight: 'var(--touch-button)', borderRadius: 'var(--radius-lg)', border: capMl === size ? '3px solid var(--color-blue-ink)' : '2.5px solid var(--color-ink)', background: capMl === size ? 'var(--color-blue)' : 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}>
            {size} ml
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <button type="button" aria-label="10 ml less" onClick={() => setCapMl((v) => Math.max(v - 10, 20))} style={{ ...secondaryButton, width: 76, cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: 18, color: 'var(--color-ink-muted)' }}>Other size: 10 ml a tap</span>
        <button type="button" aria-label="10 ml more" onClick={() => setCapMl((v) => Math.min(v + 10, 1000))} style={{ ...secondaryButton, width: 76, cursor: 'pointer' }}>+</button>
      </div>
      <SaveError show={save.isError} />
      <button type="button" disabled={save.isPending} onClick={() => save.mutate({ capMl }, { onSuccess: onDone })} style={primaryButton(!save.isPending)}>Save cap size</button>
    </>
  );
}

// A6 · Who should we call? (design/Contacts.dc.html)
function ContactStep({ onDone }: { onDone: () => void }) {
  const save = useSaveContact();
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const ready = name.trim().length > 0 && relation.trim().length > 0;
  return (
    <>
      <Title sub="If you need help, we will tell this person. You choose what they see later, in More.">Who should we tell?</Title>
      <label htmlFor="c-name" style={fieldLabel}>Family member's name</label>
      <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tan Mei Ling" style={field} />
      <label htmlFor="c-rel" style={fieldLabel}>They are my…</label>
      <input id="c-rel" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. daughter" style={field} />
      <label htmlFor="c-phone" style={fieldLabel}>Phone number (optional)</label>
      <input id="c-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={field} />
      <SaveError show={save.isError} />
      <button type="button" disabled={!ready || save.isPending} onClick={() => save.mutate({ name: name.trim(), relation: relation.trim(), phone: phone.trim() || undefined }, { onSuccess: onDone })} style={primaryButton(ready)}>
        Finish set-up
      </button>
      <button type="button" onClick={onDone} style={{ ...secondaryButton, cursor: 'pointer' }}>Skip for now</button>
    </>
  );
}
