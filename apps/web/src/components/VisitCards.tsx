import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { VisitEntry } from '@ventra/core';
import { useDeleteVisit } from '../lib/api';

// Visit cards for Calendar (design/Calendar.dc.html): the next visit large, with what to bring
// and "Get ready for this visit"; later visits small. Each can be removed (asks first).
const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function dateParts(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return { day: WEEKDAY[date.getUTCDay()]!, num: String(date.getUTCDate()) };
}

export function daysUntil(today: string, iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
}

function whenLabel(days: number): string {
  if (days <= 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  return `IN ${days} DAYS`;
}

export function DateBox({ iso, size = 'large', tone = 'blue' }: { iso: string; size?: 'large' | 'small'; tone?: 'blue' | 'soft' | 'white' }) {
  const { day, num } = dateParts(iso);
  const large = size === 'large';
  const colours: Record<string, CSSProperties> = {
    blue: { background: 'var(--color-blue)', color: 'var(--color-ink)' },
    soft: { background: 'var(--color-blue-soft)', color: 'var(--color-blue-ink)' },
    white: { background: 'var(--color-surface)', color: 'var(--color-blue-ink)' },
  };
  return (
    <div aria-hidden="true" style={{ width: large ? 80 : 72, height: large ? 88 : 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 14, ...colours[tone] }}>
      <span style={{ fontSize: large ? 18 : 17, fontWeight: 700 }}>{day}</span>
      <span style={{ fontSize: large ? 38 : 34, lineHeight: large ? '42px' : '38px', fontWeight: 700 }}>{num}</span>
    </div>
  );
}

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function NextVisitCard({ visit, today }: { visit: VisitEntry; today: string }) {
  const sub = [visit.doctor, visit.place].filter(Boolean).join(' · ');
  return (
    <section aria-label={`Next visit: ${visit.title}, ${longDate(visit.date)} at ${visit.time}`} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 24, background: 'var(--color-surface)', border: '3px solid var(--color-blue-ink)' }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-blue-ink)' }}>{whenLabel(daysUntil(today, visit.date))}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <DateBox iso={visit.date} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>{visit.title}</span>
          <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{visit.time}</span>
          {sub && <span style={{ fontSize: 19, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>{sub}</span>}
        </div>
      </div>
      {visit.bring && (
        <div style={{ padding: 16, borderRadius: 14, background: 'var(--color-sunken)' }}>
          <strong style={{ display: 'block', fontSize: 20, lineHeight: '28px' }}>Bring:</strong>
          <span style={{ display: 'block', fontSize: 20, lineHeight: '30px' }}>{visit.bring}</span>
        </div>
      )}
      <Link to="/visit" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 23, fontWeight: 700 }}>
        Get ready for this visit
      </Link>
      <RemoveVisit visit={visit} />
    </section>
  );
}

export function VisitCard({ visit }: { visit: VisitEntry }) {
  const sub = [visit.time, visit.place ?? visit.doctor].filter(Boolean).join(' · ');
  return (
    <section aria-label={`Visit: ${visit.title}, ${longDate(visit.date)} at ${visit.time}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <DateBox iso={visit.date} size="small" tone="soft" />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{visit.title}</span>
          <span style={{ fontSize: 20, lineHeight: '28px' }}>{sub}</span>
        </div>
      </div>
      <RemoveVisit visit={visit} />
    </section>
  );
}

function RemoveVisit({ visit }: { visit: VisitEntry }) {
  const remove = useDeleteVisit();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} style={{ alignSelf: 'flex-start', minHeight: 44, padding: 0, border: 0, background: 'none', color: 'var(--color-ink-muted)', fontFamily: 'inherit', fontSize: 18, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
        Remove
      </button>
    );
  }
  return (
    <div role="group" aria-label={`Remove ${visit.title}?`} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 16, background: 'var(--color-red-soft)' }}>
      <span style={{ fontSize: 19, lineHeight: '26px', fontWeight: 700 }}>Remove {visit.title}?</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate(visit.id, { onSettled: () => setAsking(false) })}
          style={{ minHeight: 56, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-red)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 19, fontWeight: 700, cursor: 'pointer' }}
        >
          Yes, remove
        </button>
        <button type="button" onClick={() => setAsking(false)} style={{ minHeight: 56, borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 19, fontWeight: 700, cursor: 'pointer' }}>
          Keep
        </button>
      </div>
    </div>
  );
}
