import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  SAFE_REPLIES,
  screenInput,
  screenOutput,
  questionWithContext,
  type AskReplyKind,
  type AskResponse,
  type VisitQuestionNote,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { AdpError, type AdpClient } from '../services/adp.js';
import { loadRecordNow } from '../services/alerts.js';
import type { VisionClient } from '../services/vision.js';
import { addDoseQuestion, polishQuestion, reviewAskQuestion } from '../services/visitQuestions.js';
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
  // TokenHub, to decide whether a question should go on the patient's list for their next visit.
  vision?: VisionClient;
  now: () => number;
  pseudonymSecret: string;
}

// Visit-question reviews cost TokenHub credit: 30 an hour per patient is plenty.
const REVIEWS_PER_HOUR = 30;
// How long the reply waits for the doctor check once the answer is ready. Slower checks still
// add the question; the chat just doesn't mention it.
export const REVIEW_WAIT_MS = 4_000;

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
  const { db, adp, vision, now, pseudonymSecret } = options;
  const limiter = createLimiter(ASK_LIMIT_PER_MINUTE, LIMIT_WINDOW_MS, now);
  const reviewLimiters = new Map<number, ReturnType<typeof createLimiter>>();

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

    function respond(text: string, kind: AskReplyKind, visitQuestion: VisitQuestionNote | null = null): AskResponse {
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
      request.log.info({ requestId, kind, latencyMs, visitQuestion: visitQuestion?.status }, 'ask answered');
      return { reply: text, kind, request_id: requestId, visitQuestion };
    }

    // TokenHub calls for visit questions, within the patient's hourly allowance.
    function mayReview(): boolean {
      if (!vision) return false;
      let patientLimiter = reviewLimiters.get(scope.patientId);
      if (!patientLimiter) {
        patientLimiter = createLimiter(REVIEWS_PER_HOUR, 60 * 60 * 1000, now);
        reviewLimiters.set(scope.patientId, patientLimiter);
      }
      return patientLimiter.take() === 0;
    }

    // Emergency and dose questions get a fixed reply and never reach the AI.
    const screened = screenInput(question);
    if (screened.allowed === false && screened.reason === 'dose') {
      // Dose questions are for the doctor: onto the visit list at once, tidied by the AI later.
      const dose = addDoseQuestion(db, scope.patientId, question, now());
      if (dose?.id != null && vision && mayReview()) {
        polishQuestion({ db, vision, patientId: scope.patientId, id: dose.id, asked: question })
          .catch((error) => request.log.warn({ err: error, requestId }, 'Visit question rewrite failed'));
      }
      return respond(screened.reply, 'dose', dose?.note ?? null);
    }
    if (!screened.allowed) {
      return respond(screened.reply, screened.reason === 'invalid' ? 'unsure' : screened.reason);
    }

    // Does answering this need the patient's own doctor? Checked alongside the answer; the reply
    // waits at most REVIEW_WAIT_MS more for it.
    let review: Promise<VisitQuestionNote | null> | null = null;
    const startReview = () => {
      if (!vision || !mayReview()) return;
      review = reviewAskQuestion({ db, vision, patientId: scope.patientId, asked: question, nowMs: now() })
        .catch((error) => {
          request.log.warn({ err: error, requestId }, 'Visit question review failed');
          return null;
        });
    };
    const reviewNote = async (): Promise<VisitQuestionNote | null> => {
      if (!review) return null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), REVIEW_WAIT_MS);
      });
      const note = await Promise.race([review, timeout]);
      clearTimeout(timer);
      return note;
    };

    if (!adp) {
      request.log.warn({ requestId }, 'ADP is not configured (ADP_KEY_GENERAL missing)');
      startReview();
      return respond(SAFE_REPLIES.unsure, 'unsure', await reviewNote());
    }

    const waitMs = limiter.take();
    if (waitMs > 0) {
      reply.header('Retry-After', String(Math.ceil(waitMs / 1000)));
      return sendError(reply, 429, 'RATE_LIMITED', 'Too many questions right now. Please try again in a minute.');
    }
    startReview();

    let answer: string;
    try {
      // The patient's own numbers (drinks, salt, weight — no medicines, no identity) go
      // with the question so answers like "How much can I drink today?" use them.
      answer = await adp.ask({
        question: questionWithContext(question, loadRecordNow(db, scope.patientId, now())),
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
      return respond(SAFE_REPLIES.unsure, 'unsure', await reviewNote());
    }

    const checked = screenOutput(answer);
    if (!checked.allowed) {
      request.log.info({ requestId, blocked: checked.reason }, 'AI answer blocked by guardrail');
      return respond(checked.reply, 'unsure', await reviewNote());
    }

    return respond(checked.text, 'answer', await reviewNote());
  });
}
