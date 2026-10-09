// Screen wording built from GET /api/metrics. No thresholds live here: whether
// weight is "going up" comes from the core rules (a 'weight' reason).
import type { MetricsResponse } from '@ventra/core';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return { weekday: WEEKDAY[date.getUTCDay()], day: date.getUTCDate(), month: MONTH[date.getUTCMonth()] };
}

// "Wed, 7 October"
export function dayHeading(isoDate: string): string {
  const { weekday, day, month } = parts(isoDate);
  return `${weekday}, ${day} ${month}`;
}

// Calendar tile: "WED" / "7"
export function calendarTile(isoDate: string): { day: string; num: string } {
  const { weekday, day } = parts(isoDate);
  return { day: weekday.toUpperCase(), num: String(day) };
}

export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// "1,500"
export function ml(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function pillsLeft(metrics: MetricsResponse): number {
  return metrics.pillsToday.total - metrics.pillsToday.taken;
}

// Green card body, e.g. "Your weight is steady and you took all your morning medicines."
export function statusLine(metrics: MetricsResponse): string {
  const { morning, morningTaken } = metrics.pillsToday;
  const weightUp = metrics.reasons.some((reason) => reason.key === 'weight');
  const weight = metrics.vsDry == null
    ? 'Remember to weigh yourself this morning'
    : `Your weight is ${weightUp ? 'going up' : 'steady'}`;

  if (morning.length === 0) return `${weight}.`;
  const pills = morningTaken === morning.length ? 'all your' : `${morningTaken} of your`;
  return `${weight} and you took ${pills} morning medicines.`;
}

// Daily note line. Empty for a new patient with nothing to celebrate yet.
export function streakText(metrics: MetricsResponse): string {
  if (metrics.goodStreak >= 2) return `${metrics.goodStreak} good days in a row.`;
  if (metrics.weighStreak === 0) return '';
  return `You have weighed yourself ${metrics.weighStreak} morning${metrics.weighStreak === 1 ? '' : 's'} in a row.`;
}
