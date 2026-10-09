import { describe, expect, it } from 'vitest';
import { buildMetrics } from '../src/metrics.js';
import { mdmTanSeed } from '../src/mdmTan.seed.js';

describe('buildMetrics', () => {
  it('gives the documented numbers for Mdm Tan on 7 Oct', () => {
    const metrics = buildMetrics(mdmTanSeed);

    expect(metrics).toMatchObject({
      today: '2026-10-07',
      targets: { fluidMl: 1500, capMl: 150, sodiumMg: 2000 },
      adherence: { due: 34, taken: 32, missed: 2, pct: 94, text: '32 of 34' },
      pillsToday: { total: 5, taken: 4, morningTaken: 4, nextTime: '8 PM' },
      weightChange: 0.2,
      vsDry: 0.4,
      weighStreak: 11,
      fluidToday: 850,
      fluidOk: true,
      sodiumToday: 1600,
      zone: 'green',
      goodDays: 4,
      goodStreak: 0,
      reasons: [],
      symptomsToday: [],
      alertsToday: [],
    });
    expect(metrics.pillsToday.next?.med.id).toBe('sv');
  });

  it('reports the alert and reasons on the 3 Oct yellow day', () => {
    const metrics = buildMetrics({
      ...mdmTanSeed,
      today: '2026-10-03',
      nowMin: 24 * 60,
      drinksToday: [{ t: '12:00 PM', what: 'Water', ml: 1750 }],
    });

    expect(metrics.zone).toBe('yellow');
    expect(metrics.alertsToday).toHaveLength(1);
    expect(metrics.reasons.map((reason) => reason.key)).toEqual(['missed', 'fluid', 'sym']);
  });
});
