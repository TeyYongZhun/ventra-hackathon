import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { addDays, mdmTanSeed, type IsoDate, type MealLog } from '@ventra/core';
import * as schema from './schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface DemoDataOptions {
  // Yellow-day demo: today's water pill is recorded as missed instead of taken.
  yellowDay?: boolean;
  // Telegram chat to keep (or set) on the demo family contact.
  familyChatId?: string | null;
}

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

// Writes Mdm Tan's synthetic history for an existing patient row, from the core fixture,
// with every date shifted so her last day is `today`.
function insertDemoData(db: Db, patientId: number, today: IsoDate, options: DemoDataOptions = {}) {
  const record = mdmTanSeed;
  const offset = daysBetween(record.today, today);
  const day = (date: IsoDate) => addDays(date, offset);
  const waterPill = record.meds.find((med) => med.name === 'Water pill');
  const isYellowDayPill = (date: IsoDate, med: string) =>
    Boolean(options.yellowDay) && date === record.today && med === waterPill?.id;

  db.update(schema.patients).set({
    name: record.patient.name,
    age: record.patient.age,
    condition: record.patient.condition,
    dischargeDate: day(record.discharge),
    dischargeWeightKg: record.weights[record.discharge] ?? null,
    weighTime: record.weighTime,
  }).where(eq(schema.patients.id, patientId)).run();

  db.insert(schema.contacts).values({
    patientId,
    name: record.patient.family.name,
    relation: record.patient.family.relation,
    phone: null,
    telegramChatId: options.familyChatId ?? null,
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

  const missed = [...record.missed];
  if (options.yellowDay && waterPill) {
    missed.push({ date: record.today, med: waterPill.id, time: waterPill.times[0] ?? 480, why: 'demo' });
  }
  for (const dose of missed) {
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
    if (isYellowDayPill(dose.date, dose.med)) continue;
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

  // Upcoming visits (design/Calendar.dc.html): heart clinic in 6 days, blood test in 20.
  db.insert(schema.visits).values({ patientId, date: day('2026-10-13'), time: '10:30 AM', title: 'Heart clinic', doctor: 'Dr Lim', place: 'Level 3, Room 12', bring: 'Medicine list · this phone · IC card' }).run();
  db.insert(schema.visits).values({ patientId, date: day('2026-10-27'), time: '9:00 AM', title: 'Blood test', doctor: null, place: 'Polyclinic lab', bring: null }).run();

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
}

// Removes everything logged for a patient except the patient row and sessions.
function clearPatientData(db: Db, patientId: number) {
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
  db.delete(schema.visits).where(eq(schema.visits.patientId, patientId)).run();
}

// Inserts Mdm Tan (phone 81234567, PIN 1234) with history ending on `today`.
export async function seedDemoPatient(db: Db, today: IsoDate = mdmTanSeed.today, options: DemoDataOptions = {}): Promise<number> {
  const record = mdmTanSeed;
  const pinHash = await bcryptjs.hash('1234', 10);

  const patient = db.insert(schema.patients).values({
    phone: '81234567',
    pinHash,
    name: record.patient.name,
    age: record.patient.age,
    condition: record.patient.condition,
    textSize: null,
    isDemo: true,
  }).returning({ id: schema.patients.id }).get();

  insertDemoData(db, patient.id, today, options);
  return patient.id;
}

// Rebuilds the demo patient's data in place, keeping the patient id, sessions and the
// family's Telegram link. Creates the demo patient if there is none.
export async function reseedDemoPatient(db: Db, today: IsoDate = mdmTanSeed.today, options: DemoDataOptions = {}): Promise<number> {
  const existing = db.select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.isDemo, true))
    .get();

  if (!existing) {
    return seedDemoPatient(db, today, options);
  }

  const linkedChat = db.select({ chatId: schema.contacts.telegramChatId })
    .from(schema.contacts)
    .where(eq(schema.contacts.patientId, existing.id))
    .get()?.chatId;

  db.transaction((tx) => {
    // Back to the default text size (Extra large) too, so every demo starts the same.
    tx.update(schema.patients).set({ textSize: null }).where(eq(schema.patients.id, existing.id)).run();
    clearPatientData(tx, existing.id);
    insertDemoData(tx, existing.id, today, { ...options, familyChatId: linkedChat ?? options.familyChatId ?? null });
  });
  return existing.id;
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
