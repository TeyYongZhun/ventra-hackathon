// What family members see: the in-app preview, the daily Telegram summary and the alert
// message all come from here, so they always say the same thing.
import {
  alertOn,
  dayShort,
  fluidOn,
  pillsToday,
  reasons,
  symptomLabel,
  symptomsOn,
  type IsoDate,
  type PatientRecord,
} from './record.js';
import { evaluate } from './rules.js';

// Alerts, status and medicines are always shared for safety; these are the patient's choice.
export interface ShareChoices {
  weight: boolean;
  drinks: boolean;
  symptoms: boolean;
}

export type SummaryKey = 'alerts' | 'status' | 'weight' | 'medicines' | 'drinks' | 'symptoms';

export interface SummaryLine {
  key: SummaryKey;
  label: string;
  value: string;
}

export const ALWAYS_SHARED: SummaryKey[] = ['alerts', 'status', 'medicines'];

function ml(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

// Lines for today's family summary, in the order the app shows them.
export function familySummaryLines(record: PatientRecord, share: ShareChoices): SummaryLine[] {
  const date = record.today;
  const alert = alertOn(record, date);
  const yellow = evaluate(record, date).zone !== 'green';
  const pills = pillsToday(record);
  const missed = pills.all.filter((dose) => dose.missed).length;
  const weight = record.weights[date];
  const weightUp = reasons(record, date).some((reason) => reason.key === 'weight');
  const symptoms = symptomsOn(record, date);

  const lines: SummaryLine[] = [
    { key: 'alerts', label: 'Alerts', value: alert ? `Yellow alert today at ${alert.time}` : 'None today' },
    { key: 'status', label: 'Status', value: yellow ? 'Yellow — call the nurse' : 'Green — on track' },
  ];
  if (share.weight) {
    lines.push({
      key: 'weight',
      label: 'Weight',
      value: weight == null ? 'Not weighed yet today' : `${weight.toFixed(1)} kg (${weightUp ? 'going up' : 'steady'})`,
    });
  }
  lines.push({
    key: 'medicines',
    label: 'Medicines',
    value: pills.total === 0
      ? 'No medicines set up'
      : `${pills.taken} of ${pills.total} taken${missed ? ` · ${missed} missed` : ''}${pills.next ? ` · ${pills.nextTime} still to take` : ''}`,
  });
  if (share.drinks) {
    lines.push({ key: 'drinks', label: 'Drinks', value: `${ml(fluidOn(record, date) ?? 0)} of ${ml(record.targets.fluidMl)} ml` });
  }
  if (share.symptoms) {
    lines.push({
      key: 'symptoms',
      label: 'How I feel',
      value: symptoms.length
        ? symptoms.map((symptom) => `${symptomLabel(symptom.key)} (${symptom.sev.toLowerCase()})`).join(', ')
        : 'Nothing logged yet',
    });
  }
  return lines;
}

// Telegram text for the daily summary (10 PM, or "Send today's summary now").
export function familySummaryMessage(record: PatientRecord, share: ShareChoices): string {
  const body = familySummaryLines(record, share).map((line) => `${line.label}: ${line.value}`);
  return [`Ventra · today's summary for ${record.patient.name}`, dayShort(record.today), '', ...body].join('\n');
}

// Telegram text sent to family straight away when a day turns yellow.
export function alertMessage(record: PatientRecord, date: IsoDate, time: string): string {
  const name = record.patient.name;
  return [
    `⚠️ Ventra alert for ${name} · YELLOW`,
    `${dayShort(date)}, ${time}`,
    '',
    ...reasons(record, date).map((reason) => `• ${reason.chip}`),
    '',
    `${name} has been asked to call the heart nurse today. Please check in.`,
  ].join('\n');
}
