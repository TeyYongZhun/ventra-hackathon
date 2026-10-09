import type { IsoDate } from '@ventra/core';

// Patients live in Singapore: "today" and clock labels always use Asia/Singapore,
// whatever timezone the server runs in.
const TIME_ZONE = 'Asia/Singapore';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const minutesFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function sgDate(nowMs: number): IsoDate {
  return dateFormat.format(new Date(nowMs)) as IsoDate;
}

// Minutes since midnight in Singapore (0–1439).
export function sgMinutes(nowMs: number): number {
  const parts = minutesFormat.formatToParts(new Date(nowMs));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

// "3:05 PM" (plain spaces, like the seeded logs).
export function sgClock(nowMs: number): string {
  return clockFormat.format(new Date(nowMs)).replace(/\s/g, ' ');
}
