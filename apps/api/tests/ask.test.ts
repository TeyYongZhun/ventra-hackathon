import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { asc } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SAFE_REPLIES } from '@ventra/core';
import { createApiApp, type CreateApiAppOptions } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { AdpError, type AdpAskInput } from '../src/services/adp.js';
import { ASK_LIMIT_PER_MINUTE } from '../src/routes/ask.js';

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

function mockAdp(answer: string | (() => Promise<string>) = 'Bisoprolol helps your heart beat slower and more steadily.') {
  return {
    ask: vi.fn(async (_input: AdpAskInput) => (typeof answer === 'string' ? answer : answer())),
  };
}

describe('POST /api/ask', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) {
      await cleanup.pop()?.();
    }
  });

  async function setup(options: Partial<CreateApiAppOptions> = {}) {
    const { db, close } = createTestDb();
    const app = createApiApp({ db, logger: false, ...options });
    cleanup.push(close, () => app.close());

    async function signup(phone: string, name = `Patient ${phone}`) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { name, phone, pin: '1234' },
      });
      expect(response.statusCode).toBe(200);
      return { cookie: cookieFrom(response), patientId: response.json().patientId as number };
    }

    function ask(cookie: string | undefined, payload: unknown) {
      return app.inject({
        method: 'POST',
        url: '/api/ask',
        headers: cookie ? { cookie } : {},
        payload: payload as Record<string, unknown>,
      });
    }

    return { app, db, signup, ask };
  }

  it('requires a session and never calls ADP without one', async () => {
    const adp = mockAdp();
    const { ask } = await setup({ adp });

    const response = await ask(undefined, { question: 'What is bisoprolol for?' });

    expect(response.statusCode).toBe(401);
    expect(adp.ask).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ question: '' }],
    [{ question: '   ' }],
    [{ question: 42 }],
    [{ question: 'a'.repeat(2001) }],
  ])('rejects an invalid body %j', async (payload) => {
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp });
    const { cookie } = await signup('80000101');

    const response = await ask(cookie, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(adp.ask).not.toHaveBeenCalled();
  });

  it('answers emergencies with the 995 line without calling ADP', async () => {
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp });
    const { cookie } = await signup('80000102');

    const response = await ask(cookie, { question: "I can't breathe" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ reply: 'Please call 995 now.', kind: 'emergency' });
    expect(adp.ask).not.toHaveBeenCalled();
  });

  it('refuses dose questions without calling ADP', async () => {
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp });
    const { cookie } = await signup('80000103');

    const response = await ask(cookie, { question: 'Can I skip my water pill?' });

    expect(response.json()).toMatchObject({ reply: SAFE_REPLIES.dose, kind: 'dose' });
    expect(adp.ask).not.toHaveBeenCalled();
  });

  it('returns a checked ADP answer and sends only the question and pseudonyms', async () => {
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp });
    const { cookie, patientId } = await signup('81239999', 'Mdm Lim');

    const response = await ask(cookie, { question: '  What is bisoprolol for?  ' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      reply: 'Bisoprolol helps your heart beat slower and more steadily.',
      kind: 'answer',
    });
    expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);

    const sent = adp.ask.mock.calls[0][0];
    expect(sent.question).toBe('What is bisoprolol for?');
    expect(sent.requestId).toBe(body.request_id);
    const ids = `${sent.visitorId} ${sent.sessionId}`;
    expect(ids).not.toContain('81239999');
    expect(ids).not.toContain('Lim');
    expect(sent.visitorId).not.toBe(String(patientId));
    expect(sent.visitorId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('gives each patient a different, stable visitor id', async () => {
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp });
    const a = await signup('80000104');
    const b = await signup('80000105');

    await ask(a.cookie, { question: 'What is heart failure?' });
    await ask(a.cookie, { question: 'Why weigh every morning?' });
    await ask(b.cookie, { question: 'What is heart failure?' });

    const [first, second, other] = adp.ask.mock.calls.map(([input]) => input.visitorId);
    expect(first).toBe(second);
    expect(first).not.toBe(other);
  });

  it.each([
    ['dose advice', 'You can skip your water pill today.'],
    ['source leakage', 'The guidelines state that you should weigh daily.'],
    ['over-long answer', 'Water helps. '.repeat(100)],
  ])('replaces %s from the AI with the unsure line', async (_label, answer) => {
    const { signup, ask } = await setup({ adp: mockAdp(answer) });
    const { cookie } = await signup('80000106');

    const response = await ask(cookie, { question: 'Tell me about my water pill' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ reply: SAFE_REPLIES.unsure, kind: 'unsure' });
  });

  it.each([
    ['timeout', new AdpError('timeout', 'slow')],
    ['unexpected error', new Error('boom')],
  ])('falls back to the unsure line on ADP %s', async (_label, error) => {
    const { signup, ask } = await setup({ adp: mockAdp(() => Promise.reject(error)) });
    const { cookie } = await signup('80000107');

    const response = await ask(cookie, { question: 'What is heart failure?' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ reply: SAFE_REPLIES.unsure, kind: 'unsure' });
  });

  it('still gives fixed safety replies when ADP is not configured', async () => {
    const { signup, ask } = await setup();
    const { cookie } = await signup('80000108');

    const normal = await ask(cookie, { question: 'What is heart failure?' });
    const emergency = await ask(cookie, { question: 'I have chest pain' });

    expect(normal.json()).toMatchObject({ reply: SAFE_REPLIES.unsure, kind: 'unsure' });
    expect(emergency.json()).toMatchObject({ reply: SAFE_REPLIES.emergency, kind: 'emergency' });
  });

  it(`limits ADP calls to ${ASK_LIMIT_PER_MINUTE} per minute but never blocks safety replies`, async () => {
    let nowMs = Date.parse('2026-10-10T02:00:00.000Z');
    const adp = mockAdp();
    const { signup, ask } = await setup({ adp, now: () => nowMs });
    const a = await signup('80000109');
    const b = await signup('80000110');

    for (let i = 0; i < ASK_LIMIT_PER_MINUTE; i += 1) {
      const response = await ask(i % 2 ? a.cookie : b.cookie, { question: 'What is heart failure?' });
      expect(response.statusCode).toBe(200);
      nowMs += 1000;
    }

    const limited = await ask(a.cookie, { question: 'What is heart failure?' });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(adp.ask).toHaveBeenCalledTimes(ASK_LIMIT_PER_MINUTE);

    const emergency = await ask(a.cookie, { question: "I can't breathe" });
    expect(emergency.json()).toMatchObject({ kind: 'emergency' });
    const dose = await ask(a.cookie, { question: 'Can I double my dose?' });
    expect(dose.json()).toMatchObject({ kind: 'dose' });

    nowMs += 60 * 1000;
    const later = await ask(a.cookie, { question: 'What is heart failure?' });
    expect(later.statusCode).toBe(200);
    expect(later.json()).toMatchObject({ kind: 'answer' });
  });

  it('logs both messages for the session patient only, with request id and latency', async () => {
    const { db, signup, ask } = await setup({ adp: mockAdp() });
    const a = await signup('80000111');
    await signup('80000112');

    const response = await ask(a.cookie, { question: 'What is bisoprolol for?', patient_id: 999 });
    const requestId = response.json().request_id;

    const rows = db.select().from(schema.chatMessages).orderBy(asc(schema.chatMessages.id)).all();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.patientId === a.patientId)).toBe(true);
    expect(rows[0]).toMatchObject({ role: 'user', content: 'What is bisoprolol for?', requestId });
    expect(rows[1]).toMatchObject({ role: 'assistant', requestId });
    expect(rows[1].content).toBe('Bisoprolol helps your heart beat slower and more steadily.');
    expect(rows[1].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('keeps question text out of the server logs', async () => {
    const logs: string[] = [];
    const { db, close } = createTestDb();
    const app = createApiApp({
      db,
      adp: mockAdp(),
      logger: { level: 'info', stream: { write: (line: string) => logs.push(line) } },
    });
    cleanup.push(close);

    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { name: 'Log Test', phone: '80000113', pin: '1234' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/ask',
      headers: { cookie: cookieFrom(signup) },
      payload: { question: 'Why are my ankles swollen lately?' },
    });
    await app.close();

    const output = logs.join('\n');
    expect(output).toContain('ask answered');
    expect(output).not.toContain('ankles swollen');
  });
});
