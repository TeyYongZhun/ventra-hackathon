import { describe, expect, it } from 'vitest';
import { alertMessage, familySummaryLines, familySummaryMessage } from '../src/family.js';
import { mdmTanSeed } from '../src/mdmTan.seed.js';
import type { PatientRecord } from '../src/record.js';

const none = { weight: false, drinks: false, symptoms: false };
const all = { weight: true, drinks: true, symptoms: true };

describe('family summary', () => {
  it('always shares alerts, status and medicines', () => {
    expect(familySummaryLines(mdmTanSeed, none)).toEqual([
      { key: 'alerts', label: 'Alerts', value: 'None today' },
      { key: 'status', label: 'Status', value: 'Green — on track' },
      { key: 'medicines', label: 'Medicines', value: '4 of 5 taken · 8 PM still to take' },
    ]);
  });

  it('adds weight, drinks and how I feel only when chosen', () => {
    const lines = familySummaryLines(mdmTanSeed, all);
    expect(lines.map((line) => line.key)).toEqual(['alerts', 'status', 'weight', 'medicines', 'drinks', 'symptoms']);
    expect(lines.find((line) => line.key === 'weight')?.value).toBe('58.4 kg (steady)');
    expect(lines.find((line) => line.key === 'drinks')?.value).toBe('850 of 1,500 ml');
    expect(lines.find((line) => line.key === 'symptoms')?.value).toBe('Nothing logged yet');
  });

  it('reports a yellow day with its alert and missed pill', () => {
    const yellow: PatientRecord = {
      ...mdmTanSeed,
      nowMin: 11 * 60,
      taken: mdmTanSeed.taken.filter((dose) => !(dose.date === '2026-10-07' && dose.med === 'furo')),
      symptoms: [...mdmTanSeed.symptoms, { date: '2026-10-07', key: 'ankles', sev: 'Mild' }],
      alerts: [...mdmTanSeed.alerts, { date: '2026-10-07', time: '10:30 AM', zone: 'yellow', familyTold: false }],
    };
    const lines = familySummaryLines(yellow, { ...none, symptoms: true });
    expect(lines.map((line) => line.value)).toEqual([
      'Yellow alert today at 10:30 AM',
      'Yellow — call the nurse',
      '3 of 5 taken · 1 missed · 8 PM still to take',
      'Swollen ankles (mild)',
    ]);
  });

  it('writes the Telegram summary message', () => {
    expect(familySummaryMessage(mdmTanSeed, none)).toBe([
      "Ventra · today's summary for Mdm Tan",
      'Wed 7 Oct',
      '',
      'Alerts: None today',
      'Status: Green — on track',
      'Medicines: 4 of 5 taken · 8 PM still to take',
    ].join('\n'));
  });

  it('writes the Telegram alert message from the day reasons', () => {
    const record: PatientRecord = { ...mdmTanSeed, today: '2026-10-07' };
    const text = alertMessage(record, '2026-10-03', '6:10 PM');
    expect(text).toContain('Ventra alert for Mdm Tan · YELLOW');
    expect(text).toContain('Sat 3 Oct, 6:10 PM');
    expect(text).toContain('• Missed water pill (8 AM)');
    expect(text).toContain('• Drank 1,750 ml · limit 1,500');
    expect(text).toContain('• Swollen ankles (mild)');
    expect(text).toContain('Mdm Tan has been asked to call the heart nurse today.');
  });
});
