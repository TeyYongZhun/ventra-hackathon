import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { buildReport, catalogMedicine, type Medicine, type OnboardingResponse, type Report } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { loadRecordNow } from '../services/alerts.js';
import { isoDateSchema } from './metrics.js';

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  age: z.number().int().min(18).max(120).optional(),
  condition: z.string().trim().min(1).max(100).optional(),
  dischargeDate: isoDateSchema.optional(),
  textSize: z.enum(['large', 'xl']).optional(),
});

// Set by the clinic during set-up. Ranges are sanity limits, not clinical advice.
const targetsSchema = z.object({
  dryKg: z.number().min(25).max(250),
  alertGainKg: z.number().min(0.5).max(10),
  alertDays: z.number().int().min(1).max(14),
  fluidMl: z.number().int().min(500).max(5000),
  sodiumMg: z.number().int().min(500).max(6000),
  capMl: z.number().int().min(20).max(1000).optional(),
});

const capSchema = z.object({
  capMl: z.number().int().min(20).max(1000),
});

const medicationsSchema = z.object({
  meds: z.array(z.object({
    id: z.string().min(1).max(32),
    times: z.array(z.number().int().min(0).max(24 * 60 - 1)).min(1).max(4),
  })).max(12),
});

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relation: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(32).optional(),
});

export interface OnboardingRouteOptions {
  db: ApiDb;
  now: () => number;
}

// Set-up steps after sign-up (A2–A6). Every write is scoped to the session patient.
export function registerOnboardingRoutes(app: FastifyInstance, options: OnboardingRouteOptions) {
  const { db, now } = options;

  app.put('/api/onboarding/profile', async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');

    const scope = patientScope(request);
    const { textSize, ...rest } = parsed.data;
    const changes = { ...rest, ...(textSize ? { textSize } : {}) };
    if (Object.keys(changes).length > 0) {
      db.update(schema.patients).set(changes).where(eq(schema.patients.id, scope.patientId)).run();
    }
    return { ok: true } satisfies OnboardingResponse;
  });

  app.put('/api/onboarding/targets', async (request, reply) => {
    const parsed = targetsSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');

    const scope = patientScope(request);
    const existing = db.select({ id: schema.careTargets.id, capMl: schema.careTargets.capMl })
      .from(schema.careTargets).where(scope.where(schema.careTargets.patientId)).get();
    const values = { ...parsed.data, capMl: parsed.data.capMl ?? existing?.capMl ?? 0 };

    if (existing) {
      db.update(schema.careTargets).set(values).where(eq(schema.careTargets.id, existing.id)).run();
    } else {
      db.insert(schema.careTargets).values(scope.values(values)).run();
    }
    return { ok: true } satisfies OnboardingResponse;
  });

  app.put('/api/onboarding/cap', async (request, reply) => {
    const parsed = capSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');

    const scope = patientScope(request);
    const existing = db.select({ id: schema.careTargets.id })
      .from(schema.careTargets).where(scope.where(schema.careTargets.patientId)).get();
    if (!existing) {
      return sendError(reply, 409, 'CONFLICT', 'Set the care targets first');
    }
    db.update(schema.careTargets).set({ capMl: parsed.data.capMl }).where(eq(schema.careTargets.id, existing.id)).run();
    return { ok: true } satisfies OnboardingResponse;
  });

  // Replaces the medicine list with picks from MEDICINE_CATALOG.
  app.put('/api/onboarding/medications', async (request, reply) => {
    const parsed = medicationsSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');

    const picks: Array<{ med: Medicine; times: number[] }> = [];
    for (const pick of parsed.data.meds) {
      const med = catalogMedicine(pick.id);
      if (!med) return sendError(reply, 404, 'NOT_FOUND', 'Unknown medicine');
      picks.push({ med, times: [...new Set(pick.times)].sort((a, b) => a - b) });
    }

    const scope = patientScope(request);
    db.transaction((tx) => {
      tx.delete(schema.medications).where(scope.where(schema.medications.patientId)).run();
      for (const { med, times } of picks) {
        tx.insert(schema.medications).values(scope.values({
          medId: med.id,
          name: med.name,
          generic: med.generic,
          strength: med.strength,
          times: JSON.stringify(times),
          purpose: med.purpose,
          looks: med.looks,
          tile: med.tile ?? null,
          round: med.round ? JSON.stringify(med.round) : null,
          oval: med.oval ? JSON.stringify(med.oval) : null,
        })).run();
      }
    });
    return { ok: true } satisfies OnboardingResponse;
  });

  // One family contact; editing keeps an existing Telegram link.
  app.put('/api/onboarding/contact', async (request, reply) => {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');

    const scope = patientScope(request);
    const existing = db.select({ id: schema.contacts.id })
      .from(schema.contacts).where(scope.where(schema.contacts.patientId)).get();
    const values = { name: parsed.data.name, relation: parsed.data.relation, phone: parsed.data.phone || null };
    if (existing) {
      db.update(schema.contacts).set(values).where(eq(schema.contacts.id, existing.id)).run();
    } else {
      db.insert(schema.contacts).values(scope.values(values)).run();
    }
    return { ok: true } satisfies OnboardingResponse;
  });

  // Doctor report (F2a): same core numbers as every screen.
  app.get('/api/report', async (request) => {
    const scope = patientScope(request);
    return buildReport(loadRecordNow(db, scope.patientId, now())) satisfies Report;
  });
}
