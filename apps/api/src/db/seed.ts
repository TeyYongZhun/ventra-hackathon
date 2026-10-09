import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { addDays, mdmTanSeed, type IsoDate, type MealLog } from '@ventra/core';
import * as schema from './schema.js';

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
}

function mealRow(meal: MealLog) {
  return {
    time: meal.t,
    meal: meal.meal,
    what: meal.what,
    sodiumMg: meal.sodiumMg,
    kcal: meal.kcal,
    potassiumMg: meal.potassiumMg,
    phosphorusMg: meal.phosphorusMg,
    carbsJson: JSON.stringify(meal.carbs),
    proteinJson: JSON.stringify(meal.protein),
    fatJson: JSON.stringify(meal.fat),
    plateJson: JSON.stringify(meal.plate),
    tip: meal.tip,
  };
}

// Inserts Mdm Tan from the core fixture, shifting every date so her last day is `today`.
// The server passes today's Singapore date, so the demo history always ends today.
export async function seedDemoPatient(
  db: BetterSQLite3Database<typeof schema>,
  today: IsoDate = mdmTanSeed.today,
): Promise<number> {
  const record = mdmTanSeed;
  const offset = daysBetween(record.today, today);
  const day = (date: IsoDate) => addDays(date, offset);

  // Hash PIN 1234
  const pinHash = await bcryptjs.hash('1234', 10);

  const patientResult = db.insert(schema.patients).values({
    phone: '81234567',
    pinHash,
    name: record.patient.name,
    age: record.patient.age,
    condition: record.patient.condition,
    dischargeDate: day(record.discharge),
    dischargeWeightKg: record.weights[record.discharge] ?? null,
    textSize: null,
    weighTime: record.weighTime,
    isDemo: true,
  }).returning({ id: schema.patients.id }).get();

  const patientId = patientResult.id;

  db.insert(schema.contacts).values({
    patientId,
    name: record.patient.family.name,
    relation: record.patient.family.relation,
    phone: null,
  }).run();

  db.insert(schema.careTargets).values({ patientId, ...record.targets }).run();

  for (const med of record.meds) {
    db.insert(schema.medications).values({
      patientId,
      medId: med.id,
      name: med.name,
      generic: med.generic,
      strength: med.strength,
      times: JSON.stringify(med.times),
      purpose: med.purpose,
      looks: med.looks,
      tile: med.tile ?? null,
      round: med.round ? JSON.stringify(med.round) : null,
      oval: med.oval ? JSON.stringify(med.oval) : null,
    }).run();
  }

  for (const dose of record.missed) {
    db.insert(schema.doseEvents).values({
      patientId,
      date: day(dose.date),
      medId: dose.med,
      time: dose.time,
      status: 'missed',
      takenAt: null,
      why: dose.why ?? null,
      locked: true,
    }).run();
  }

  for (const dose of record.taken) {
    db.insert(schema.doseEvents).values({
      patientId,
      date: day(dose.date),
      medId: dose.med,
      time: dose.time,
      status: 'taken',
      takenAt: dose.at,
      why: null,
      locked: true,
    }).run();
  }

  for (const [date, weightKg] of Object.entries(record.weights)) {
    if (weightKg == null) continue;
    db.insert(schema.weights).values({ patientId, date: day(date as IsoDate), weightKg }).run();
  }

  // Past days: one entry per day holding the day's total
  for (const [date, ml] of Object.entries(record.fluid)) {
    if (ml == null) continue;
    db.insert(schema.fluidEntries).values({
      patientId,
      date: day(date as IsoDate),
      time: '12:00 PM',
      what: 'Water',
      ml,
      deletedAt: null,
    }).run();
  }

  // The fixture lists newest first; insert oldest first so "undo last" removes the latest drink.
  for (const drink of [...record.drinksToday].reverse()) {
    db.insert(schema.fluidEntries).values({
      patientId,
      date: today,
      time: drink.t,
      what: drink.what,
      ml: drink.ml,
      deletedAt: null,
    }).run();
  }

  for (const meal of record.mealsToday) {
    db.insert(schema.meals).values({ patientId, date: today, ...mealRow(meal), isDemoScan: false }).run();
  }
  if (record.demoScan) {
    db.insert(schema.meals).values({ patientId, date: today, ...mealRow(record.demoScan), isDemoScan: true }).run();
  }

  for (const symptom of record.symptoms) {
    db.insert(schema.symptoms).values({ patientId, date: day(symptom.date), key: symptom.key, sev: symptom.sev }).run();
  }

  for (const alert of record.alerts) {
    db.insert(schema.alerts).values({
      patientId,
      date: day(alert.date),
      time: alert.time,
      zone: alert.zone,
      familyTold: alert.familyTold,
    }).run();
  }

  return patientId;
}

export async function reseedDemoPatient(
  db: BetterSQLite3Database<typeof schema>,
  today: IsoDate = mdmTanSeed.today,
): Promise<number> {
  // Find existing demo patient
  const existing = db.select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.isDemo, true))
    .get();

  if (existing) {
    const patientId = existing.id;
    // Delete related data in child tables first
    db.delete(schema.sessions).where(eq(schema.sessions.patientId, patientId)).run();
    db.delete(schema.careTargets).where(eq(schema.careTargets.patientId, patientId)).run();
    db.delete(schema.medications).where(eq(schema.medications.patientId, patientId)).run();
    db.delete(schema.doseEvents).where(eq(schema.doseEvents.patientId, patientId)).run();
    db.delete(schema.weights).where(eq(schema.weights.patientId, patientId)).run();
    db.delete(schema.fluidEntries).where(eq(schema.fluidEntries.patientId, patientId)).run();
    db.delete(schema.meals).where(eq(schema.meals.patientId, patientId)).run();
    db.delete(schema.symptoms).where(eq(schema.symptoms.patientId, patientId)).run();
    db.delete(schema.alerts).where(eq(schema.alerts.patientId, patientId)).run();
    db.delete(schema.contacts).where(eq(schema.contacts.patientId, patientId)).run();
    db.delete(schema.shareSettings).where(eq(schema.shareSettings.patientId, patientId)).run();
    db.delete(schema.summaries).where(eq(schema.summaries.patientId, patientId)).run();
    db.delete(schema.uiFlags).where(eq(schema.uiFlags.patientId, patientId)).run();
    db.delete(schema.chatMessages).where(eq(schema.chatMessages.patientId, patientId)).run();
    db.delete(schema.patients).where(eq(schema.patients.id, patientId)).run();
  }

  return seedDemoPatient(db, today);
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.DATABASE_PATH || './data/ventra.db';
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  seedDemoPatient(db)
    .then((id) => {
      console.log(`Seeded demo patient with id ${id}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
