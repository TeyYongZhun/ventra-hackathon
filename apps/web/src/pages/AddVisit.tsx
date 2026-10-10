import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IsoDate } from '@ventra/core';
import { PageHeader } from '../components';
import { useAddVisit, useVisits } from '../lib/api';
import { field, fieldLabel, primaryButton } from '../lib/formStyles';

// Add a visit (Calendar → "Add a visit"). Big fields and quick picks for the common ones;
// the phone's own date and time pickers. Saves through POST /api/visits, then back to Calendar.
const QUICK = ['Heart clinic', 'Blood test', 'Polyclinic', 'Pharmacy'];

// "14:30" (time input) → "2:30 PM"
function toClock(value: string): string {
  const [h, m] = value.split(':').map(Number) as [number, number];
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function AddVisit() {
  const navigate = useNavigate();
  const add = useAddVisit();
  const today = useVisits().data?.today;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [doctor, setDoctor] = useState('');
  const [place, setPlace] = useState('');
  const [bring, setBring] = useState('');
  const ready = title.trim().length > 0 && date.length === 10 && time.length >= 4 && (!today || date >= today);

  function save() {
    add.mutate(
      { title: title.trim(), date: date as IsoDate, time: toClock(time), doctor: doctor.trim(), place: place.trim(), bring: bring.trim() },
      { onSuccess: () => navigate('/more') },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader back={{ to: '/more', label: 'Back to calendar' }} title="Add a visit" titleSize={32} />

      <label htmlFor="v-title" style={fieldLabel}>What is it?</label>
      <div role="group" aria-label="Quick picks" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QUICK.map((pick) => (
          <button
            key={pick}
            type="button"
            aria-pressed={title === pick}
            onClick={() => setTitle(pick)}
            style={{ minHeight: 52, padding: '0 18px', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: title === pick ? 'var(--color-blue)' : 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 19, fontWeight: 700, cursor: 'pointer' }}
          >
            {pick}
          </button>
        ))}
      </div>
      <input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Heart clinic" maxLength={80} style={field} />

      <label htmlFor="v-date" style={fieldLabel}>Date</label>
      <input id="v-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} style={field} />

      <label htmlFor="v-time" style={fieldLabel}>Time</label>
      <input id="v-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={field} />

      <label htmlFor="v-place" style={fieldLabel}>Where (optional)</label>
      <input id="v-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Level 3, Room 12" maxLength={120} style={field} />

      <label htmlFor="v-doctor" style={fieldLabel}>Doctor (optional)</label>
      <input id="v-doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="e.g. Dr Lim" maxLength={80} style={field} />

      <label htmlFor="v-bring" style={fieldLabel}>What to bring (optional)</label>
      <input id="v-bring" value={bring} onChange={(e) => setBring(e.target.value)} placeholder="e.g. Medicine list, IC card" maxLength={160} style={field} />

      {add.isError && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>We couldn't save that visit. Please check the date and try again.</p>
      )}
      <button type="button" disabled={!ready || add.isPending} onClick={save} style={primaryButton(ready)}>
        {add.isPending ? 'Saving…' : 'Save visit'}
      </button>
    </div>
  );
}
