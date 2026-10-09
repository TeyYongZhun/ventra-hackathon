import type { FastifyInstance } from 'fastify';
import { desc } from 'drizzle-orm';
import { alertHeadline, alertOn, evaluate, nurseScript, reasons, type AlertsLatestResponse } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { loadRecordNow } from '../services/alerts.js';

export interface AlertRouteOptions {
  db: ApiDb;
  now: () => number;
}

export function registerAlertRoutes(app: FastifyInstance, options: AlertRouteOptions) {
  const { db, now } = options;

  // The yellow alert and the nurse script, both built from raw logs by packages/core.
  app.get('/api/alerts/latest', async (request) => {
    const scope = patientScope(request);
    const record = loadRecordNow(db, scope.patientId, now());
    const today = record.today;

    const latest = db.select({ date: schema.alerts.date })
      .from(schema.alerts)
      .where(scope.where(schema.alerts.patientId))
      .orderBy(desc(schema.alerts.date), desc(schema.alerts.id))
      .get();
    const todayCounts = evaluate(record, today).zone !== 'green' || alertOn(record, today) != null;
    const date = todayCounts || !latest ? today : (latest.date as typeof today);
    const alert = alertOn(record, date);

    return {
      zone: evaluate(record, date).zone,
      date,
      time: alert?.time ?? null,
      headline: alertHeadline(record, date),
      reasons: reasons(record, date),
      script: nurseScript(record, date),
      familyTold: alert?.familyTold ?? false,
      family: record.patient.family,
    } satisfies AlertsLatestResponse;
  });
}
