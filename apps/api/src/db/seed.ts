import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import * as schema from './schema.js';

export async function seedDemoPatient(db: BetterSQLite3Database<typeof schema>): Promise<number> {
  // Hash PIN 1234
  const pinHash = await bcryptjs.hash('1234', 10);

  // Insert patient
  const patientResult = db.insert(schema.patients).values({
    phone: '81234567',
    pinHash,
    name: 'Mdm Tan',
    age: 72,
    condition: 'heart failure',
    dischargeDate: '2026-09-27',
    dischargeWeightKg: 59.2,
    textSize: null,
    weighTime: '7:10 AM',
    isDemo: true,
  }).returning({ id: schema.patients.id }).get();

  const patientId = patientResult.id;

  // Insert family contact
  db.insert(schema.contacts).values({
    patientId,
    name: 'Mei Ling',
    relation: 'daughter',
    phone: null,
  }).run();

  // Insert care targets
  db.insert(schema.careTargets).values({
    patientId,
    dryKg: 58.0,
    alertGainKg: 2,
    alertDays: 3,
    fluidMl: 1500,
    sodiumMg: 2000,
    capMl: 150,
  }).run();

  // Insert medications
  const meds = [
    {
      medId: 'furo',
      name: 'Water pill',
      generic: 'Furosemide',
      strength: '40 mg',
      times: JSON.stringify([480]),
      purpose: 'Helps your body get rid of extra water, so you breathe easier and swell less.',
      looks: 'Small white round tablet',
      tile: '#DCE3EC',
      round: JSON.stringify({ size: 36, bg: '#FFFFFF', border: '#C9CED6', line: '#C9CED6' }),
      oval: null,
    },
    {
      medId: 'biso',
      name: 'Heart rate pill',
      generic: 'Bisoprolol',
      strength: '2.5 mg',
      times: JSON.stringify([480]),
      purpose: 'Keeps your heartbeat slow and steady, so your heart works less hard.',
      looks: 'Small pale-yellow round tablet',
      tile: '#E3E6EC',
      round: JSON.stringify({ size: 30, bg: '#F6E7A8', border: '#D8C277', line: '#C9B266' }),
      oval: null,
    },
    {
      medId: 'sv',
      name: 'Heart helper',
      generic: 'Sacubitril/Valsartan',
      strength: '49/51 mg',
      times: JSON.stringify([480, 1200]),
      purpose: 'Relaxes your blood vessels so your heart pumps more easily.',
      looks: 'Light-purple oval tablet',
      tile: '#E6E8EE',
      round: null,
      oval: JSON.stringify({ bg: '#D9C8E6', border: '#B8A3C9' }),
    },
    {
      medId: 'spiro',
      name: 'Heart protector',
      generic: 'Spironolactone',
      strength: '25 mg',
      times: JSON.stringify([480]),
      purpose: 'Protects your heart muscle over time and helps remove extra water.',
      looks: 'Light-brown round tablet',
      tile: '#E3E6EC',
      round: JSON.stringify({ size: 34, bg: '#EFD8BE', border: '#CDB08F', line: '#C2A584' }),
      oval: null,
    },
  ];

  for (const med of meds) {
    db.insert(schema.medications).values({ patientId, ...med }).run();
  }

  // Insert dose events
  const missedDoses = [
    { date: '2026-10-03', medId: 'furo', time: 480, why: 'going out' },
    { date: '2026-10-06', medId: 'furo', time: 480, why: 'going out' },
  ];

  for (const dose of missedDoses) {
    db.insert(schema.doseEvents).values({
      patientId,
      date: dose.date,
      medId: dose.medId,
      time: dose.time,
      status: 'missed',
      takenAt: null,
      why: dose.why,
      locked: true,
    }).run();
  }

  // Taken dose on 2026-10-07 at 480 (all meds at that time)
  const takenMeds = ['furo', 'biso', 'sv', 'spiro'];
  for (const medId of takenMeds) {
    db.insert(schema.doseEvents).values({
      patientId,
      date: '2026-10-07',
      medId,
      time: 480,
      status: 'taken',
      takenAt: '8:05 AM',
      why: null,
      locked: true,
    }).run();
  }

  // Insert weights
  const weightEntries: Record<string, number> = {
    '2026-09-27': 59.2,
    '2026-09-28': 58.9,
    '2026-09-29': 58.6,
    '2026-09-30': 58.4,
    '2026-10-01': 58.1,
    '2026-10-02': 58.3,
    '2026-10-03': 58.0,
    '2026-10-04': 58.2,
    '2026-10-05': 58.2,
    '2026-10-06': 58.2,
    '2026-10-07': 58.4,
  };

  for (const [date, weightKg] of Object.entries(weightEntries)) {
    db.insert(schema.weights).values({ patientId, date, weightKg }).run();
  }

  // Insert fluid entries for past days (single entry per day with total)
  const fluidTotals: Record<string, number> = {
    '2026-10-01': 1350,
    '2026-10-02': 1400,
    '2026-10-03': 1750,
    '2026-10-04': 1300,
    '2026-10-05': 1450,
    '2026-10-06': 1200,
  };

  for (const [date, ml] of Object.entries(fluidTotals)) {
    db.insert(schema.fluidEntries).values({
      patientId,
      date,
      time: '12:00 PM',
      what: 'Water',
      ml,
      deletedAt: null,
    }).run();
  }

  // Insert fluid entries for today (Oct 7)
  const drinksToday = [
    { time: '3:00 PM', what: 'Water', ml: 300 },
    { time: '12:40 PM', what: 'Soup', ml: 250 },
    { time: '9:15 AM', what: 'Tea', ml: 150 },
    { time: '7:30 AM', what: 'Water', ml: 150 },
  ];

  for (const drink of drinksToday) {
    db.insert(schema.fluidEntries).values({
      patientId,
      date: '2026-10-07',
      time: drink.time,
      what: drink.what,
      ml: drink.ml,
      deletedAt: null,
    }).run();
  }

  // Insert meals
  const mealsToday = [
    {
      time: '7:30 AM',
      meal: 'Breakfast',
      what: 'Oat porridge with banana',
      sodiumMg: 500,
      kcal: 330,
      potassiumMg: 480,
      phosphorusMg: 260,
      carbsJson: JSON.stringify({ g: 58, what: 'Oats and banana' }),
      proteinJson: JSON.stringify({ g: 9, what: 'Oats and milk' }),
      fatJson: JSON.stringify({ g: 7, what: 'Milk' }),
      plateJson: JSON.stringify([0.75, 0.125, 0.125]),
      tip: 'A good choice. Most of the salt comes from the instant oats — plain rolled oats have less.',
      isDemoScan: false,
    },
    {
      time: '12:40 PM',
      meal: 'Lunch',
      what: 'Fish soup with noodles',
      sodiumMg: 1100,
      kcal: 420,
      potassiumMg: 650,
      phosphorusMg: 280,
      carbsJson: JSON.stringify({ g: 52, what: 'Noodles' }),
      proteinJson: JSON.stringify({ g: 24, what: 'Fish' }),
      fatJson: JSON.stringify({ g: 12, what: 'Oil and fish' }),
      plateJson: JSON.stringify([0.5, 0.25, 0.25]),
      tip: 'Most of the salt is in the soup — try drinking only half next time.',
      isDemoScan: false,
    },
    {
      time: '6:30 PM',
      meal: 'Dinner',
      what: 'Steamed fish with rice and vegetables',
      sodiumMg: 450,
      kcal: 480,
      potassiumMg: 720,
      phosphorusMg: 320,
      carbsJson: JSON.stringify({ g: 60, what: 'Rice' }),
      proteinJson: JSON.stringify({ g: 28, what: 'Fish' }),
      fatJson: JSON.stringify({ g: 10, what: 'Oil' }),
      plateJson: JSON.stringify([0.5, 0.25, 0.25]),
      tip: 'Great pick — steaming keeps the salt low. Skip extra soy sauce.',
      isDemoScan: true,
    },
  ];

  for (const meal of mealsToday) {
    db.insert(schema.meals).values({ patientId, date: '2026-10-07', ...meal }).run();
  }

  // Insert symptoms
  const symptoms = [
    { date: '2026-10-02', key: 'tired', sev: 'Mild' },
    { date: '2026-10-03', key: 'ankles', sev: 'Mild' },
    { date: '2026-10-04', key: 'dizzy', sev: 'Mild' },
    { date: '2026-10-04', key: 'tired', sev: 'Mild' },
    { date: '2026-10-05', key: 'ankles', sev: 'Mild' },
    { date: '2026-10-06', key: 'tired', sev: 'Mild' },
  ];

  for (const symptom of symptoms) {
    db.insert(schema.symptoms).values({ patientId, ...symptom }).run();
  }

  // Insert alerts
  db.insert(schema.alerts).values({
    patientId,
    date: '2026-10-03',
    time: '6:10 PM',
    zone: 'yellow',
    familyTold: true,
  }).run();

  return patientId;
}

export async function reseedDemoPatient(db: BetterSQLite3Database<typeof schema>): Promise<number> {
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

  return seedDemoPatient(db);
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
