import { describe, expect, it } from 'vitest';
import { patientContext, questionWithContext } from '../src/context.js';
import { FOODS, findFood, mealForTime } from '../src/foods.js';
import { MEDICINE_CATALOG } from '../src/medicines.js';
import { buildMetrics } from '../src/metrics.js';
import { mdmTanSeed } from '../src/mdmTan.seed.js';
import { buildReport } from '../src/report.js';

describe('report', () => {
  const report = buildReport(mdmTanSeed);
  const metrics = buildMetrics(mdmTanSeed);

  it('uses the same numbers as the metrics', () => {
    expect(report.adherence).toEqual(metrics.adherence);
    expect(report.sodiumToday).toBe(metrics.sodiumToday);
    expect(report.weightToday).toBe(metrics.weightToday);
    expect(report.fluidDays).toEqual({ ok: 6, of: 7 });
  });

  it('writes the clinician summary from raw logs', () => {
    expect(report.summary).toEqual([
      'Status: 6 green and 1 yellow day (3 Oct).',
      'Weight: 58.4 kg today, +0.4 kg vs dry weight, +0.2 kg over 3 days.',
      'Medicines: 32 of 34 doses taken (94%). Missed furosemide on 3 and 6 Oct (patient: going out).',
      'Fluid: within the 1,500 ml limit on 6 of 7 days.',
      'Symptoms (patient-reported): ankle swelling on 3 and 5 Oct, dizziness on 4 Oct and tiredness on 3 days.',
    ]);
  });

  it('lists each medicine with doses taken and missed dates', () => {
    expect(report.medicines.find((med) => med.generic === 'Furosemide')).toMatchObject({
      dose: '40 mg · 8 AM',
      taken: 5,
      due: 7,
      missedDates: ['2026-10-03', '2026-10-06'],
    });
  });
});

describe('Ask AI context', () => {
  it("gives the patient's drinks, salt and weight", () => {
    const context = patientContext(mdmTanSeed);
    expect(context).toContain('Left today: 650 ml.');
    expect(context).toContain('Eaten so far today: 1,600 mg.');
    expect(context).toContain('Weight this morning: 58.4 kg.');
  });

  it('never includes medicines or identity', () => {
    const text = questionWithContext('Can I eat chicken rice?', mdmTanSeed);
    expect(text).not.toMatch(/furosemide|bisoprolol|pill|tablet|Mdm Tan|Mei Ling/i);
    expect(text.endsWith('Question: Can I eat chicken rice?')).toBe(true);
  });

  it('sends the bare question when nothing is set up yet', () => {
    const empty = { ...mdmTanSeed, targets: { dryKg: 0, alertGainKg: 0, alertDays: 0, fluidMl: 0, sodiumMg: 0, capMl: 0 }, weights: {} };
    expect(questionWithContext('Hello', empty)).toBe('Hello');
  });
});

describe('foods and medicines lists', () => {
  it('names meals by the time of day', () => {
    expect(mealForTime(7 * 60)).toBe('Breakfast');
    expect(mealForTime(12 * 60 + 30)).toBe('Lunch');
    expect(mealForTime(17 * 60)).toBe('Snack');
    expect(mealForTime(19 * 60)).toBe('Dinner');
  });

  it('has unique ids and complete plates', () => {
    expect(new Set(FOODS.map((food) => food.id)).size).toBe(FOODS.length);
    for (const food of FOODS) expect(food.plate.reduce((sum, part) => sum + part, 0)).toBeCloseTo(1);
    expect(findFood('chicken-rice')?.sodiumMg).toBe(1300);
  });

  it('lists the demo medicines plus dapagliflozin', () => {
    expect(MEDICINE_CATALOG.map((med) => med.id)).toEqual(['furo', 'biso', 'sv', 'spiro', 'dapa']);
  });
});
