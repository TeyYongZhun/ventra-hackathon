import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  SAFE_REPLIES,
  screenInput,
  screenOutput,
  type AskReplyKind,
  type AskResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { AdpError, type AdpClient } from '../services/adp.js';
import { sgDate } from '../time.js';

// ADP free plan allows 10 requests per minute for the whole app; stay under it.
export const ASK_LIMIT_PER_MINUTE = 8;
const LIMIT_WINDOW_MS = 60 * 1000;

const askSchema = z.object({
  question: z.string().trim().min(1).max(2000),
});

export interface AskRouteOptions {
  db: ApiDb;
  adp?: AdpClient;
  now: () => number;
  pseudonymSecret: string;
}

// Sliding-window limiter. take() records a hit and returns 0, or returns ms until a slot frees.
function createLimiter(limit: number, windowMs: number, now: () => number) {
  const hits: number[] = [];
  return {
    take(): number {
      const t = now();
      while (hits.length > 0 && hits[0] <= t - windowMs) hits.shift();
      if (hits.length >= limit) return hits[0] + windowMs - t;
      hits.push(t);
      return 0;
    },
  };
}

export function registerAskRoutes(app: FastifyInstance, options: AskRouteOptions) {
  const { db, adp, now, pseudonymSecret } = options;
  const limiter = createLimiter(ASK_LIMIT_PER_MINUTE, LIMIT_WINDOW_MS, now);

  // Stable pseudonym for ADP: no name, phone or raw patient id leaves the server.
  function pseudonym(kind: string, value: string): string {
    return crypto.createHmac('sha256', pseudonymSecret).update(`${kind}:${value}`).digest('hex').slice(0, 32);
  }

  app.post('/api/ask', async (request, reply) => {
    const started = performance.now();
    const parsed = askSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const question = parsed.data.question;
    const requestId = crypto.randomUUID();

    function respond(text: string, kind: AskReplyKind): AskResponse {
      const latencyMs = Math.round(performance.now() - started);
      const createdAt = new Date(now()).toISOString();
      try {
        db.insert(schema.chatMessages).values([
          scope.values({ role: 'user', content: question, createdAt, requestId }),
          scope.values({ role: 'assistant', content: text, createdAt, requestId, latencyMs }),
        ]).run();
      } catch (error) {
        // Logging must never stop a safety reply from reaching the patient.
        request.log.error({ err: error, requestId }, 'Failed to save chat messages');
      }
      request.log.info({ requestId, kind, latencyMs }, 'ask answered');
      return { reply: text, kind, request_id: requestId };
    }

    // Emergency and dose questions get a fixed reply and never reach the AI.
    const screened = screenInput(question);
    if (!screened.allowed) {
      return respond(screened.reply, screened.reason === 'invalid' ? 'unsure' : screened.reason);
    }

    if (!adp) {
      request.log.warn({ requestId }, 'ADP is not configured (ADP_KEY_GENERAL missing)');
      return respond(SAFE_REPLIES.unsure, 'unsure');
    }

    const waitMs = limiter.take();
    if (waitMs > 0) {
      reply.header('Retry-After', String(Math.ceil(waitMs / 1000)));
      return sendError(reply, 429, 'RATE_LIMITED', 'Too many questions right now. Please try again in a minute.');
    }

    let answer: string;
    try {
      answer = await adp.ask({
        question,
        requestId,
        sessionId: pseudonym('session', `${scope.patientId}:${sgDate(now())}`),
        visitorId: pseudonym('visitor', String(scope.patientId)),
      });
    } catch (error) {
      request.log.warn({
        requestId,
        adpError: error instanceof AdpError ? error.code : 'unknown',
        detail: error instanceof AdpError ? error.message : undefined,
      }, 'ADP call failed');
      return respond(SAFE_REPLIES.unsure, 'unsure');
    }

    const checked = screenOutput(answer);
    if (!checked.allowed) {
      request.log.info({ requestId, blocked: checked.reason }, 'AI answer blocked by guardrail');
      return respond(checked.reply, 'unsure');
    }

    return respond(checked.text, 'answer');
  });
}
