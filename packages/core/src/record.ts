import type { AlertZone } from './rules.js';

export type IsoDate = `${number}-${number}-${number}`;

export interface PatientInfo {
  name: string;
  age: number;
  condition: string;
  family: {
    name: string;
    relation: string;
  };
}

export interface Targets {
  dryKg: number;
  alertGainKg: number;
  alertDays: number;
  fluidMl: number;
  sodiumMg: number;
  capMl: number;
}

export interface Medicine {
  id: string;
  name: string;
  generic: string;
  strength: string;
  times: number[];
  purpose: string;
  looks: string;
  tile?: string;
  round?: {
    size: number;
    bg: string;
    border: string;
    line: string;
  };
  oval?: {
    bg: string;
    border: string;
  };
}

export interface MissedDose {
  date: IsoDate;
  med: string;
  time: number;
  why?: string;
}

export type TakenAt = Record<IsoDate, Record<number, string>>;

export interface DrinkLog {
  t: string;
  what: string;
  ml: number;
}

export interface MealLog {
  t: string;
  meal: string;
  what: string;
  sodiumMg: number;
  kcal: number;
  potassiumMg: number;
  phosphorusMg: number;
  carbs: MacroLog;
  protein: MacroLog;
  fat: MacroLog;
  plate: [number, number, number];
  tip: string;
}

export interface MacroLog {
  g: number;
  what: string;
}

export type SymptomKey = 'ankles' | 'tired' | 'dizzy' | 'breath';

export interface SymptomLog {
  date: IsoDate;
  key: SymptomKey;
  sev: string;
}

export interface AlertLog {
  date: IsoDate;
  time: string;
  zone: AlertZone;
  familyTold: boolean;
}

export interface PatientRecord {
  patient: PatientInfo;
  today: IsoDate;
  nowMin: number;
  discharge: IsoDate;
  period: {
    from: IsoDate;
    to: IsoDate;
  };
  targets: Targets;
  meds: Medicine[];
  missed: MissedDose[];
  takenAt: TakenAt;
  weights: Partial<Record<IsoDate, number>>;
  weighTime: string;
  fluid: Partial<Record<IsoDate, number>>;
  drinksToday: DrinkLog[];
  mealsToday: MealLog[];
  demoScan?: MealLog;
  symptoms: SymptomLog[];
  alerts: AlertLog[];
}

export interface DoseStatus {
  med: Medicine;
  time: number;
  index: number;
  of: number;
  due: boolean;
  missed: boolean;
  taken: boolean;
  takenAt: string | null;
}

export interface AdherenceSummary {
  due: number;
  taken: number;
  missed: number;
  pct: number;
  text: string;
}

export interface PillsTodaySummary {
  all: DoseStatus[];
  morning: DoseStatus[];
  evening: DoseStatus[];
  total: number;
  taken: number;
  morningTaken: number;
  next: DoseStatus | null;
  nextTime: string;
}

export interface Reason {
  key: 'weight' | 'missed' | 'fluid' | 'sym';
  chip: string;
}

export interface ScriptSegment {
  t: string;
  b: boolean;
}

export interface ScriptLine {
  i: number;
  segs: ScriptSegment[];
}

interface SymptomCopy {
  label: string;
  say: string;
  short: string;
}

const SYMPTOMS: Record<SymptomKey, SymptomCopy> = {
  ankles: { label: 'Swollen ankles', say: 'swollen ankles', short: 'ankle swelling' },
  tired: { label: 'Tired in the afternoon', say: 'very tired', short: 'tired' },
  dizzy: { label: 'Dizzy after morning pills', say: 'dizzy after my morning pills', short: 'dizzy' },
  breath: { label: 'Short of breath', say: 'short of breath', short: 'breathless' },
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDate(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function iso(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10) as IsoDate;
}

function addDays(date: IsoDate, days: number): IsoDate {
  return iso(parseDate(date) + days * 864e5);
}

function range(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) out.push(date);
  return out;
}

