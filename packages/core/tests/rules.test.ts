import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/rules.js';
import type { PatientRecord, IsoDate, Medicine } from '../src/record.js';

const waterPill: Medicine = {
  id: 'furo',
  name: 'Water pill',
  generic: 'Furosemide',
  strength: '40 mg',
  times: [480],
  purpose: '',
  looks: '',
};

const otherMed: Medicine = {
  id: 'biso',
  name: 'Heart rate pill',
  generic: 'Bisoprolol',
  strength: '2.5 mg',
  times: [480],
  purpose: '',
  looks: '',
};

// Today's 8 AM doses are confirmed unless the test marks them missed.
function baseRecord(overrides: Partial<PatientRecord> = {}): PatientRecord {
  const missed = overrides.missed ?? [];
  const taken = [waterPill, otherMed]
    .filter((med) => !missed.some((dose) => dose.med === med.id))
    .map((med) => ({ date: '2026-10-07' as IsoDate, med: med.id, time: 480, at: '8:05 AM' }));

  return {
    patient: {
      name: 'Test',
      age: 70,
      condition: 'heart failure',
      family: { name: 'Family', relation: 'child' },
    },
    today: '2026-10-07' as IsoDate,
    nowMin: 600,
    discharge: '2026-09-27' as IsoDate,
    period: {
      from: '2026-10-01' as IsoDate,
      to: '2026-10-07' as IsoDate,
    },
    targets: {
      dryKg: 58.0,
      alertGainKg: 2,
      alertDays: 3,
      fluidMl: 1500,
      sodiumMg: 2000,
      capMl: 150,
    },
    meds: [waterPill, otherMed],
    missed,
    taken,
    weights: {},
    weighTime: '7:00 AM',
    fluid: {},
    drinksToday: [],
    mealsToday: [],
    symptoms: [],
    alerts: [],
    ...overrides,
  };
}

describe('evaluate', () => {
  it('returns green when weight gain is 1.9 kg in 3 days', () => {
    const record = baseRecord({
      weights: {
        '2026-10-04': 58.0,
        '2026-10-07': 59.9,
      },
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns yellow when weight gain is 2.0 kg in 3 days', () => {
    const record = baseRecord({
      weights: {
        '2026-10-04': 58.0,
        '2026-10-07': 60.0,
      },
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Weight up 2.0 kg in 3 days'],
    });
  });

  it('returns yellow when missed water pill and fluid over limit', () => {
    const record = baseRecord({
      missed: [{ date: '2026-10-07', med: 'furo', time: 480 }],
      drinksToday: [{ t: '8:00 AM', what: 'Water', ml: 1600 }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Missed water pill and fluid over limit or ankle swelling'],
    });
  });

  it('returns yellow when missed water pill and ankle swelling', () => {
    const record = baseRecord({
      missed: [{ date: '2026-10-07', med: 'furo', time: 480 }],
      symptoms: [{ date: '2026-10-07', key: 'ankles', sev: 'Mild' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Missed water pill and fluid over limit or ankle swelling'],
    });
  });

  it('returns green when missed water pill but no fluid over limit or ankle swelling', () => {
    const record = baseRecord({
      missed: [{ date: '2026-10-07', med: 'furo', time: 480 }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns green when fluid over limit but no missed water pill or ankle swelling', () => {
    const record = baseRecord({
      drinksToday: [{ t: '8:00 AM', what: 'Water', ml: 1600 }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns green when ankle swelling but no missed water pill or fluid over limit', () => {
    const record = baseRecord({
      symptoms: [{ date: '2026-10-07', key: 'ankles', sev: 'Mild' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns yellow when fluid over limit and ankle swelling', () => {
    const record = baseRecord({
      drinksToday: [{ t: '8:00 AM', what: 'Water', ml: 1600 }],
      symptoms: [{ date: '2026-10-07', key: 'ankles', sev: 'Mild' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Fluid over limit and ankle swelling'],
    });
  });

  it('returns yellow when breathlessness is moderate', () => {
    const record = baseRecord({
      symptoms: [{ date: '2026-10-07', key: 'breath', sev: 'Moderate' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Breathlessness moderate'],
    });
  });

  it('returns yellow when breathlessness is severe', () => {
    const record = baseRecord({
      symptoms: [{ date: '2026-10-07', key: 'breath', sev: 'Severe' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: ['Breathlessness severe'],
    });
  });

  it('returns green when breathlessness is mild', () => {
    const record = baseRecord({
      symptoms: [{ date: '2026-10-07', key: 'breath', sev: 'Mild' }],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns green when there are no triggers', () => {
    const record = baseRecord();
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'green',
      reasons: [],
    });
  });

  it('returns yellow with multiple reasons when several triggers fire', () => {
    const record = baseRecord({
      weights: {
        '2026-10-04': 58.0,
        '2026-10-07': 60.0,
      },
      missed: [{ date: '2026-10-07', med: 'furo', time: 480 }],
      drinksToday: [{ t: '8:00 AM', what: 'Water', ml: 1600 }],
      symptoms: [
        { date: '2026-10-07', key: 'ankles', sev: 'Mild' },
        { date: '2026-10-07', key: 'breath', sev: 'Moderate' },
      ],
    });
    expect(evaluate(record, '2026-10-07')).toEqual({
      zone: 'yellow',
      reasons: [
        'Weight up 2.0 kg in 3 days',
        'Missed water pill and fluid over limit or ankle swelling',
        'Fluid over limit and ankle swelling',
        'Breathlessness moderate',
      ],
    });
  });
});
