import { describe, expect, it } from 'vitest';
import { buildMetrics, mdmTanSeed, type MetricsResponse } from '@ventra/core';
import { calendarTile, dayHeading, greeting, ml, pillsLeft, statusLine, streakText } from './copy';

const metrics = buildMetrics(mdmTanSeed);

describe('copy', () => {
  it('formats the day heading and calendar tile', () => {
    expect(dayHeading('2026-10-07')).toBe('Wed, 7 October');
    expect(calendarTile('2026-10-07')).toEqual({ day: 'WED', num: '7' });
  });

  it('greets by time of day', () => {
    expect(greeting(9)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(20)).toBe('Good evening');
  });

  it('formats ml with thousands separators', () => {
    expect(ml(1500)).toBe('1,500');
  });

  it('counts pills still to take today', () => {
    expect(pillsLeft(metrics)).toBe(1);
  });

  it('builds the green status line for Mdm Tan', () => {
    expect(statusLine(metrics)).toBe('Your weight is steady and you took all your morning medicines.');
  });

  it('says weight is going up only when the core rules give a weight reason', () => {
    const up: MetricsResponse = { ...metrics, reasons: [{ key: 'weight', chip: 'Weight up 2.1 kg in 3 days' }] };
    expect(statusLine(up)).toContain('Your weight is going up');
  });

  it('reminds to weigh when there is no weight today', () => {
    expect(statusLine({ ...metrics, vsDry: null })).toMatch(/^Remember to weigh yourself this morning/);
  });

  it('counts morning medicines still to take', () => {
    const partly: MetricsResponse = { ...metrics, pillsToday: { ...metrics.pillsToday, morningTaken: 2 } };
    expect(statusLine(partly)).toContain('you took 2 of your morning medicines');
  });

  it('leaves out medicines for a patient with none', () => {
    const none: MetricsResponse = { ...metrics, pillsToday: { ...metrics.pillsToday, morning: [], morningTaken: 0 } };
    expect(statusLine(none)).toBe('Your weight is steady.');
  });

  it('writes the daily note streak line', () => {
    expect(streakText(metrics)).toBe('You have weighed yourself 11 mornings in a row.');
    expect(streakText({ ...metrics, goodStreak: 3 })).toBe('3 good days in a row.');
    expect(streakText({ ...metrics, goodStreak: 0, weighStreak: 0 })).toBe('');
  });
});
