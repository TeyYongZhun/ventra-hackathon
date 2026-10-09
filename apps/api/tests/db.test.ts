import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient, reseedDemoPatient } from '../src/db/seed.js';
import { loadPatientRecord } from '../src/db/loader.js';
import { adherence, pillsToday, weighStreak } from '@ventra/core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
  return db;
}

describe('database', () => {
  it('should seed and load Mdm Tan with correct metrics', async () => {
    const db = createTestDb();
    const patientId = await seedDemoPatient(db);
    expect(patientId).toBeGreaterThan(0);

    const record = loadPatientRecord(db, patientId);

    // Adherence: 32 of 34
    const adh = adherence(record);
    expect(adh.taken).toBe(32);
    expect(adh.due).toBe(34);
    expect(adh.text).toBe('32 of 34');

    // Pills today: 4 of 5
    const pills = pillsToday(record);
    expect(pills.taken).toBe(4);
    expect(pills.total).toBe(5);

    // Weigh streak: 11
    const streak = weighStreak(record);
    expect(streak).toBe(11);
  });

  it('should re-seed only the demo patient', async () => {
    const db = createTestDb();
    const id1 = await seedDemoPatient(db);
    const id2 = await reseedDemoPatient(db);

    // After re-seed there should be exactly one demo patient
    const demoPatients = db.select({ id: schema.patients.id })
      .from(schema.patients)
      .where(eq(schema.patients.isDemo, true))
      .all();
    expect(demoPatients.length).toBe(1);
    expect(demoPatients[0].id).toBe(id2);

    const record = loadPatientRecord(db, id2);
    const adh = adherence(record);
    expect(adh.text).toBe('32 of 34');
  });
});