function num(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function kg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function clock(minutes: number): string {
  let hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}${minute ? `:${minute < 10 ? '0' : ''}${minute}` : ''} ${suffix}`;
}

function listJoin(values: string[]): string {
  if (values.length < 2) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function dayName(date: IsoDate): string {
  return DAY_LONG[new Date(parseDate(date)).getUTCDay()] ?? '';
}

function dayLong(date: IsoDate): string {
  const parsed = new Date(parseDate(date));
  return `${parsed.getUTCDate()} ${MONTH_LONG[parsed.getUTCMonth()]}`;
}

function defaultPeriodDays(record: PatientRecord): IsoDate[] {
  return range(record.period.from, record.period.to);
}

function weightOn(record: PatientRecord, date: IsoDate): number | null {
  return record.weights[date] ?? null;
}

export function alertOn(record: PatientRecord, date: IsoDate): AlertLog | null {
  return record.alerts.find((alert) => alert.date === date) ?? null;
}

export function symptomsOn(record: PatientRecord, date: IsoDate): SymptomLog[] {
  return record.symptoms.filter((symptom) => symptom.date === date);
}

export function dosesOn(record: PatientRecord, date: IsoDate): DoseStatus[] {
  return record.meds.flatMap((med) =>
    med.times.map((time, index) => {
      const isMissed = record.missed.some((missed) => missed.date === date && missed.med === med.id && missed.time === time);
      const due = date < record.today || time <= record.nowMin;
      return {
        med,
        time,
        index,
        of: med.times.length,
        due,
        missed: due && isMissed,
        taken: due && !isMissed,
        takenAt: record.takenAt[date]?.[time] ?? null,
      };
    }),
  );
}

export function adherence(record: PatientRecord, days = defaultPeriodDays(record)): AdherenceSummary {
  let due = 0;
  let taken = 0;

  for (const date of days) {
    for (const dose of dosesOn(record, date)) {
      if (dose.due) {
        due += 1;
        if (dose.taken) taken += 1;
      }
    }
  }

  return {
    due,
    taken,
    missed: due - taken,
    pct: due ? Math.round((taken / due) * 100) : 100,
    text: `${taken} of ${due}`,
  };
}

export function pillsToday(record: PatientRecord): PillsTodaySummary {
  const all = dosesOn(record, record.today);
  const morning = all.filter((dose) => dose.time < 720);
  const evening = all.filter((dose) => dose.time >= 720);
  const next = all.find((dose) => !dose.due) ?? null;

  return {
    all,
    morning,
    evening,
    total: all.length,
    taken: all.filter((dose) => dose.taken).length,
    morningTaken: morning.filter((dose) => dose.taken).length,
    next,
    nextTime: next ? clock(next.time) : '',
  };
}

export function weightChange(record: PatientRecord, days: number, date = record.today): number | null {
  const start = weightOn(record, addDays(date, -days));
  const end = weightOn(record, date);
  return start == null || end == null ? null : Math.round((end - start) * 10) / 10;
}

export function vsDry(record: PatientRecord, date = record.today): number | null {
  const weight = weightOn(record, date);
  return weight == null ? null : Math.round((weight - record.targets.dryKg) * 10) / 10;
}

export function isGoodDay(record: PatientRecord, date: IsoDate): boolean {
  if (date >= record.today) return false;
  return weightOn(record, date) != null && dosesOn(record, date).every((dose) => dose.taken) && fluidOk(record, date) && !alertOn(record, date);
}

export function goodStreak(record: PatientRecord): number {
  let count = 0;
  for (let date = addDays(record.today, -1); isGoodDay(record, date); date = addDays(date, -1)) count += 1;
  return count;
}

export function weighStreak(record: PatientRecord): number {
  let count = 0;
  for (let date = record.today; weightOn(record, date) != null; date = addDays(date, -1)) count += 1;
  return count;
}

export function fluidOn(record: PatientRecord, date: IsoDate): number | null {
  if (date === record.today) return record.drinksToday.reduce((sum, drink) => sum + drink.ml, 0);
  return record.fluid[date] ?? null;
}

export function fluidOk(record: PatientRecord, date: IsoDate): boolean {
  const fluid = fluidOn(record, date);
  return fluid != null && fluid <= record.targets.fluidMl;
}

export function sodiumToday(record: PatientRecord): number {
  return record.mealsToday.reduce((sum, meal) => sum + meal.sodiumMg, 0);
}

export function reasons(record: PatientRecord, date: IsoDate): Reason[] {
  const out: Reason[] = [];
  const { targets } = record;
  const change = weightChange(record, targets.alertDays, date);

  if (change != null && change >= targets.alertGainKg) {
    out.push({ key: 'weight', chip: `Weight up ${change.toFixed(1)} kg in ${targets.alertDays} days` });
  }

  for (const dose of dosesOn(record, date).filter((item) => item.missed)) {
    out.push({ key: 'missed', chip: `Missed ${dose.med.name.toLowerCase()} (${clock(dose.time)})` });
  }

  const fluid = fluidOn(record, date);
  if (fluid != null && fluid > targets.fluidMl) {
    out.push({ key: 'fluid', chip: `Drank ${num(fluid)} ml · limit ${num(targets.fluidMl)}` });
  }

  for (const symptom of symptomsOn(record, date)) {
    if (symptom.key !== 'tired') {
      out.push({ key: 'sym', chip: `${SYMPTOMS[symptom.key].label} (${symptom.sev.toLowerCase()})` });
    }
  }

  return out;
}

export function alertHeadline(record: PatientRecord, date: IsoDate): string {
  const change = weightChange(record, record.targets.alertDays, date);
  if (change != null && change >= record.targets.alertGainKg) {
    return `Your weight went up ${change.toFixed(1)} kg in ${record.targets.alertDays} days`;
  }
  return 'Signs of extra fluid in your body';
}

export function alertSentence(record: PatientRecord, date: IsoDate): string {
  const bits = reasons(record, date).map((reason) => {
    if (reason.key === 'weight') return 'your weight went up';
    if (reason.key === 'missed') return `you missed your ${reason.chip.replace(/^Missed /, '').replace(/ \(.*$/, '')}`;
    if (reason.key === 'fluid') return 'you drank more than your limit';
    return `you had ${reason.chip.replace(/ \(.*$/, '').toLowerCase()}`;
  });

  return `On ${dayName(date)} ${dayLong(date)}, ${listJoin(bits)}.`;
}

export function nurseScript(record: PatientRecord, date: IsoDate): ScriptLine[] {
  const { targets, patient } = record;
  const lines: ScriptSegment[][] = [];
  const S = (text: string): ScriptSegment => ({ t: text, b: false });
  const B = (text: string): ScriptSegment => ({ t: text, b: true });

  lines.push([S('“Hello, I am '), B(patient.name), S(`. I have ${patient.condition}.`)]);

  const weight = weightOn(record, date);
  const change = weightChange(record, targets.alertDays, date);
  const priorWeight = weightOn(record, addDays(date, -targets.alertDays));

  if (weight != null && change != null && change >= targets.alertGainKg && priorWeight != null) {
    lines.push([S('My weight went up from '), B(`${kg(priorWeight)} to ${kg(weight)}`), S(` in ${targets.alertDays} days.`)]);
  } else if (weight != null) {
    lines.push([
      S('My weight this morning was '),
      B(kg(weight)),
      S(change == null ? '.' : ` (${change >= 0 ? 'up ' : 'down '}${Math.abs(change).toFixed(1)} kg in ${targets.alertDays} days).`),
    ]);
  }

  const notableSymptoms = symptomsOn(record, date).filter((symptom) => symptom.key !== 'tired');
  if (notableSymptoms.length) {
    lines.push([
      S('I have '),
      B(listJoin(notableSymptoms.map((symptom) => SYMPTOMS[symptom.key].say))),
      S(` (${notableSymptoms[0]?.sev.toLowerCase()}).`),
    ]);
  }

  const fluid = fluidOn(record, date);
  if (fluid != null && fluid > targets.fluidMl) {
    lines.push([S('I drank '), B(`${num(fluid)} ml`), S(` today. My limit is ${num(targets.fluidMl)} ml.`)]);
  }

  const missed = dosesOn(record, date).filter((dose) => dose.missed);
  if (missed.length) {
    lines.push([
      S('I missed my '),
      B(listJoin(missed.map((dose) => `${dose.med.name.toLowerCase()} (${dose.med.generic.toLowerCase()} ${dose.med.strength})`))),
      S(` at ${clock(missed[0]?.time ?? 0)}. I took my other medicines.”`),
    ]);
  } else {
    lines.push([S('I took all my medicine today.”')]);
  }

  return lines.map((segs, i) => ({ i, segs }));
}

export function questions(record: PatientRecord): string[] {
  const ankles = defaultPeriodDays(record).filter((date) => symptomsOn(record, date).some((symptom) => symptom.key === 'ankles')).length;

  return [
    `My ankles were swollen on ${ankles} day${ankles === 1 ? '' : 's'}. Is that a problem?`,
    'I feel tired most afternoons. Is it my medicine?',
    'How can I take my water pill when I go out?',
  ];
}
