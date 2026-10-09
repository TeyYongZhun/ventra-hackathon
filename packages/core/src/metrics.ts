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
