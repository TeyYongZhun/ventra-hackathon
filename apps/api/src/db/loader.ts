import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and, isNull } from 'drizzle-orm';
import type { PatientRecord, IsoDate, Medicine, MissedDose, TakenAt, DrinkLog, MealLog, SymptomLog, AlertLog } from '@ventra/core';
import * as schema from './schema.js';

export interface LoadContext {
  today?: IsoDate;
  nowMin?: number;
  period?: { from: IsoDate; to: IsoDate };
}

export function loadPatientRecord(
  db: BetterSQLite3Database<typeof schema>,
  patientId: number,
  ctx: LoadContext = {},
): PatientRecord {
  const today = ctx.today ?? '2026-10-07';
  const nowMin = ctx.nowMin ?? 9 * 60 + 41;

  // Load patient
  const patientRow = db.select()
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId))
    .get();

  if (!patientRow) {
    throw new Error(`Patient ${patientId} not found`);
  }

  // Load family contact
  const contactRow = db.select()
    .from(schema.contacts)
    .where(eq(schema.contacts.patientId, patientId))
    .get();

  // Load targets
  const targetsRow = db.select()
    .from(schema.careTargets)
    .where(eq(schema.careTargets.patientId, patientId))
    .get();

  // Load medications
  const medRows = db.select()
    .from(schema.medications)
    .where(eq(schema.medications.patientId, patientId))
    .all();

  const meds: Medicine[] = medRows.map((m) => ({
    id: m.medId,
    name: m.name,
    generic: m.generic,
    strength: m.strength,
    times: JSON.parse(m.times) as number[],
    purpose: m.purpose,
    looks: m.looks,
    tile: m.tile ?? undefined,
    round: m.round ? (JSON.parse(m.round) as Medicine['round']) : undefined,
    oval: m.oval ? (JSON.parse(m.oval) as Medicine['oval']) : undefined,
  }));

  // Load dose events
  const doseRows = db.select()
    .from(schema.doseEvents)
    .where(eq(schema.doseEvents.patientId, patientId))
    .all();

  const missed: MissedDose[] = doseRows
    .filter((d) => d.status === 'missed')
    .map((d) => ({
      date: d.date as IsoDate,
      med: d.medId,
      time: d.time,
      why: d.why ?? undefined,
    }));

  const takenAt: TakenAt = {};
  for (const d of doseRows.filter((d) => d.status === 'taken' && d.takenAt)) {
    if (!takenAt[d.date]) takenAt[d.date] = {};
    takenAt[d.date][d.time] = d.takenAt!;
  }

  // Load weights
  const weightRows = db.select()
    .from(schema.weights)
    .where(eq(schema.weights.patientId, patientId))
    .all();

  const weights: Partial<Record<IsoDate, number>> = {};
  for (const w of weightRows) {
    weights[w.date as IsoDate] = w.weightKg;
  }

  // Load fluid entries
  const fluidRows = db.select()
    .from(schema.fluidEntries)
    .where(
      and(
        eq(schema.fluidEntries.patientId, patientId),
        isNull(schema.fluidEntries.deletedAt),
      ),
    )
    .all();

  const fluid: Partial<Record<IsoDate, number>> = {};
  const drinksToday: DrinkLog[] = [];

  for (const f of fluidRows) {
    if (f.date === today) {
      drinksToday.push({ t: f.time, what: f.what, ml: f.ml });
    } else {
      fluid[f.date as IsoDate] = (fluid[f.date as IsoDate] ?? 0) + f.ml;
    }
  }

  // Load meals for today
  const mealRows = db.select()
    .from(schema.meals)
    .where(eq(schema.meals.patientId, patientId))
    .all();

  const mealsToday: MealLog[] = [];
  let demoScan: MealLog | undefined;

  for (const m of mealRows) {
    const meal: MealLog = {
      t: m.time,
      meal: m.meal,
      what: m.what,
      sodiumMg: m.sodiumMg,
      kcal: m.kcal,
      potassiumMg: m.potassiumMg,
      phosphorusMg: m.phosphorusMg,
      carbs: JSON.parse(m.carbsJson),
      protein: JSON.parse(m.proteinJson),
      fat: JSON.parse(m.fatJson),
      plate: JSON.parse(m.plateJson) as [number, number, number],
      tip: m.tip,
    };

    if (m.isDemoScan) {
      demoScan = meal;
    } else if (m.date === today) {
      mealsToday.push(meal);
    }
  }

  // Load symptoms
  const symptomRows = db.select()
    .from(schema.symptoms)
    .where(eq(schema.symptoms.patientId, patientId))
    .all();

  const symptoms: SymptomLog[] = symptomRows.map((s) => ({
    date: s.date as IsoDate,
    key: s.key as SymptomLog['key'],
    sev: s.sev,
  }));

  // Load alerts
  const alertRows = db.select()
    .from(schema.alerts)
    .where(eq(schema.alerts.patientId, patientId))
    .all();

  const alerts: AlertLog[] = alertRows.map((a) => ({
    date: a.date as IsoDate,
    time: a.time,
    zone: a.zone as AlertLog['zone'],
    familyTold: a.familyTold,
  }));

  const discharge = patientRow.dischargeDate as IsoDate;
  const period = ctx.period ?? { from: '2026-10-01' as IsoDate, to: today };

  return {
    patient: {
      name: patientRow.name,
      age: patientRow.age,
      condition: patientRow.condition,
      family: contactRow
        ? { name: contactRow.name, relation: contactRow.relation }
        : { name: '', relation: '' },
    },
    today,
    nowMin,
    discharge,
    period,
    targets: {
      dryKg: targetsRow?.dryKg ?? 0,
      alertGainKg: targetsRow?.alertGainKg ?? 0,
      alertDays: targetsRow?.alertDays ?? 0,
      fluidMl: targetsRow?.fluidMl ?? 0,
      sodiumMg: targetsRow?.sodiumMg ?? 0,
      capMl: targetsRow?.capMl ?? 0,
    },
    meds,
    missed,
    takenAt,
    weights,
    weighTime: patientRow.weighTime ?? '',
    fluid,
    drinksToday,
    mealsToday,
    demoScan,
    symptoms,
    alerts,
  };
}
