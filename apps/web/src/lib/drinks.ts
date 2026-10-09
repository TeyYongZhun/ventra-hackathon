// Drinks tab maths over the patient's own targets (from GET /api/metrics).

export interface CapOption {
  label: string;
  fraction: number;
  ml: number;
}

const CAP_FRACTIONS: Array<[string, number]> = [
  ['¼ cap', 0.25],
  ['½ cap', 0.5],
  ['¾ cap', 0.75],
  ['Full cap', 1],
];

// Cap buttons sized to the patient's own cap (thermos lid). Empty until the cap size is set.
export function capOptions(capMl: number): CapOption[] {
  if (capMl <= 0) return [];
  return CAP_FRACTIONS.map(([label, fraction]) => ({ label, fraction, ml: Math.round(capMl * fraction) }));
}

export interface DrinkState {
  limitSet: boolean;
  left: number;
  // Bottle fill, 0–100; 100 = at the limit line
  percent: number;
  // 80% or more of the limit, but not over it
  near: boolean;
  over: boolean;
}

export function drinkState(usedMl: number, limitMl: number): DrinkState {
  if (limitMl <= 0) {
    return { limitSet: false, left: 0, percent: 0, near: false, over: false };
  }
  return {
    limitSet: true,
    left: Math.max(limitMl - usedMl, 0),
    percent: Math.min(usedMl / limitMl, 1) * 100,
    near: usedMl >= limitMl * 0.8 && usedMl < limitMl,
    over: usedMl >= limitMl,
  };
}
