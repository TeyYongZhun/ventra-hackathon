import { describe, expect, it } from 'vitest';
import { adherence, goodStreak, isGoodDay, nurseScript, pillsToday, weighStreak } from '../src/record.js';
import { mdmTanSeed } from '../src/mdmTan.seed.js';

function scriptPlain(date: '2026-10-03'): string {
  return nurseScript(mdmTanSeed, date)
    .flatMap((line) => line.segs.map((segment) => segment.t))
    .join('');
}

describe('Mdm Tan demo record metrics', () => {
  it('derives adherence as 32 of 34 doses, 94%', () => {
    expect(adherence(mdmTanSeed)).toMatchObject({ taken: 32, due: 34, pct: 94, text: '32 of 34' });
  });

  it('derives pills today as 4 of 5', () => {
    expect(pillsToday(mdmTanSeed)).toMatchObject({ taken: 4, total: 5 });
  });

  it('derives good days as 1, 2, 4 and 5 Oct', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'] as const;
    expect(days.filter((day) => isGoodDay(mdmTanSeed, day))).toEqual(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05']);
  });

  it('derives streaks from daily logs', () => {
    expect(goodStreak(mdmTanSeed)).toBe(0);
    expect(weighStreak(mdmTanSeed)).toBe(11);
  });

  it('builds the 3 Oct nurse script from raw logs', () => {
    const script = scriptPlain('2026-10-03');

    expect(script).toContain('1,750 ml');
    expect(script).toContain('swollen ankles');
    expect(script).toContain('furosemide');
  });
});
