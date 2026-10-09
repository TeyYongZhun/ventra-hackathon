import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type {
  DoseConfirmResponse,
  FluidDeleteResponse,
  FluidEntryResponse,
  IsoDate,
  SymptomEntryResponse,
  WeightEntryResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { runAlertRules } from '../services/alerts.js';
import { sgClock, sgDate } from '../time.js';
import { isoDateSchema } from './metrics.js';

const fluidSchema = z.object({
  what: z.string().trim().min(1).max(100),
  ml: z.number().int().positive().max(5000),
});

const weightSchema = z.object({
  weightKg: z.number().min(20).max(250),
});

const symptomSchema = z.object({
  key: z.enum(['ankles', 'tired', 'dizzy', 'breath']),
  sev: z.enum(['Mild', 'Moderate', 'Severe']),
});

const doseConfirmSchema = z.object({
  date: isoDateSchema,
  medId: z.string().trim().min(1).max(32),
  time: z.number().int().min(0).max(24 * 60 - 1),
});

export interface LogRouteOptions {
  db: ApiDb;
  now: () => number;
  // Called when a write turns today yellow for the first time (e.g. to tell the family).
  onAlert?: (patientId: number, alertId: number) => void;
}

// Raw-event logging. Every write is scoped to the session patient and re-runs the alert rules.
export function registerLogRoutes(app: FastifyInstance, options: LogRouteOptions) {
  const { db, now, onAlert } = options;

  function afterWrite(patientId: number, nowMs: number) {
    const { alertId } = runAlertRules(db, patientId, nowMs);
    if (alertId != null) onAlert?.(patientId, alertId);
  }

  app.get('/api/fluid', async (request) => {
    const scope = patientScope(request);
    const entries = db.select({
      id: schema.fluidEntries.id,
      date: schema.fluidEntries.date,
      time: schema.fluidEntries.time,
      what: schema.fluidEntries.what,
      ml: schema.fluidEntries.ml,
    })
      .from(schema.fluidEntries)
      .where(and(scope.where(schema.fluidEntries.patientId), isNull(schema.fluidEntries.deletedAt)))
      .orderBy(desc(schema.fluidEntries.id))
      .all();

    return { entries };
  });

  app.post('/api/fluid', async (request, reply) => {
    const parsed = fluidSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const entry = db.insert(schema.fluidEntries).values(scope.values({
      date: sgDate(nowMs),
      time: sgClock(nowMs),
      what: parsed.data.what,
      ml: parsed.data.ml,
    })).returning({
      id: schema.fluidEntries.id,
      date: schema.fluidEntries.date,
      time: schema.fluidEntries.time,
      what: schema.fluidEntries.what,
      ml: schema.fluidEntries.ml,
    }).get();

    afterWrite(scope.patientId, nowMs);
    return { ...entry, date: entry.date as IsoDate } satisfies FluidEntryResponse;
  });

  // Undo is a soft delete, and only for a drink logged today.
  app.delete('/api/fluid/last', async (request, reply) => {
    const scope = patientScope(request);
    const nowMs = now();
    const last = db.select({ id: schema.fluidEntries.id, date: schema.fluidEntries.date })
      .from(schema.fluidEntries)
      .where(and(scope.where(schema.fluidEntries.patientId), isNull(schema.fluidEntries.deletedAt)))
      .orderBy(desc(schema.fluidEntries.id))
      .get();

    if (!last) {
      return sendError(reply, 404, 'NOT_FOUND', 'No drink to undo');
    }
    if (last.date !== sgDate(nowMs)) {
      return sendError(reply, 409, 'CONFLICT', 'Only drinks logged today can be undone');
    }

    db.update(schema.fluidEntries)
      .set({ deletedAt: new Date(nowMs).toISOString() })
      .where(and(scope.where(schema.fluidEntries.patientId), eq(schema.fluidEntries.id, last.id)))
      .run();

    afterWrite(scope.patientId, nowMs);
    return { ok: true, deletedId: last.id } satisfies FluidDeleteResponse;
  });

  // One weight per day: weighing again today replaces the earlier number.
  app.post('/api/weight', async (request, reply) => {
    const parsed = weightSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const date = sgDate(nowMs);
    const weightKg = Math.round(parsed.data.weightKg * 10) / 10;
    const todayFilter = and(scope.where(schema.weights.patientId), eq(schema.weights.date, date));
    const existing = db.select({ id: schema.weights.id }).from(schema.weights).where(todayFilter).get();

    let id: number;
    if (existing) {
      db.update(schema.weights).set({ weightKg }).where(and(todayFilter, eq(schema.weights.id, existing.id))).run();
      id = existing.id;
    } else {
      id = db.insert(schema.weights).values(scope.values({ date, weightKg }))
        .returning({ id: schema.weights.id }).get().id;
    }

    afterWrite(scope.patientId, nowMs);
    return { id, date, weightKg } satisfies WeightEntryResponse;
  });

  // One entry per symptom per day: logging it again updates the severity.
  app.post('/api/symptoms', async (request, reply) => {
    const parsed = symptomSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const date = sgDate(nowMs);
    const { key, sev } = parsed.data;
    const sameFilter = and(
      scope.where(schema.symptoms.patientId),
      eq(schema.symptoms.date, date),
      eq(schema.symptoms.key, key),
    );
    const existing = db.select({ id: schema.symptoms.id }).from(schema.symptoms).where(sameFilter).get();

    let id: number;
    if (existing) {
      db.update(schema.symptoms).set({ sev }).where(and(sameFilter, eq(schema.symptoms.id, existing.id))).run();
      id = existing.id;
    } else {
      id = db.insert(schema.symptoms).values(scope.values({ date, key, sev }))
        .returning({ id: schema.symptoms.id }).get().id;
    }

    afterWrite(scope.patientId, nowMs);
    return { id, date, key, sev } satisfies SymptomEntryResponse;
  });

  // "I took it". Taken doses are locked: there is no update or delete route.
  app.post('/api/doses/confirm', async (request, reply) => {
    const parsed = doseConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const { date, medId, time } = parsed.data;
    if (date !== sgDate(nowMs)) {
      return sendError(reply, 409, 'CONFLICT', "Only today's doses can be confirmed");
    }

    const med = db.select({ times: schema.medications.times })
      .from(schema.medications)
      .where(and(scope.where(schema.medications.patientId), eq(schema.medications.medId, medId)))
      .get();
    if (!med || !(JSON.parse(med.times) as number[]).includes(time)) {
      return sendError(reply, 404, 'NOT_FOUND', 'No such dose');
    }

    const alreadyTaken = db.select({ id: schema.doseEvents.id })
      .from(schema.doseEvents)
      .where(and(
        scope.where(schema.doseEvents.patientId),
        eq(schema.doseEvents.date, date),
        eq(schema.doseEvents.medId, medId),
        eq(schema.doseEvents.time, time),
        eq(schema.doseEvents.status, 'taken'),
      ))
      .get();
    if (alreadyTaken) {
      return sendError(reply, 409, 'CONFLICT', 'Dose already confirmed');
    }

    const takenAt = sgClock(nowMs);
    db.insert(schema.doseEvents).values(scope.values({
      date,
      medId,
      time,
      status: 'taken',
      takenAt,
      why: null,
      locked: true,
    })).run();

    afterWrite(scope.patientId, nowMs);
    return { ok: true, takenAt } satisfies DoseConfirmResponse;
  });
}
