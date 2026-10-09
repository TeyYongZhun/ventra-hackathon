import {
  addDays,
  adherence,
  alertOn,
  fluidOk,
  fluidOn,
  goodStreak,
  isGoodDay,
  pillsToday,
  questions,
  reasons,
  sodiumToday,
  symptomsOn,
  vsDry,
  weighStreak,
  weightChange,
  type IsoDate,
  type PatientRecord,
} from './record.js';
import { evaluate } from './rules.js';
import type { MetricsResponse } from './types.js';

// Logged weights up to today, oldest first (dates sort as text in ISO form).
export function weightHistory(record: PatientRecord): Array<{ date: IsoDate; kg: number }> {
  return (Object.entries(record.weights) as Array<[IsoDate, number | undefined]>)
    .filter((entry): entry is [IsoDate, number] => entry[1] != null && entry[0] <= record.today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, kg]) => ({ date, kg }));
}

// Every number the screens show, for the record's `today`. GET /api/metrics returns this.
export function buildMetrics(record: PatientRecord): MetricsResponse {
  const date = record.today;
  const periodDays: IsoDate[] = [];
  for (let day = record.period.from; day <= record.period.to; day = addDays(day, 1)) periodDays.push(day);
  const alert = alertOn(record, date);

  return {
    patient: record.patient,
    today: date,
    targets: record.targets,
    adherence: adherence(record),
    pillsToday: pillsToday(record),
    weightChange: weightChange(record, record.targets.alertDays, date),
    vsDry: vsDry(record, date),
    weightToday: record.weights[date] ?? null,
    weightChange1: weightChange(record, 1, date),
    weightHistory: weightHistory(record),
    weighStreak: weighStreak(record),
    fluidToday: fluidOn(record, date) ?? 0,
    fluidOk: fluidOk(record, date),
    sodiumToday: sodiumToday(record),
    zone: evaluate(record, date).zone,
    goodDays: periodDays.filter((day) => isGoodDay(record, day)).length,
    goodStreak: goodStreak(record),
    reasons: reasons(record, date),
    symptomsToday: symptomsOn(record, date),
    alertsToday: alert ? [alert] : [],
    questions: questions(record),
  };
}
