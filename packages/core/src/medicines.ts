import { mdmTanSeed } from './mdmTan.seed.js';
import type { Medicine } from './record.js';
import type { MedicineLeaflet } from './types.js';

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

// Plain-words leaflet for the medicine box scanner: common effects and when to call the nurse.
// Explanation only — no doses. Have the care team check these before real use.
export const MEDICINE_LEAFLETS: Record<string, MedicineLeaflet> = {
  furo: {
    mayFeel: 'You will need to pee more, mostly in the first few hours. You may feel thirsty, or dizzy when you stand up.',
    callNurse: 'If you feel very dizzy or faint, get bad cramps, or pee much less than usual.',
  },
  biso: {
    mayFeel: 'Tired, dizzy when you stand up, or cold hands and feet. Tell your nurse if this bothers you.',
    callNurse: 'If you feel very dizzy or faint, or your heartbeat feels very slow.',
  },
  sv: {
    mayFeel: 'Dizzy when you stand up, tired, or a dry cough. Tell your nurse if this bothers you.',
    callNurse: 'If your face, lips or tongue swell, or you feel very dizzy or faint.',
  },
  spiro: {
    mayFeel: 'An upset stomach, or sore or swollen breasts. Tell your nurse if this bothers you.',
    callNurse: 'If your muscles feel weak, your heartbeat feels uneven, or you feel very dizzy.',
  },
  dapa: {
    mayFeel: 'You may pee more and feel thirsty. Keep your private parts clean and dry.',
    callNurse: 'If it stings or itches when you pee, you are throwing up, or you feel very unwell or dizzy.',
  },
};

// Demo barcodes (EAN-13) for the medicine box scanner. The 200 prefix is GS1's in-house range,
// never printed on real products, so a real box can't match by accident. docs/demo-barcodes.html
// prints them; 2009990000012 is on that sheet but deliberately not here ("I don't know this product").
export const MEDICINE_BARCODES: Record<string, string> = {
  '2000000000015': 'furo',
  '2000000000022': 'biso',
  '2000000000039': 'sv',
  '2000000000046': 'spiro',
  '2000000000053': 'dapa',
};

export function medicineIdForBarcode(code: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(MEDICINE_BARCODES, code) ? MEDICINE_BARCODES[code] : undefined;
}
