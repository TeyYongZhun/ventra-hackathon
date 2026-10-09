import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient } from '../src/db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
  return { db, close: () => sqlite.close() };
}

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

describe('auth and patient scoping', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) {
      await cleanup.pop()?.();
    }
  });

  it('returns 401 for protected routes without login', async () => {
    const { db, close } = createTestDb();
    const app = createApiApp({ db, logger: false });
    cleanup.push(close, () => app.close());

    const response = await app.inject({ method: 'GET', url: '/api/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Session required' },
    });
  });

  it('scopes fluid entries to the logged-in patient only', async () => {
    const { db, close } = createTestDb();
    const app = createApiApp({ db, logger: false, now: () => Date.parse('2026-10-07T07:00:00.000Z') });
    cleanup.push(close, () => app.close());

    const signupA = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { name: 'Patient A', phone: '80000001', pin: '1111' },
    });
    expect(signupA.statusCode).toBe(200);
    const cookieA = cookieFrom(signupA);

    const signupB = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { name: 'Patient B', phone: '80000002', pin: '2222' },
    });
    expect(signupB.statusCode).toBe(200);

    const addFluid = await app.inject({
      method: 'POST',
      url: '/api/fluid',
      headers: { cookie: cookieA },
      payload: { what: 'Water', ml: 250, patient_id: 999 },
    });
    expect(addFluid.statusCode).toBe(200);

    const loginB = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '80000002', pin: '2222' },
    });
    expect(loginB.statusCode).toBe(200);
    const cookieB = cookieFrom(loginB);

    const bFluid = await app.inject({
      method: 'GET',
      url: '/api/fluid',
      headers: { cookie: cookieB },
    });

    expect(bFluid.statusCode).toBe(200);
    expect(bFluid.json()).toEqual({ entries: [] });
  });

  it('locks login for 5 minutes after 5 wrong PINs, then allows a correct PIN', async () => {
    let nowMs = Date.parse('2026-10-07T00:00:00.000Z');
    const { db, close } = createTestDb();
    const app = createApiApp({ db, logger: false, now: () => nowMs });
    cleanup.push(close, () => app.close());

    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { name: 'Lock Test', phone: '80000003', pin: '3333' },
    });
    expect(signup.statusCode).toBe(200);

    for (let i = 0; i < 4; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { phone: '80000003', pin: '9999' },
      });
      expect(response.statusCode).toBe(401);
    }

    const fifth = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '80000003', pin: '9999' },
    });
    expect(fifth.statusCode).toBe(429);

    const lockedCorrect = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '80000003', pin: '3333' },
    });
    expect(lockedCorrect.statusCode).toBe(429);

    nowMs += 5 * 60 * 1000 + 1;

    const unlockedCorrect = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '80000003', pin: '3333' },
    });
    expect(unlockedCorrect.statusCode).toBe(200);
  });

  it('stores PINs only as bcrypt hashes and never returns or logs the PIN', async () => {
    const logs: string[] = [];
    const { db, close } = createTestDb();
    const app = createApiApp({
      db,
      logger: {
        level: 'info',
        stream: { write: (line: string) => logs.push(line) },
      },
    });
    cleanup.push(close);

    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { name: 'Private PIN', phone: '80000004', pin: '4321' },
    });
    expect(signup.statusCode).toBe(200);
    expect(signup.body).not.toContain('4321');
    expect(signup.body).not.toContain('pin');

    const row = db.select({ pinHash: schema.patients.pinHash })
      .from(schema.patients)
      .where(eq(schema.patients.phone, '80000004'))
      .get();

    expect(row).toBeDefined();
    expect(row?.pinHash).not.toBe('4321');
    expect(row?.pinHash.startsWith('$2')).toBe(true);
    await expect(bcryptjs.compare('4321', row!.pinHash)).resolves.toBe(true);

    const cookie = cookieFrom(signup);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.body).not.toContain('4321');
    expect(me.body).not.toContain('pin');

    await app.close();
    expect(logs.join('\n')).not.toContain('4321');
  });

  it('logs in the seeded demo patient', async () => {
    const { db, close } = createTestDb();
    await seedDemoPatient(db);
    const app = createApiApp({ db, logger: false });
    cleanup.push(close, () => app.close());

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '81234567', pin: '1234' },
    });

    expect(login.statusCode).toBe(200);
    const me = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieFrom(login) },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ name: 'Mdm Tan', is_demo: true });
  });
});
