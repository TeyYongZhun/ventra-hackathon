import crypto from 'node:crypto';
import fastify, { type FastifyReply, type FastifyRequest, type FastifyServerOptions } from 'fastify';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { and, desc, eq, isNull } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import * as schema from './db/schema.js';
import { patientScope, requirePatientId } from './db/scope.js';
import { sendError } from './errors.js';
import { registerAskRoutes } from './routes/ask.js';
import type { AdpClient } from './services/adp.js';

export type ApiDb = BetterSQLite3Database<typeof schema>;

interface LoginAttempt {
  count: number;
  lockedUntil?: number;
}

export interface CreateApiAppOptions {
  db: ApiDb;
  logger?: FastifyServerOptions['logger'];
  now?: () => number;
  loginAttempts?: Map<string, LoginAttempt>;
  adp?: AdpClient;
  pseudonymSecret?: string;
}

const SESSION_COOKIE = 'ventra_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_LOCK_MS = 5 * 60 * 1000;
const MAX_WRONG_PIN_ATTEMPTS = 5;

const pinSchema = z.string().regex(/^\d{4}$/);
const phoneSchema = z.string().trim().min(3).max(32);

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema,
  pin: pinSchema,
});

const loginSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});

const fluidSchema = z.object({
  what: z.string().trim().min(1).max(100),
  ml: z.number().int().positive().max(5000),
});

function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return undefined;
}

function sessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function clearSessionCookie(): string {
  return sessionCookie('', 0);
}

function isApiAuthExempt(method: string, path: string): boolean {
  return path === '/api/health'
    || (method === 'POST' && path === '/api/auth/signup')
    || (method === 'POST' && path === '/api/auth/login');
}

function isSqliteUniqueConstraint(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && String((error as { code: unknown }).code).startsWith('SQLITE_CONSTRAINT');
}

function todayIso(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function timeLabel(nowMs: number): string {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Singapore',
  }).format(new Date(nowMs));
}

export function createApiApp(options: CreateApiAppOptions) {
  const { db } = options;
  const now = options.now ?? (() => Date.now());
  const loginAttempts = options.loginAttempts ?? new Map<string, LoginAttempt>();

  const app = fastify({
    logger: options.logger ?? {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.body.pin', 'body.pin', 'pin'],
    },
  });

  function createSession(patientId: number): string {
    const token = crypto.randomBytes(32).toString('base64url');
    const createdAt = new Date(now()).toISOString();
    const expiresAt = new Date(now() + SESSION_TTL_MS).toISOString();

    db.insert(schema.sessions).values({
      patientId,
      token,
      createdAt,
      expiresAt,
    }).run();

    return token;
  }

  function setSession(reply: FastifyReply, patientId: number) {
    const token = createSession(patientId);
    reply.header('Set-Cookie', sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
  }

  app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (!path.startsWith('/api') || isApiAuthExempt(request.method, path)) {
      return;
    }

    const token = parseCookie(request.headers.cookie, SESSION_COOKIE);
    if (!token) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Session required');
    }

    const session = db.select({
      patientId: schema.sessions.patientId,
      expiresAt: schema.sessions.expiresAt,
    })
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .get();

    if (!session || session.expiresAt <= new Date(now()).toISOString()) {
      if (session) {
        db.delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
      }
      reply.header('Set-Cookie', clearSessionCookie());
      return sendError(reply, 401, 'UNAUTHORIZED', 'Session required');
    }

    request.patientId = session.patientId;
    request.sessionToken = token;
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const body = parsed.data;
    const pinHash = await bcryptjs.hash(body.pin, 10);

    try {
      const patient = db.insert(schema.patients).values({
        phone: body.phone,
        pinHash,
        name: body.name,
        age: 0,
        condition: '',
        isDemo: false,
      }).returning({ id: schema.patients.id }).get();

      setSession(reply, patient.id);
      return { ok: true, patientId: patient.id };
    } catch (error) {
      if (isSqliteUniqueConstraint(error)) {
        return sendError(reply, 409, 'CONFLICT', 'Phone already registered');
      }

      throw error;
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const body = parsed.data;
    const attempt = loginAttempts.get(body.phone);
    if (attempt?.lockedUntil && attempt.lockedUntil > now()) {
      return sendError(reply, 429, 'TOO_MANY_ATTEMPTS', 'Too many wrong PIN attempts. Try again later.');
    }
    if (attempt?.lockedUntil && attempt.lockedUntil <= now()) {
      loginAttempts.delete(body.phone);
    }

    const patient = db.select({
      id: schema.patients.id,
      pinHash: schema.patients.pinHash,
    })
      .from(schema.patients)
      .where(eq(schema.patients.phone, body.phone))
      .get();

    const validPin = patient ? await bcryptjs.compare(body.pin, patient.pinHash) : false;
    if (!validPin || !patient) {
      const current = loginAttempts.get(body.phone);
      const count = (current?.count ?? 0) + 1;
      const nextAttempt: LoginAttempt = { count };
      if (count >= MAX_WRONG_PIN_ATTEMPTS) {
        nextAttempt.lockedUntil = now() + LOGIN_LOCK_MS;
        loginAttempts.set(body.phone, nextAttempt);
        return sendError(reply, 429, 'TOO_MANY_ATTEMPTS', 'Too many wrong PIN attempts. Try again later.');
      }

      loginAttempts.set(body.phone, nextAttempt);
      return sendError(reply, 401, 'UNAUTHORIZED', 'Invalid credentials');
    }

    loginAttempts.delete(body.phone);
    setSession(reply, patient.id);
    return { ok: true };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    if (request.sessionToken) {
      db.delete(schema.sessions).where(eq(schema.sessions.token, request.sessionToken)).run();
    }

    reply.header('Set-Cookie', clearSessionCookie());
    return { ok: true };
  });

  app.get('/api/me', async (request, reply) => {
    const patientId = requirePatientId(request);
    const patient = db.select({
      name: schema.patients.name,
      isDemo: schema.patients.isDemo,
    })
      .from(schema.patients)
      .where(eq(schema.patients.id, patientId))
      .get();

    if (!patient) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Session required');
    }

    return { name: patient.name, is_demo: patient.isDemo };
  });

  app.post('/api/fluid', async (request, reply) => {
    const parsed = fluidSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const entry = db.insert(schema.fluidEntries).values(scope.values({
      date: todayIso(now()),
      time: timeLabel(now()),
      what: parsed.data.what,
      ml: parsed.data.ml,
    })).returning({
      id: schema.fluidEntries.id,
      date: schema.fluidEntries.date,
      time: schema.fluidEntries.time,
      what: schema.fluidEntries.what,
      ml: schema.fluidEntries.ml,
    }).get();

    return entry;
  });

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

  registerAskRoutes(app, {
    db,
    adp: options.adp,
    now,
    pseudonymSecret: options.pseudonymSecret || process.env.SESSION_SECRET || 'ventra-dev-pseudonym-salt',
  });

  return app;
}
