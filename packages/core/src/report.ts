// Doctor report (F2a) built from the same functions as every other screen, so its numbers
// always match Home, Medicine and Track.
import {
  addDays,
  adherence,
  clock,
  dayShort,
  dosesOn,
  fluidOk,
  fluidOn,
  sodiumToday,
  symptomLabel,
  symptomsOn,
  vsDry,
  weightChange,
  type AdherenceSummary,
  type IsoDate,
  type PatientInfo,
  type PatientRecord,
  type Targets,
} from './record.js';
import { weightHistory } from './metrics.js';
import { evaluate } from './rules.js';

export interface ReportDay {
  date: IsoDate;
  zone: 'green' | 'yellow';
  weightKg: number | null;
  fluid: string;
  fluidOver: boolean;
  medicines: string;
  missed: boolean;
  symptoms: string;
}

export interface ReportMedicine {
  name: string;
  generic: string;
  dose: string;
  taken: number;
  due: number;
  missedDates: IsoDate[];
}

export interface ReportMeal {
  time: string;
  meal: string;
  what: string;
  sodiumMg: number;
  kcal: number;
}

export interface Report {
  patient: PatientInfo;
  today: IsoDate;
  period: { from: IsoDate; to: IsoDate };
  discharge: IsoDate | null;
  targets: Targets;
  weightToday: number | null;
  vsDry: number | null;
  weightChange: number | null;
  adherence: AdherenceSummary;
  fluidDays: { ok: number; of: number };
  sodiumToday: number;
  yellowDays: IsoDate[];
  summary: string[];
  days: ReportDay[];
  medicines: ReportMedicine[];
  meals: ReportMeal[];
  weights: Array<{ date: IsoDate; kg: number }>;
}

function ml(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function signedKg(value: number): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)} kg`;
}

function list(values: string[]): string {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

// "3 and 6 Oct"
function dates(days: IsoDate[]): string {
  const short = days.map((day) => dayShort(day).split(' ').slice(1));
  const month = short[short.length - 1]?.[1] ?? '';
  return `${list(short.map(([num]) => num ?? ''))} ${month}`.trim();
}

export function buildReport(record: PatientRecord): Report {
  const { targets } = record;
  const days: IsoDate[] = [];
  for (let day = record.period.from; day <= record.period.to; day = addDays(day, 1)) days.push(day);

  const rows: ReportDay[] = days.map((date) => {
    const isToday = date === record.today;
    const doses = dosesOn(record, date);
    const taken = doses.filter((dose) => dose.taken).length;
    const missed = doses.filter((dose) => dose.missed);
    const fluid = fluidOn(record, date);
    const over = fluid != null && fluid > targets.fluidMl;
    return {
      date,
      zone: evaluate(record, date).zone,
      weightKg: record.weights[date] ?? null,
      fluid: fluid == null ? 'Not logged' : isToday ? `${ml(fluid)} ml so far` : over ? `${ml(fluid)} ml · over limit` : `${ml(fluid)} ml`,
      fluidOver: over,
      medicines: doses.length === 0
        ? 'None'
        : `${taken} of ${doses.length}${isToday ? ' so far' : ''}${missed.length ? ` · missed ${missed.map((dose) => dose.med.generic.toLowerCase()).join(', ')}` : ''}`,
      missed: missed.length > 0,
      symptoms: symptomsOn(record, date).map((symptom) => `${symptomLabel(symptom.key)} (${symptom.sev.toLowerCase()})`).join('; ') || 'None',
    };
  });

  const medicines: ReportMedicine[] = record.meds.map((med) => {
    let due = 0;
    let taken = 0;
    const missedDates: IsoDate[] = [];
    for (const date of days) {
      for (const dose of dosesOn(record, date).filter((item) => item.med.id === med.id)) {
        if (dose.taken || dose.missed) due += 1;
        if (dose.taken) taken += 1;
        if (dose.missed && !missedDates.includes(date)) missedDates.push(date);
      }
    }
    return { name: med.name, generic: med.generic, dose: `${med.strength} · ${list(med.times.map(clock))}`, taken, due, missedDates };
  });

  const adh = adherence(record, days);
  const fluidDays = { ok: days.filter((date) => fluidOk(record, date)).length, of: days.length };
  const yellowDays = rows.filter((row) => row.zone === 'yellow').map((row) => row.date);
  const weightToday = record.weights[record.today] ?? null;
  const change = weightChange(record, targets.alertDays, record.today);
  const dry = vsDry(record, record.today);

  const missedMeds = medicines.filter((med) => med.missedDates.length > 0);
  const whys = [...new Set(record.missed.filter((dose) => days.includes(dose.date)).map((dose) => dose.why).filter(Boolean))];
  const symptomDays = (key: 'ankles' | 'dizzy' | 'breath' | 'tired') =>
    days.filter((date) => symptomsOn(record, date).some((symptom) => symptom.key === key));
  const symptomParts = [
    symptomDays('ankles').length ? `ankle swelling on ${dates(symptomDays('ankles'))}` : '',
    symptomDays('breath').length ? `breathlessness on ${dates(symptomDays('breath'))}` : '',
    symptomDays('dizzy').length ? `dizziness on ${dates(symptomDays('dizzy'))}` : '',
    symptomDays('tired').length ? `tiredness on ${symptomDays('tired').length} day${symptomDays('tired').length === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  const summary = [
    `Status: ${days.length - yellowDays.length} green and ${yellowDays.length} yellow day${yellowDays.length === 1 ? '' : 's'}${yellowDays.length ? ` (${dates(yellowDays)})` : ''}.`,
    weightToday == null
      ? 'Weight: not logged today.'
      : `Weight: ${weightToday.toFixed(1)} kg today, ${dry != null ? `${signedKg(dry)} vs dry weight` : 'no dry weight set'}${change != null ? `, ${signedKg(change)} over ${targets.alertDays} days` : ''}.`,
    `Medicines: ${adh.text} doses taken (${adh.pct}%).${missedMeds.length
      ? ` Missed ${list(missedMeds.map((med) => `${med.generic.toLowerCase()} on ${dates(med.missedDates)}`))}${whys.length === 1 ? ` (patient: ${whys[0]})` : ''}.`
      : ' No missed doses.'}`,
    `Fluid: within the ${ml(targets.fluidMl)} ml limit on ${fluidDays.ok} of ${fluidDays.of} days.`,
    `Symptoms (patient-reported): ${symptomParts.length ? list(symptomParts) : 'none'}.`,
  ];

  return {
    patient: record.patient,
    today: record.today,
    period: record.period,
    discharge: record.discharge ?? null,
    targets,
    weightToday,
    vsDry: dry,
    weightChange: change,
    adherence: adh,
    fluidDays,
    sodiumToday: sodiumToday(record),
    yellowDays,
    summary,
    days: rows,
    medicines,
    meals: record.mealsToday.map((meal) => ({ time: meal.t, meal: meal.meal, what: meal.what, sodiumMg: meal.sodiumMg, kcal: meal.kcal })),
    weights: weightHistory(record),
  };
}
