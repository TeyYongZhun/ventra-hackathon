import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import type { DemoResetResponse } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { requirePatientId } from '../db/scope.js';
import { reseedDemoPatient } from '../db/seed.js';
import { sendError } from '../errors.js';
import { sgDate } from '../time.js';

export interface DemoRouteOptions {
  db: ApiDb;
  now: () => number;
}

// Demo tools. Only the demo patient (is_demo) can use them; they rebuild synthetic data only.
export function registerDemoRoutes(app: FastifyInstance, options: DemoRouteOptions) {
  const { db, now } = options;

  function isDemoPatient(request: FastifyRequest, reply: FastifyReply): boolean {
    const patient = db.select({ isDemo: schema.patients.isDemo })
      .from(schema.patients)
      .where(eq(schema.patients.id, requirePatientId(request)))
      .get();
    if (patient?.isDemo) return true;
    sendError(reply, 403, 'FORBIDDEN', 'Only the demo patient can do this');
    return false;
  }

  // Back to the normal green demo day.
  app.post('/api/demo/reset', async (request, reply) => {
    if (!isDemoPatient(request, reply)) return reply;
    await reseedDemoPatient(db, sgDate(now()));
    return { ok: true } satisfies DemoResetResponse;
  });

  // Yellow-day demo: same history, but today's water pill was missed. Logging drinks past
  // the limit or swollen ankles then turns the day yellow and alerts the family.
  app.post('/api/demo/yellow-day', async (request, reply) => {
    if (!isDemoPatient(request, reply)) return reply;
    await reseedDemoPatient(db, sgDate(now()), { yellowDay: true });
    return { ok: true } satisfies DemoResetResponse;
  });
}
