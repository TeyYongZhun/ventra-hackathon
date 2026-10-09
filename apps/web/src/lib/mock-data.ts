import { mdmTanSeed } from '@ventra/core';
import {
  adherence,
  pillsToday,
  weightChange,
  vsDry,
  weighStreak,
  fluidOn,
  fluidOk,
  sodiumToday,
  evaluate,
  goodStreak,
  isGoodDay,
  reasons,
  symptomsOn,
  alertOn,
  questions,
} from '@ventra/core';
import type { MetricsResponse } from '@ventra/core';

const record = mdmTanSeed;
const date = record.today;

export function getMockMetrics(): MetricsResponse {
  const goodDays = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ].filter((d) => isGoodDay(record, d as `${number}-${number}-${number}`)).length;

  return {
    patient: record.patient,
    today: record.today,
    adherence: adherence(record),
    pillsToday: pillsToday(record),
    weightChange: weightChange(record, record.targets.alertDays, date),
    vsDry: vsDry(record, date),
    weighStreak: weighStreak(record),
    fluidToday: fluidOn(record, date) ?? 0,
    fluidOk: fluidOk(record, date),
    sodiumToday: sodiumToday(record),
    zone: evaluate(record, date).zone,
    goodDays,
    goodStreak: goodStreak(record),
    reasons: reasons(record, date),
    symptomsToday: symptomsOn(record, date),
    alertsToday: alertOn(record, date) ? [alertOn(record, date)!] : [],
    questions: questions(record),
  };
}
