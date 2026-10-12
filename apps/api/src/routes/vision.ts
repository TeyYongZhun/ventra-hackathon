import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { MealScanResponse, VisionStatusResponse } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { parseMealReply, VISION_TIMEOUT_MS, VisionError, type ParsedMealReply, type VisionClient } from '../services/vision.js';

// The app sends a JPEG resized to about 1024 px (~150 KB). Allow some room, nothing silly.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const BODY_LIMIT = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 64 * 1024;

// Each check costs TokenHub credit: 20 an hour per patient, 120 an hour for the whole app.
export const SCANS_PER_HOUR = 20;
export const SCANS_PER_HOUR_ALL = 120;
const HOUR_MS = 60 * 60 * 1000;

// A check (with its one retry) gives up after 90 s; a retry needs at least 15 s to be worth it.
export const CHECK_BUDGET_MS = 90_000;
const MIN_RETRY_MS = 15_000;

const scanSchema = z.object({
  photo: z.string().min(1).max(BODY_LIMIT),
});

export interface VisionRouteOptions {
  db: ApiDb;
  vision?: VisionClient;
  now: () => number;
}

// Sliding-window limiter, one window per key. take() records a hit and returns 0, or returns
// ms until a slot frees.
function createLimiter(limit: number, windowMs: number, now: () => number) {
  const hitsByKey = new Map<string, number[]>();
  return {
    take(key: string): number {
      const t = now();
      const hits = (hitsByKey.get(key) ?? []).filter((hit) => hit > t - windowMs);
      if (hits.length >= limit) {
        hitsByKey.set(key, hits);
        return hits[0] + windowMs - t;
      }
      hits.push(t);
      hitsByKey.set(key, hits);
      return 0;
    },
  };
}

// base64 (or a data:image/jpeg URL) → JPEG bytes, or null when it isn't a JPEG we accept.
export function decodeJpeg(photo: string): Buffer | null {
  const base64 = photo.replace(/^data:image\/jpe?g;base64,/i, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES) return null;
  // Every JPEG starts with FF D8 FF.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return bytes;
}

// "Scan my meal" (C3): the AI estimates the salt from a photo. The estimate and photo stay on
// the server until the patient taps "Yes, log it" (POST /api/meals { scanId }), so the logged
// numbers are always the AI's, never ones sent back by the phone.
export function registerVisionRoutes(app: FastifyInstance, options: VisionRouteOptions) {
  const { db, vision, now } = options;
  const perPatient = createLimiter(SCANS_PER_HOUR, HOUR_MS, now);
  const overall = createLimiter(SCANS_PER_HOUR_ALL, HOUR_MS, now);

  app.get('/api/vision/status', async () => {
    return { meal: Boolean(vision) } satisfies VisionStatusResponse;
  });

  app.post('/api/vision/meal', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const parsed = scanSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }
    const jpeg = decodeJpeg(parsed.data.photo);
    if (!jpeg) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Please send the photo as a JPEG under 2 MB');
    }
    if (!vision) {
      request.log.warn('Meal photo scan is not configured (TOKENHUB_API_KEY missing)');
      return sendError(reply, 503, 'NOT_CONFIGURED', 'Photo checking is not set up yet.');
    }

    const scope = patientScope(request);
    const waitMs = perPatient.take(String(scope.patientId)) || overall.take('all');
    if (waitMs > 0) {
      reply.header('Retry-After', String(Math.ceil(waitMs / 1000)));
      return sendError(reply, 429, 'RATE_LIMITED', 'That is a lot of photos for now. Please try again later.');
    }

    // One retry (same rate-limit slot) when the model was too slow, answered nothing or answered
    // something unreadable: thinking time varies, so a second try often works. HTTP errors (bad
    // key, no credit) won't fix themselves, so they fail straight away.
    const started = performance.now();
    let result: ParsedMealReply | null = null;
    let reason = '';
    for (let attempt = 1; attempt <= 2 && !result; attempt++) {
      const leftMs = CHECK_BUDGET_MS - (performance.now() - started);
      if (attempt === 2 && leftMs < MIN_RETRY_MS) break;
      try {
        const text = await vision.describeMeal(jpeg, attempt === 1 ? {} : { timeoutMs: Math.round(Math.min(leftMs, VISION_TIMEOUT_MS)) });
        result = parseMealReply(text);
        if (!result) {
          reason = 'unreadable reply';
          request.log.warn({ attempt }, 'Meal photo reply was not readable');
        }
      } catch (error) {
        const code = error instanceof VisionError ? error.code : 'unknown';
        reason = error instanceof VisionError ? error.reason : 'unknown';
        request.log.warn({ attempt, visionError: code, detail: error instanceof VisionError ? error.message : undefined }, 'Meal photo check failed');
        if (code !== 'timeout' && code !== 'empty') break;
      }
    }

    const latencyMs = Math.round(performance.now() - started);
    if (!result) {
      // reason (e.g. "TokenHub HTTP 401") is for whoever runs the app; the patient sees message.
      return reply.status(502).send({ error: { code: 'VISION_FAILED', message: "We couldn't check this photo right now. Please try again.", reason } });
    }
    request.log.info({ latencyMs, found: result.found }, 'meal photo checked');
    if (!result.found) return { found: false } satisfies MealScanResponse;

    // Keep only this scan: an older one the patient didn't log is dropped with its photo.
    const scan = db.transaction((tx) => {
      tx.delete(schema.mealScans).where(eq(schema.mealScans.patientId, scope.patientId)).run();
      return tx.insert(schema.mealScans).values(scope.values({
        createdAt: new Date(now()).toISOString(),
        photo: jpeg,
        estimateJson: JSON.stringify(result.estimate),
      })).returning({ id: schema.mealScans.id }).get();
    });

    return { found: true, scanId: scan.id, sure: result.sure, estimate: result.estimate } satisfies MealScanResponse;
  });
}
