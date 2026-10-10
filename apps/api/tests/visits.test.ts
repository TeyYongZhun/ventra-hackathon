import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient } from '../src/db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 9:41 AM in Singapore on the demo day (2026-10-07).
const DEMO_NOW = Date.parse('2026-10-07T01:41:00.000Z');

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

describe('visits', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()?.();
  });

  async function setup() {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    await seedDemoPatient(db);
    const app = createApiApp({ db, logger: false, now: () => DEMO_NOW });
    cleanup.push(() => sqlite.close(), () => app.close());

    async function login(phone = '81234567', pin = '1234') {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone, pin } });
      return cookieFrom(response);
    }
    async function signup(phone: string) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { name: 'Real', phone, pin: '1234' } });
      return cookieFrom(response);
    }
    function call(method: 'GET' | 'POST' | 'DELETE', url: string, cookie: string, payload?: object) {
      return app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
    }
    return { login, signup, call };
  }

  it("lists the demo patient's upcoming visits, soonest first", async () => {
    const { login, call } = await setup();
    const body = (await call('GET', '/api/visits', await login())).json();
    expect(body.today).toBe('2026-10-07');
    expect(body.visits).toEqual([
      { id: expect.any(Number), date: '2026-10-13', time: '10:30 AM', title: 'Heart clinic', doctor: 'Dr Lim', place: 'Level 3, Room 12', bring: 'Medicine list · this phone · IC card' },
      { id: expect.any(Number), date: '2026-10-27', time: '9:00 AM', title: 'Blood test', doctor: null, place: 'Polyclinic lab', bring: null },
    ]);
  });

  it('adds a visit in date and time order, and removes it', async () => {
    const { login, call } = await setup();
    const cookie = await login();
    const added = await call('POST', '/api/visits', cookie, { date: '2026-10-13', time: '9:00 AM', title: 'Eye check', place: 'Level 2', doctor: '', bring: '' });
    expect(added.statusCode).toBe(200);
    expect(added.json()).toMatchObject({ title: 'Eye check', doctor: null, bring: null });

    const titles = (await call('GET', '/api/visits', cookie)).json().visits.map((visit: { title: string }) => visit.title);
    expect(titles).toEqual(['Eye check', 'Heart clinic', 'Blood test']);

    expect((await call('DELETE', `/api/visits/${added.json().id}`, cookie)).json()).toEqual({ ok: true, deletedId: added.json().id });
    expect((await call('GET', '/api/visits', cookie)).json().visits).toHaveLength(2);
  });

  it('rejects bad input and past dates', async () => {
    const { login, call } = await setup();
    const cookie = await login();
    expect((await call('POST', '/api/visits', cookie, { date: '2026-10-13', time: '10:30', title: 'Clinic' })).statusCode).toBe(400);
    expect((await call('POST', '/api/visits', cookie, { date: '2026-10-13', time: '10:30 AM', title: '' })).statusCode).toBe(400);
    expect((await call('POST', '/api/visits', cookie, { date: '2026-10-01', time: '10:30 AM', title: 'Clinic' })).statusCode).toBe(400);
  });

  it("keeps each patient's visits to themselves", async () => {
    const { login, signup, call } = await setup();
    const demoVisit = (await call('GET', '/api/visits', await login())).json().visits[0];
    const other = await signup('80000401');

    expect((await call('GET', '/api/visits', other)).json().visits).toEqual([]);
    expect((await call('DELETE', `/api/visits/${demoVisit.id}`, other)).statusCode).toBe(404);
    expect((await call('GET', '/api/visits', await login())).json().visits).toHaveLength(2);
  });
});
