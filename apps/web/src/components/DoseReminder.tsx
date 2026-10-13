import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMetrics } from '../lib/api';
import { demoReminder, demoReminderOn, dueReminder, notificationsSupported, notifyDose, reminderText, sgNow } from '../lib/reminders';

// Banner at the top of every screen from 15 minutes before a dose until it is taken
// (lib/reminders.ts), plus a phone notification if the patient turned reminders on.
// Not on the Medicine screen itself, which already shows what is due.
export function DoseReminderBanner() {
  const metrics = useMetrics();
  const location = useLocation();
  const [now, setNow] = useState(() => sgNow());

  // The clock moves on even when nothing else on the page does.
  useEffect(() => {
    const timer = setInterval(() => setNow(sgNow()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  const data = metrics.data;
  // Only for today's doses (the demo patient's day can differ from the phone's), or the
  // demo button's reminder for a few minutes.
  const real = data && data.today === now.date ? dueReminder(data.pillsToday.all, now.minutes) : null;
  const reminder = real ?? (data && demoReminderOn() ? demoReminder(data.pillsToday.all) : null);

  // Once per dose time (notifyDose also remembers it for the day).
  const dueTime = reminder?.time;
  useEffect(() => {
    if (real) void notifyDose(now.date, real);
  }, [dueTime, now.date]);

  if (!reminder || location.pathname.startsWith('/medicine')) return null;
  return (
    <Link
      to="/medicine"
      style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', borderRadius: 24, background: 'var(--color-coral-soft)', border: '3px solid var(--color-ink)', color: 'var(--color-ink)', textDecoration: 'none' }}
    >
      <span aria-hidden="true" style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)' }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{reminderText(reminder)}</span>
        <span style={{ fontSize: 19, lineHeight: '26px' }}>{reminder.names.join(', ')}</span>
      </span>
      <svg style={{ flexShrink: 0 }} width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

// "Remind me on this phone" on the Medicine screen: asks the browser for notification permission.
export function PhoneRemindersSetting() {
  const supported = notificationsSupported();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => (supported ? Notification.permission : 'unsupported'));

  if (permission === 'unsupported') return null;
  const text = permission === 'granted'
    ? "Phone reminders are on. We'll remind you 15 minutes before your pills while Ventra is open."
    : permission === 'denied'
      ? 'Phone reminders are blocked. To turn them on, allow notifications for Ventra in your browser settings.'
      : 'Get a reminder on this phone 15 minutes before your pills, while Ventra is open.';

  return (
    <section aria-label="Phone reminders" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
      <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>{text}</p>
      {permission === 'default' && (
        <button
          type="button"
          onClick={async () => {
            try {
              setPermission(await Notification.requestPermission());
            } catch {
              setPermission(Notification.permission);
            }
          }}
          style={{ minHeight: 'var(--touch-button)', borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-ink)', color: 'var(--color-surface)', fontFamily: 'inherit', fontSize: 22, fontWeight: 700, cursor: 'pointer' }}
        >
          Remind me on this phone
        </button>
      )}
    </section>
  );
}
