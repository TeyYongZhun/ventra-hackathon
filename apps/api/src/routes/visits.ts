import type { FastifyInstance } from 'fastify';
import { and, asc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import type { IsoDate, VisitDeleteResponse, VisitEntry, VisitListResponse } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { sgDate } from '../time.js';
import { isoDateSchema } from './metrics.js';

// "10:30 AM", "9:00 PM"
const timeSchema = z.string().trim().regex(/^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);

const visitSchema = z.object({
  date: isoDateSchema,
  time: timeSchema,
  title: z.string().trim().min(1).max(80),
  doctor: optionalText(80),
  place: optionalText(120),
  bring: optionalText(160),
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

export interface VisitRouteOptions {
  db: ApiDb;
  now: () => number;
}

function toEntry(row: typeof schema.visits.$inferSelect): VisitEntry {
  return { id: row.id, date: row.date as IsoDate, time: row.time, title: row.title, doctor: row.doctor, place: row.place, bring: row.bring };
}

// Minutes after midnight for "10:30 AM", to order visits on the same day.
function minutes(time: string): number {
  const match = /^(\d+):(\d+) (AM|PM)$/.exec(time);
  if (!match) return 0;
  const hour = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

// Clinic visits and tests (Calendar). Every query is limited to the session's patient.
export function registerVisitRoutes(app: FastifyInstance, options: VisitRouteOptions) {
  const { db, now } = options;

  // Upcoming visits (today onwards), soonest first.
  app.get('/api/visits', async (request) => {
    const scope = patientScope(request);
    const rows = db.select().from(schema.visits)
      .where(and(scope.where(schema.visits.patientId), gte(schema.visits.date, sgDate(now()))))
      .orderBy(asc(schema.visits.date))
      .all();
    const visits = rows
      .map(toEntry)
      .sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));
    return { today: sgDate(now()), visits } satisfies VisitListResponse;
  });

  app.post('/api/visits', async (request, reply) => {
    const parsed = visitSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    if (parsed.data.date < sgDate(now())) return sendError(reply, 400, 'VALIDATION_ERROR', 'The visit date has already passed');

    const scope = patientScope(request);
    const row = db.insert(schema.visits).values(scope.values(parsed.data)).returning().get();
    return toEntry(row);
  });

  app.delete('/api/visits/:id', async (request, reply) => {
    const parsed = idSchema.safeParse(request.params);
    if (!parsed.success) return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid visit id');

    const scope = patientScope(request);
    const deleted = db.delete(schema.visits)
      .where(and(eq(schema.visits.id, parsed.data.id), scope.where(schema.visits.patientId)))
      .returning({ id: schema.visits.id })
      .get();
    if (!deleted) return sendError(reply, 404, 'NOT_FOUND', 'No such visit');
    return { ok: true, deletedId: deleted.id } satisfies VisitDeleteResponse;
  });
}
