import type { PatientRecord, IsoDate } from './record.js';
import { weightChange, dosesOn, fluidOn, symptomsOn } from './record.js';

export type AlertZone = 'green' | 'yellow' | 'red';

export function evaluate(
  record: PatientRecord,
  date: IsoDate,
): { zone: 'green' | 'yellow'; reasons: string[] } {
  const reasons: string[] = [];

  // 1. weight up 2 kg or more in 3 days
  const gain = weightChange(record, 3, date);
  if (gain != null && gain >= 2) {
    reasons.push(`Weight up ${gain.toFixed(1)} kg in 3 days`);
  }

  // helpers for remaining rules
  const missedWaterPill = dosesOn(record, date).some(
    (d) => d.missed && d.med.name === 'Water pill',
  );

  const fluidOverLimit = (() => {
    const fluid = fluidOn(record, date);
    return fluid != null && fluid > record.targets.fluidMl;
  })();

  const ankleSwelling = symptomsOn(record, date).some((s) => s.key === 'ankles');

  // 2. missed water pill AND (fluid over limit OR ankle swelling)
  if (missedWaterPill && (fluidOverLimit || ankleSwelling)) {
    reasons.push('Missed water pill and fluid over limit or ankle swelling');
  }

  // 3. fluid over limit AND ankle swelling
  if (fluidOverLimit && ankleSwelling) {
    reasons.push('Fluid over limit and ankle swelling');
  }

  // 4. breathlessness moderate or worse
  const breath = symptomsOn(record, date).find((s) => s.key === 'breath');
  if (breath && breath.sev.toLowerCase() !== 'mild') {
    reasons.push(`Breathlessness ${breath.sev.toLowerCase()}`);
  }

  return {
    zone: reasons.length > 0 ? 'yellow' : 'green',
    reasons,
  };
}
