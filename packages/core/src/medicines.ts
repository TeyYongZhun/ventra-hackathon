import { mdmTanSeed } from './mdmTan.seed.js';
import type { Medicine } from './record.js';

// Heart-failure medicines a new patient can pick during set-up. Plain names, what each is
// for (explanation only) and what the pill looks like. Times are the usual schedule; the
// care team confirms them.
export const MEDICINE_CATALOG: Medicine[] = [
  ...mdmTanSeed.meds,
  {
    id: 'dapa',
    name: 'Heart and kidney pill',
    generic: 'Dapagliflozin',
    strength: '10 mg',
    times: [480],
    purpose: 'Helps your heart and kidneys, and helps your body pass some extra salt and water.',
    looks: 'Yellow diamond-shaped tablet',
    tile: '#E3E6EC',
    oval: { bg: '#F6E7A8', border: '#D8C277' },
  },
];

export function catalogMedicine(id: string): Medicine | undefined {
  return MEDICINE_CATALOG.find((med) => med.id === id);
}
