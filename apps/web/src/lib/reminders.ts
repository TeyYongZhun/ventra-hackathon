import { clock, type DoseStatus } from '@ventra/core';

// Medicine reminders while the app is open: from 15 minutes before a dose until it is taken (up
// to 3 hours after, when it counts as missed). Times are Singapore time, like the server's.
export const REMIND_BEFORE_MIN = 15;
export const REMIND_AFTER_MIN = 180;

const sgParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Today's date (YYYY-MM-DD) and minutes after midnight in Singapore.
export function sgNow(ms = Date.now()): { date: string; minutes: number } {
  const parts = Object.fromEntries(sgParts.formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export interface DoseReminder {
  // Minutes after midnight, and as shown ("8 PM")
  time: number;
  label: string;
  names: string[];
  // Minutes until it's due; 0 or less once it is due
  dueInMin: number;
}

// The earliest dose time with pills still to take inside the reminder window, or null.
export function dueReminder(doses: DoseStatus[], nowMin: number): DoseReminder | null {
  const times = [...new Set(doses.filter((dose) => !dose.taken).map((dose) => dose.time))].sort((a, b) => a - b);
  const time = times.find((t) => nowMin >= t - REMIND_BEFORE_MIN && nowMin <= t + REMIND_AFTER_MIN);
  if (time == null) return null;
  return {
    time,
    label: clock(time),
    names: doses.filter((dose) => dose.time === time && !dose.taken).map((dose) => dose.med.name),
    dueInMin: time - nowMin,
  };
}

export function reminderText(reminder: DoseReminder): string {
  return reminder.dueInMin > 0
    ? `Your ${reminder.label} pills are due in ${reminder.dueInMin} minute${reminder.dueInMin === 1 ? '' : 's'}`
    : `Time for your ${reminder.label} pills`;
}

// ------------------------------------------------------------------
// Phone notifications (only while the app is open or was used recently: there is no push server)
// ------------------------------------------------------------------

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

const notifiedKey = (date: string, time: number) => `ventra.notified.${date}.${time}`;

// Shows one phone notification per dose time per day, if the patient allowed notifications.
// again: the demo button, which shows it even if this dose was already notified.
export async function notifyDose(date: string, reminder: DoseReminder, again = false): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    if (!again && localStorage.getItem(notifiedKey(date, reminder.time)) === '1') return;
    localStorage.setItem(notifiedKey(date, reminder.time), '1');
  } catch {
    // Storage blocked: may notify again on the next check, which is better than never.
  }
  const options = { body: reminder.names.join(', '), tag: `dose-${date}-${reminder.time}`, icon: '/icon-192x192.png' };
  const title = reminderText(reminder);
  try {
    // Android Chrome only shows notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // The banner in the app still shows.
  }
}

// ------------------------------------------------------------------
// Demo (More → Demo tools): the reminder for the next pills, shown now as "due in 15 minutes",
// for a few minutes, whatever the time.
// ------------------------------------------------------------------
const DEMO_KEY = 'ventra.demoReminderUntil';
export const DEMO_REMINDER_MS = 5 * 60 * 1000;

export function startDemoReminder(nowMs = Date.now()) {
  try {
    sessionStorage.setItem(DEMO_KEY, String(nowMs + DEMO_REMINDER_MS));
  } catch {
    // Storage blocked: the phone notification still shows.
  }
}

export function demoReminderOn(nowMs = Date.now()): boolean {
  try {
    return Number(sessionStorage.getItem(DEMO_KEY) ?? 0) > nowMs;
  } catch {
    return false;
  }
}

// The next pills still to take today (or the first of the day if all are taken), due in 15 minutes.
export function demoReminder(doses: DoseStatus[]): DoseReminder | null {
  const left = doses.filter((dose) => !dose.taken);
  const time = (left.length ? left : doses).map((dose) => dose.time).sort((a, b) => a - b)[0];
  if (time == null) return null;
  const at = doses.filter((dose) => dose.time === time && (!left.length || !dose.taken));
  return { time, label: clock(time), names: at.map((dose) => dose.med.name), dueInMin: REMIND_BEFORE_MIN };
}
