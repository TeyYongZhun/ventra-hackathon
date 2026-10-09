import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { and, eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { IsoDate } from '@ventra/core';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient } from '../src/db/seed.js';
import { sgClock, sgDate, sgMinutes } from '../src/time.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 9:41 AM in Singapore on the demo day.
const DEMO_NOW = Date.parse('2026-10-07T01:41:00.000Z');
const HOUR = 60 * 60 * 1000;

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

describe('Singapore time helpers', () => {
  it('uses the Singapore date even when UTC is still on the previous day', () => {
    const justAfterMidnight = Date.parse('2026-10-06T16:30:00.000Z');
    expect(sgDate(justAfterMidnight)).toBe('2026-10-07');
    expect(sgMinutes(justAfterMidnight)).toBe(30);
    expect(sgClock(justAfterMidnight)).toBe('12:30 AM');
    expect(sgClock(DEMO_NOW)).toBe('9:41 AM');
  });
});

describe('metrics and logging endpoints', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) {
      await cleanup.pop()?.();
    }
  });

  async function setup(options: { start?: number; seedToday?: IsoDate } = {}) {
    let nowMs = options.start ?? DEMO_NOW;
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    const demoId = await seedDemoPatient(db, options.seedToday);
    const app = createApiApp({ db, logger: false, now: () => nowMs });
    cleanup.push(() => sqlite.close(), () => app.close());

    async function login(phone = '81234567', pin = '1234') {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone, pin } });
      expect(response.statusCode).toBe(200);
      return cookieFrom(response);
    }

    async function signup(phone: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { name: `Patient ${phone}`, phone, pin: '1234' },
      });
      expect(response.statusCode).toBe(200);
      return cookieFrom(response);
    }

    function call(method: 'GET' | 'POST' | 'DELETE', url: string, cookie: string, payload?: object) {
      return app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
    }

    async function metrics(cookie: string, query = '') {
      const response = await call('GET', `/api/metrics${query}`, cookie);
      expect(response.statusCode).toBe(200);
      return response.json();
    }

    return {
      db,
      demoId,
      login,
      signup,
      call,
      metrics,
      setNow: (ms: number) => { nowMs = ms; },
    };
  }

  describe('GET /api/metrics', () => {
    it('requires a session', async () => {
      const { db } = await setup();
      const app = createApiApp({ db, logger: false });
      cleanup.push(() => app.close());
      const response = await app.inject({ method: 'GET', url: '/api/metrics' });
      expect(response.statusCode).toBe(401);
    });

    it('returns the documented numbers for Mdm Tan at 9:41 AM on the demo day', async () => {
      const { login, metrics } = await setup();
      const body = await metrics(await login());

      expect(body).toMatchObject({
        today: '2026-10-07',
        targets: { fluidMl: 1500, capMl: 150 },
        adherence: { due: 34, taken: 32, text: '32 of 34' },
        pillsToday: { total: 5, taken: 4, nextTime: '8 PM' },
        weightChange: 0.2,
        vsDry: 0.4,
        weighStreak: 11,
        fluidToday: 850,
        fluidOk: true,
        sodiumToday: 1600,
        zone: 'green',
        goodDays: 4,
        goodStreak: 0,
        alertsToday: [],
      });
    });

    it('gives the same numbers when the seed is shifted to another day', async () => {
      const start = Date.parse('2026-11-03T01:41:00.000Z');
      const { login, metrics } = await setup({ start, seedToday: '2026-11-03' });
      const body = await metrics(await login());

      expect(body).toMatchObject({
        today: '2026-11-03',
        adherence: { text: '32 of 34' },
        pillsToday: { total: 5, taken: 4 },
        fluidToday: 850,
        weighStreak: 11,
        goodDays: 4,
        zone: 'green',
      });
    });

    it('shows a past day when asked for one', async () => {
      const { login, metrics } = await setup();
      const body = await metrics(await login(), '?date=2026-10-03');

      expect(body.today).toBe('2026-10-03');
      expect(body.zone).toBe('yellow');
      expect(body.fluidToday).toBe(1750);
      expect(body.alertsToday).toHaveLength(1);
    });

    it.each(['?date=2026-13-40', '?date=yesterday', '?date=2026-02-30'])('rejects %s', async (query) => {
      const { login, call } = await setup();
      const response = await call('GET', `/api/metrics${query}`, await login());
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('fluid', () => {
    it('adds a drink to today and undo takes it away again', async () => {
      const { login, call, metrics } = await setup();
      const cookie = await login();

      const added = await call('POST', '/api/fluid', cookie, { what: 'Water', ml: 150 });
      expect(added.statusCode).toBe(200);
      expect(added.json()).toMatchObject({ date: '2026-10-07', time: '9:41 AM', what: 'Water', ml: 150 });
      expect((await metrics(cookie)).fluidToday).toBe(1000);

      const undo = await call('DELETE', '/api/fluid/last', cookie);
      expect(undo.statusCode).toBe(200);
      expect(undo.json()).toEqual({ ok: true, deletedId: added.json().id });
      expect((await metrics(cookie)).fluidToday).toBe(850);
    });

    it('logs a drink after midnight on the new Singapore day', async () => {
      const { login, call, setNow } = await setup();
      const cookie = await login();
      setNow(Date.parse('2026-10-07T16:15:00.000Z'));

      const added = await call('POST', '/api/fluid', cookie, { what: 'Water', ml: 100 });
      expect(added.json()).toMatchObject({ date: '2026-10-08', time: '12:15 AM' });
    });

    it('will not undo a drink from a previous day', async () => {
      const { signup, call, setNow } = await setup();
      const cookie = await signup('80000201');
      await call('POST', '/api/fluid', cookie, { what: 'Tea', ml: 200 });
      setNow(DEMO_NOW + 24 * HOUR);

      const undo = await call('DELETE', '/api/fluid/last', cookie);
      expect(undo.statusCode).toBe(409);
      expect(undo.json().error.code).toBe('CONFLICT');
    });

    it('returns 404 when there is nothing to undo', async () => {
      const { signup, call } = await setup();
      const undo = await call('DELETE', '/api/fluid/last', await signup('80000202'));
      expect(undo.statusCode).toBe(404);
    });

    it.each([[{ what: 'Water', ml: 0 }], [{ what: '', ml: 100 }], [{ what: 'Water', ml: 99999 }], [{ ml: 100 }]])(
      'rejects %j',
      async (payload) => {
        const { login, call } = await setup();
        const response = await call('POST', '/api/fluid', await login(), payload);
        expect(response.statusCode).toBe(400);
      },
    );
  });

  describe('weight', () => {
    it('keeps one weight per day and replaces it when weighed again', async () => {
      const { db, demoId, login, call } = await setup();
      const cookie = await login();

      const first = await call('POST', '/api/weight', cookie, { weightKg: 58.64 });
      const second = await call('POST', '/api/weight', cookie, { weightKg: 58.6, patient_id: 999 });
      expect(first.json()).toMatchObject({ date: '2026-10-07', weightKg: 58.6 });
      expect(second.json()).toEqual({ id: first.json().id, date: '2026-10-07', weightKg: 58.6 });

      const rows = db.select().from(schema.weights)
        .where(and(eq(schema.weights.patientId, demoId), eq(schema.weights.date, '2026-10-07')))
        .all();
      expect(rows).toHaveLength(1);
    });

    it('turns yellow and records one alert when weight is up 2 kg in 3 days', async () => {
      const { db, demoId, login, call, metrics } = await setup();
      const cookie = await login();

      await call('POST', '/api/weight', cookie, { weightKg: 60.2 });
      await call('POST', '/api/weight', cookie, { weightKg: 60.3 });

      const body = await metrics(cookie);
      // Saving today's weight records when it happened (Weight tab: "Today at …").
      expect(body.weighTimeToday).toBe('9:41 AM');
      expect(body.zone).toBe('yellow');
      expect(body.reasons.map((reason: { key: string }) => reason.key)).toContain('weight');
      expect(body.alertsToday).toEqual([{ date: '2026-10-07', time: '9:41 AM', zone: 'yellow', familyTold: false }]);

      const alerts = db.select().from(schema.alerts)
        .where(and(eq(schema.alerts.patientId, demoId), eq(schema.alerts.date, '2026-10-07')))
        .all();
      expect(alerts).toHaveLength(1);
    });

    it.each([[{ weightKg: 5 }], [{ weightKg: '58' }], [{}]])('rejects %j', async (payload) => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/weight', await login(), payload);
      expect(response.statusCode).toBe(400);
    });
  });

  describe('symptoms', () => {
    it('keeps one entry per symptom per day and updates the severity', async () => {
      const { login, call, metrics } = await setup();
      const cookie = await login();

      const first = await call('POST', '/api/symptoms', cookie, { key: 'ankles', sev: 'Mild' });
      const second = await call('POST', '/api/symptoms', cookie, { key: 'ankles', sev: 'Moderate' });
      expect(second.json()).toEqual({ id: first.json().id, date: '2026-10-07', key: 'ankles', sev: 'Moderate' });
      expect((await metrics(cookie)).symptomsToday).toEqual([{ date: '2026-10-07', key: 'ankles', sev: 'Moderate' }]);
    });

    it('turns yellow for moderate breathlessness', async () => {
      const { login, call, metrics } = await setup();
      const cookie = await login();
      await call('POST', '/api/symptoms', cookie, { key: 'breath', sev: 'Moderate' });
      expect((await metrics(cookie)).zone).toBe('yellow');
    });

    it.each([[{ key: 'headache', sev: 'Mild' }], [{ key: 'ankles', sev: 'Terrible' }]])('rejects %j', async (payload) => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/symptoms', await login(), payload);
      expect(response.statusCode).toBe(400);
    });
  });

  describe('dose confirm', () => {
    it('confirms the evening pill early, then locks it', async () => {
      const { login, call, metrics } = await setup();
      const cookie = await login();
      const dose = { date: '2026-10-07', medId: 'sv', time: 1200 };

      const confirm = await call('POST', '/api/doses/confirm', cookie, dose);
      expect(confirm.statusCode).toBe(200);
      expect(confirm.json()).toEqual({ ok: true, takenAt: '9:41 AM' });
      expect((await metrics(cookie)).pillsToday).toMatchObject({ taken: 5, total: 5, next: null });

      const again = await call('POST', '/api/doses/confirm', cookie, dose);
      expect(again.statusCode).toBe(409);
      expect(again.json().error.code).toBe('CONFLICT');

      for (const method of ['DELETE', 'PUT', 'PATCH'] as const) {
        const response = await call(method as 'DELETE', '/api/doses/confirm', cookie, dose);
        expect(response.statusCode).toBe(404);
      }
    });

    it("only confirms today's doses", async () => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/doses/confirm', await login(), { date: '2026-10-06', medId: 'sv', time: 1200 });
      expect(response.statusCode).toBe(409);
    });

    it.each([
      [{ date: '2026-10-07', medId: 'nope', time: 480 }],
      [{ date: '2026-10-07', medId: 'furo', time: 1200 }],
    ])('returns 404 for a dose that is not on the schedule: %j', async (payload) => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/doses/confirm', await login(), payload);
      expect(response.statusCode).toBe(404);
    });

    it("never confirms another patient's medicine", async () => {
      const { signup, call } = await setup();
      const response = await call('POST', '/api/doses/confirm', await signup('80000203'), {
        date: '2026-10-07', medId: 'sv', time: 1200,
      });
      expect(response.statusCode).toBe(404);
    });
  });

  it('runs the demo yellow day: unconfirmed water pill + 1,750 ml + swollen ankles', async () => {
    const { db, demoId, login, call, metrics, setNow } = await setup();
    // Start of a fresh demo day with this morning's water pill not yet confirmed.
    db.delete(schema.doseEvents)
      .where(and(
        eq(schema.doseEvents.patientId, demoId),
        eq(schema.doseEvents.date, '2026-10-07'),
        eq(schema.doseEvents.medId, 'furo'),
      ))
      .run();
    const cookie = await login();

    // 9:41 AM: still inside the 2-hour grace window.
    expect((await metrics(cookie)).zone).toBe('green');

    // 10:30 AM: the pill now counts as missed; drink past the limit and log ankles.
    setNow(DEMO_NOW + 49 * 60 * 1000);
    await call('POST', '/api/fluid', cookie, { what: 'Soup', ml: 900 });
    await call('POST', '/api/symptoms', cookie, { key: 'ankles', sev: 'Mild' });

    const body = await metrics(cookie);
    expect(body.fluidToday).toBe(1750);
    expect(body.zone).toBe('yellow');
    expect(body.reasons.map((reason: { key: string }) => reason.key)).toEqual(['missed', 'fluid', 'sym']);
    expect(body.alertsToday).toHaveLength(1);
    expect(body.alertsToday[0].time).toBe('10:30 AM');
  });
});
