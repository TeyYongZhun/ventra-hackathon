import { buildMetrics, mdmTanSeed } from '@ventra/core';
import type { MetricsResponse, PatientRecord } from '@ventra/core';

// freshMorning: the start-of-day demo (POST /api/demo/morning): today's weight, morning pills
// and symptoms not done yet.
export function getMockMetrics(freshMorning = false): MetricsResponse {
  if (!freshMorning) return buildMetrics(mdmTanSeed);
  const { today } = mdmTanSeed;
  const record: PatientRecord = {
    ...mdmTanSeed,
    weights: Object.fromEntries(Object.entries(mdmTanSeed.weights).filter(([date]) => date !== today)),
    taken: mdmTanSeed.taken.filter((dose) => !(dose.date === today && dose.time < 12 * 60)),
    symptoms: mdmTanSeed.symptoms.filter((symptom) => symptom.date !== today),
  };
  return buildMetrics(record);
}
