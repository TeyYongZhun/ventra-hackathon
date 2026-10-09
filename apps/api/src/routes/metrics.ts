import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildMetrics, type IsoDate, type MetricsResponse } from '@ventra/core';
import type { ApiDb } from '../app.js';
import { loadPatientRecord } from '../db/loader.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { sgDate, sgMinutes } from '../time.js';

export const isoDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value));

const metricsQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export interface MetricsRouteOptions {
  db: ApiDb;
  now: () => number;
}

export function registerMetricsRoutes(app: FastifyInstance, options: MetricsRouteOptions) {
  const { db, now } = options;

  app.get('/api/metrics', async (request, reply) => {
    const parsed = metricsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
    }

    const scope = patientScope(request);
    const nowMs = now();
    const realToday = sgDate(nowMs);
    const date = (parsed.data.date ?? realToday) as IsoDate;
    // A past day is over (every dose settled); a future day has not started.
    const nowMin = date === realToday ? sgMinutes(nowMs) : date < realToday ? 24 * 60 : 0;

    const record = loadPatientRecord(db, scope.patientId, { today: date, nowMin });
    return buildMetrics(record) satisfies MetricsResponse;
  });
}
