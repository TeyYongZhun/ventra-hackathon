import { describe, expect, it } from 'vitest';
import {
  adherence,
  dosesOn,
  goodStreak,
  isGoodDay,
  MISSED_GRACE_MIN,
  nurseScript,
  pillsToday,
  weighStreak,
  type PatientRecord,
} from '../src/record.js';
import { evaluate } from '../src/rules.js';
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

describe('dose model: taken only when confirmed', () => {
  // Mdm Tan on 7 Oct with nothing confirmed today.
  function unconfirmedToday(nowMin: number): PatientRecord {
    return {
      ...mdmTanSeed,
      nowMin,
      taken: mdmTanSeed.taken.filter((dose) => dose.date !== '2026-10-07'),
    };
  }

  const waterPill = (record: PatientRecord) =>
    dosesOn(record, '2026-10-07').find((dose) => dose.med.id === 'furo' && dose.time === 480)!;

  it('shows an unconfirmed dose as not taken and not missed inside the grace window', () => {
    const dose = waterPill(unconfirmedToday(480 + MISSED_GRACE_MIN - 1));
    expect(dose).toMatchObject({ due: true, taken: false, missed: false, takenAt: null });
  });

  it('counts an unconfirmed dose as missed once the grace window has passed', () => {
    const dose = waterPill(unconfirmedToday(480 + MISSED_GRACE_MIN));
    expect(dose).toMatchObject({ due: true, taken: false, missed: true });
  });

  it('counts an unconfirmed dose on an earlier day as missed', () => {
    const record: PatientRecord = {
      ...mdmTanSeed,
      taken: mdmTanSeed.taken.filter((dose) => !(dose.date === '2026-10-05' && dose.med === 'biso')),
    };
    const biso = dosesOn(record, '2026-10-05').find((dose) => dose.med.id === 'biso')!;
    expect(biso).toMatchObject({ taken: false, missed: true });
  });

  it('tracks confirmation per medicine, not per time slot', () => {
    const record: PatientRecord = {
      ...unconfirmedToday(9 * 60),
      taken: [
        ...unconfirmedToday(9 * 60).taken,
        { date: '2026-10-07', med: 'furo', time: 480, at: '8:02 AM' },
      ],
    };
    const morning = dosesOn(record, '2026-10-07').filter((dose) => dose.time === 480);
    expect(morning.find((dose) => dose.med.id === 'furo')).toMatchObject({ taken: true, takenAt: '8:02 AM' });
    expect(morning.filter((dose) => dose.taken)).toHaveLength(1);
  });

  it('counts an evening dose confirmed early as taken', () => {
    const record: PatientRecord = {
      ...mdmTanSeed,
      taken: [...mdmTanSeed.taken, { date: '2026-10-07', med: 'sv', time: 1200, at: '9:50 AM' }],
    };
    expect(pillsToday(record)).toMatchObject({ taken: 5, total: 5, next: null });
  });

  it('leaves doses inside the grace window out of adherence', () => {
    expect(adherence(unconfirmedToday(9 * 60))).toMatchObject({ due: 30, taken: 28 });
  });

  it('points next to the first dose still to take', () => {
    const today = pillsToday(unconfirmedToday(9 * 60));
    expect(today.next?.med.id).toBe('furo');
    expect(today.nextTime).toBe('8 AM');
  });

  it('turns yellow when the water pill goes unconfirmed past the grace window with swollen ankles', () => {
    const record: PatientRecord = {
      ...unconfirmedToday(480 + MISSED_GRACE_MIN),
      symptoms: [...mdmTanSeed.symptoms, { date: '2026-10-07', key: 'ankles', sev: 'Mild' }],
    };
    expect(evaluate(record, '2026-10-07').zone).toBe('yellow');
    expect(evaluate({ ...record, nowMin: 480 + MISSED_GRACE_MIN - 1 }, '2026-10-07').zone).toBe('green');
  });
});
