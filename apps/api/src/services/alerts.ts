import { alertOn, evaluate, type AlertZone, type PatientRecord } from '@ventra/core';
import type { ApiDb } from '../app.js';
import { loadPatientRecord } from '../db/loader.js';
import * as schema from '../db/schema.js';
import { sgClock, sgDate, sgMinutes } from '../time.js';

export function loadRecordNow(db: ApiDb, patientId: number, nowMs: number): PatientRecord {
  return loadPatientRecord(db, patientId, { today: sgDate(nowMs), nowMin: sgMinutes(nowMs) });
}

// Runs the fixed alert rules (packages/core/rules.ts) after a write.
// Records at most one alert per day, the first time today turns yellow.
export function runAlertRules(db: ApiDb, patientId: number, nowMs: number): { zone: AlertZone; created: boolean } {
  const record = loadRecordNow(db, patientId, nowMs);
  const { zone } = evaluate(record, record.today);

  if (zone === 'green' || alertOn(record, record.today)) {
    return { zone, created: false };
  }

  db.insert(schema.alerts).values({
    patientId,
    date: record.today,
    time: sgClock(nowMs),
    zone,
    familyTold: false,
  }).run();

  return { zone, created: true };
}
