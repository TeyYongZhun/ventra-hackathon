import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient } from '../src/db/seed.js';
import type { AdpAskInput } from '../src/services/adp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 9:41 AM Singapore on the demo day; 12:30 PM is lunch time.
const DEMO_NOW = Date.parse('2026-10-07T01:41:00.000Z');
const LUNCH = Date.parse('2026-10-07T04:30:00.000Z');

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

describe('Day 4: meals, onboarding, report, Ask AI numbers', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()?.();
  });

  async function setup() {
    let nowMs = DEMO_NOW;
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    await seedDemoPatient(db);
    const adp = { ask: vi.fn(async (_input: AdpAskInput) => 'You can drink 650 ml more today.') };
    const app = createApiApp({ db, logger: false, now: () => nowMs, adp });
    cleanup.push(() => sqlite.close(), () => app.close());

    const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, cookie: string, payload?: object) =>
      app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

    async function login() {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone: '81234567', pin: '1234' } });
      return cookieFrom(response);
    }

    async function signup(phone = '80000401') {
      const response = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { name: 'Mr Lee', phone, pin: '2468' } });
      expect(response.statusCode).toBe(200);
      return cookieFrom(response);
    }

    return { db, adp, call, login, signup, setNow: (ms: number) => { nowMs = ms; } };
  }

  describe('meals', () => {
    it("logs a food from the list, adds its salt to today's metrics, and undoes it", async () => {
      const { call, login, setNow } = await setup();
      const cookie = await login();
      setNow(LUNCH);

      const added = await call('POST', '/api/meals', cookie, { foodId: 'chicken-rice' });
      expect(added.statusCode).toBe(200);
      expect(added.json()).toMatchObject({ meal: 'Lunch', what: 'Chicken rice', sodiumMg: 1300, time: '12:30 PM' });
      expect((await call('GET', '/api/metrics', cookie)).json().sodiumToday).toBe(2900);

      const list = (await call('GET', '/api/meals', cookie)).json().entries;
      expect(list.map((meal: { what: string }) => meal.what)).toEqual(['Chicken rice', 'Fish soup with noodles', 'Oat porridge with banana']);

      const undo = await call('DELETE', '/api/meals/last', cookie);
      expect(undo.json()).toEqual({ ok: true, deletedId: added.json().id });
      expect((await call('GET', '/api/metrics', cookie)).json().sodiumToday).toBe(1600);
    });

    it('rejects an unknown food and has nothing to undo for a new patient', async () => {
      const { call, signup } = await setup();
      const cookie = await signup();
      expect((await call('POST', '/api/meals', cookie, { foodId: 'pizza' })).statusCode).toBe(404);
      expect((await call('DELETE', '/api/meals/last', cookie)).statusCode).toBe(404);
    });
  });

  describe('sign-up and set-up', () => {
    it('starts a new patient empty, then sets text size, targets, cap, medicines and contact', async () => {
      const { call, signup } = await setup();
      const cookie = await signup();

      expect((await call('GET', '/api/me', cookie)).json()).toEqual({ name: 'Mr Lee', is_demo: false, text_size: null, set_up: false });
      const empty = (await call('GET', '/api/metrics', cookie)).json();
      expect(empty).toMatchObject({ fluidToday: 0, sodiumToday: 0, weightToday: null, pillsToday: { total: 0 } });

      expect((await call('PUT', '/api/onboarding/profile', cookie, { textSize: 'xl', age: 68 })).statusCode).toBe(200);
      expect((await call('PUT', '/api/onboarding/targets', cookie, {
        dryKg: 70, alertGainKg: 2, alertDays: 3, fluidMl: 1200, sodiumMg: 2000,
      })).statusCode).toBe(200);
      expect((await call('PUT', '/api/onboarding/cap', cookie, { capMl: 200 })).statusCode).toBe(200);
      expect((await call('PUT', '/api/onboarding/medications', cookie, {
        meds: [{ id: 'furo', times: [480] }, { id: 'dapa', times: [480] }],
      })).statusCode).toBe(200);
      expect((await call('PUT', '/api/onboarding/contact', cookie, { name: 'Lee Wei', relation: 'son' })).statusCode).toBe(200);

      expect((await call('GET', '/api/me', cookie)).json()).toEqual({ name: 'Mr Lee', is_demo: false, text_size: 'xl', set_up: true });
      const metrics = (await call('GET', '/api/metrics', cookie)).json();
      expect(metrics.targets).toMatchObject({ fluidMl: 1200, capMl: 200, dryKg: 70 });
      expect(metrics.pillsToday.total).toBe(2);
      expect(metrics.patient).toMatchObject({ name: 'Mr Lee', age: 68, family: { name: 'Lee Wei', relation: 'son' } });
    });

    it('validates set-up input', async () => {
      const { call, signup } = await setup();
      const cookie = await signup();
      expect((await call('PUT', '/api/onboarding/targets', cookie, { dryKg: 70, alertGainKg: 2, alertDays: 3, fluidMl: 50, sodiumMg: 2000 })).statusCode).toBe(400);
      expect((await call('PUT', '/api/onboarding/cap', cookie, { capMl: 150 })).statusCode).toBe(409);
      expect((await call('PUT', '/api/onboarding/medications', cookie, { meds: [{ id: 'aspirin-xyz', times: [480] }] })).statusCode).toBe(404);
      expect((await call('PUT', '/api/onboarding/profile', cookie, { textSize: 'huge' })).statusCode).toBe(400);
    });
  });

  describe('Ask AI uses the patient own numbers', () => {
    it('sends drinks, salt and weight with the question — never medicines or identity', async () => {
      const { adp, call, login } = await setup();
      const cookie = await login();

      await call('POST', '/api/ask', cookie, { question: 'How much can I drink today?' });

      const sent = adp.ask.mock.calls[0][0].question;
      expect(sent).toContain('Drunk so far today: 850 ml. Left today: 650 ml.');
      expect(sent).toContain('Salt (sodium) limit: 2,000 mg a day.');
      expect(sent).toContain('Question: How much can I drink today?');
      expect(sent).not.toMatch(/furosemide|bisoprolol|water pill|Mdm Tan|81234567/i);
    });

    it('uses a new patient own limit', async () => {
      const { adp, call, signup } = await setup();
      const cookie = await signup();
      await call('PUT', '/api/onboarding/targets', cookie, { dryKg: 70, alertGainKg: 2, alertDays: 3, fluidMl: 1200, sodiumMg: 2000 });

      await call('POST', '/api/ask', cookie, { question: 'How much can I drink today?' });

      expect(adp.ask.mock.calls[0][0].question).toContain('1,200 ml a day');
    });

    it('logs only the question, not the numbers', async () => {
      const { db, call, login } = await setup();
      const cookie = await login();
      await call('POST', '/api/ask', cookie, { question: 'How much can I drink today?' });
      const rows = db.select().from(schema.chatMessages).all();
      expect(rows[0]?.content).toBe('How much can I drink today?');
    });
  });

  describe('report', () => {
    it('matches the numbers on Home and Medicine', async () => {
      const { call, login } = await setup();
      const cookie = await login();
      const report = (await call('GET', '/api/report', cookie)).json();
      const metrics = (await call('GET', '/api/metrics', cookie)).json();

      expect(report.adherence).toEqual(metrics.adherence);
      expect(report.sodiumToday).toBe(metrics.sodiumToday);
      expect(report.weightToday).toBe(metrics.weightToday);
      expect(report.days).toHaveLength(7);
      expect(report.days.find((day: { date: string }) => day.date === '2026-10-03')).toMatchObject({ zone: 'yellow', fluidOver: true });
      expect(report.summary[2]).toBe('Medicines: 32 of 34 doses taken (94%). Missed furosemide on 3 and 6 Oct (patient: going out).');
    });
  });
});
