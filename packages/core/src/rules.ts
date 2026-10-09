export type AlertZone = 'green' | 'yellow' | 'red';

export function evaluateZone(weightGainKg: number, days: number): AlertZone {
  if (weightGainKg >= 2 && days <= 3) return 'yellow';
  return 'green';
}
