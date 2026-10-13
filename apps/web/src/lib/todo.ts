import type { MetricsResponse } from '@ventra/core';

// The morning routine on Home: weigh, take the morning pills, say how you feel. Each step ticks
// itself off from GET /api/metrics, except "I feel fine", which the server doesn't store: the
// Feel page remembers that check-in on this phone (markCheckedIn).

export interface TodoItem {
  key: 'weigh' | 'pills' | 'feel';
  label: string;
  hint: string;
  to: string;
  done: boolean;
}

const checkInKey = (date: string) => `ventra.checkin.${date}`;

export function markCheckedIn(date: string) {
  try {
    localStorage.setItem(checkInKey(date), '1');
  } catch {
    // Storage blocked: "How do you feel?" stays on the to-do until a symptom is logged.
  }
}

function checkedIn(date: string): boolean {
  try {
    return localStorage.getItem(checkInKey(date)) === '1';
  } catch {
    return false;
  }
}

export function morningTodo(metrics: MetricsResponse): TodoItem[] {
  const { today, pillsToday } = metrics;
  const items: TodoItem[] = [
    { key: 'weigh', label: 'Weigh yourself', hint: 'After the toilet, before breakfast', to: '/weigh', done: metrics.weightToday != null },
  ];
  if (pillsToday.morning.length > 0) {
    const taken = pillsToday.morning.filter((dose) => dose.taken).length;
    items.push({
      key: 'pills',
      label: 'Take your morning pills',
      hint: `${taken} of ${pillsToday.morning.length} taken`,
      to: '/medicine',
      done: taken === pillsToday.morning.length,
    });
  }
  items.push({
    key: 'feel',
    label: 'How do you feel today?',
    hint: 'Breathing, swelling, tiredness',
    to: '/feel',
    done: checkedIn(today) || metrics.symptomsToday.length > 0,
  });
  return items;
}
