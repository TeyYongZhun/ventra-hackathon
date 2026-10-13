import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import type { VisionClient } from '../src/services/vision.js';
import {
  addDoseQuestion,
  cleanQuestion,
  MAX_VISIT_QUESTIONS,
  parseReview,
  polishQuestion,
  reviewAskQuestion,
  reviewPrompt,
} from '../src/services/visitQuestions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOW = Date.parse('2026-10-07T01:41:00.000Z');

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

// TokenHub's verdict, wrapped in a code fence like the real model does.
const verdict = (needsDoctor: boolean, question = '', alreadyListed = false) =>
  `\`\`\`json\n${JSON.stringify({ needsDoctor, alreadyListed, question })}\n\`\`\``;

function fakeVision(reply: string | (() => Promise<string>)): VisionClient & { completeText: ReturnType<typeof vi.fn> } {
  return {
    describeMeal: vi.fn(async () => ''),
    completeText: vi.fn(async () => (typeof reply === 'string' ? reply : reply())),
  };
}

describe('visit questions from Ask AI', () => {
  const cleanup: Array<() => Promise<void> | void> = [];
  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()?.();
  });

  function setupDb() {
    const { db, close } = createTestDb();
    cleanup.push(close);
    const patient = db.insert(schema.patients).values({ phone: '90000001', pinHash: 'x', name: 'Mr Lee', age: 68, condition: 'Heart failure' }).returning().get();
    const list = () => db.select().from(schema.visitQuestions).all().map((row) => row.question);
    return { db, patientId: patient.id, list };
  }

  it('adds the question when the AI says it needs the doctor, and only then', async () => {
    const { db, patientId, list } = setupDb();
    const vision = fakeVision(verdict(true, 'Why are my ankles swollen in the evening?'));
    const note = await reviewAskQuestion({ db, vision, patientId, asked: 'why my ankles swell at night', nowMs: NOW });
    expect(note).toEqual({ status: 'added', question: 'Why are my ankles swollen in the evening?' });
    expect(list()).toEqual(['Why are my ankles swollen in the evening?']);
    // Only the question text goes to the AI.
    expect(vision.completeText.mock.calls[0][0]).toContain('"why my ankles swell at night"');
    expect(vision.completeText.mock.calls[0][0]).not.toContain('Mr Lee');

    expect(await reviewAskQuestion({ db, vision: fakeVision(verdict(false)), patientId, asked: 'what is heart failure', nowMs: NOW })).toBeNull();
    expect(list()).toHaveLength(1);
  });

  it('says when the question is already on the list, without adding a copy', async () => {
    const { db, patientId, list } = setupDb();
    await reviewAskQuestion({ db, vision: fakeVision(verdict(true, 'Why are my ankles swollen?')), patientId, asked: 'my ankles are swollen', nowMs: NOW });

    const again = fakeVision(verdict(true, 'Is it bad that my ankles swell?', true));
    expect(await reviewAskQuestion({ db, vision: again, patientId, asked: 'ankles swollen again', nowMs: NOW }))
      .toEqual({ status: 'already', question: 'Is it bad that my ankles swell?' });
    expect(again.completeText.mock.calls[0][0]).toContain('1. Why are my ankles swollen?');
    // Same words as one on the list: also "already".
    expect(await reviewAskQuestion({ db, vision: fakeVision(verdict(true, 'why are my ankles swollen?')), patientId, asked: 'ankles?', nowMs: NOW }))
      .toEqual({ status: 'already', question: 'Why are my ankles swollen?' });
    expect(list()).toEqual(['Why are my ankles swollen?']);
  });

  it('adds dose questions at once in their own words, then lets the AI tidy them', async () => {
    const { db, patientId, list } = setupDb();
    const dose = addDoseQuestion(db, patientId, 'should i skip my water pill tomorrow', NOW);
    expect(dose?.note).toEqual({ status: 'added', question: 'Should i skip my water pill tomorrow?' });
    expect(list()).toEqual(['Should i skip my water pill tomorrow?']);
    expect(addDoseQuestion(db, patientId, 'Should I skip my water pill tomorrow?', NOW)?.note.status).toBe('already');

    const better = await polishQuestion({ db, vision: fakeVision(verdict(true, 'Can I skip my water pill on days I go out?')), patientId, id: dose!.id!, asked: 'should i skip my water pill tomorrow' });
    expect(better).toBe('Can I skip my water pill on days I go out?');
    expect(list()).toEqual(['Can I skip my water pill on days I go out?']);

    // An unusable rewrite keeps their words.
    const other = addDoseQuestion(db, patientId, 'can i double my heart pill', NOW)!;
    expect(await polishQuestion({ db, vision: fakeVision(verdict(true, 'Double it. Is that fine?')), patientId, id: other.id!, asked: 'can i double my heart pill' })).toBeNull();
    expect(list()).toContain('Can i double my heart pill?');
  });

  it(`keeps the newest ${MAX_VISIT_QUESTIONS}`, async () => {
    const { db, patientId, list } = setupDb();
    for (let i = 1; i <= MAX_VISIT_QUESTIONS + 2; i++) {
      await reviewAskQuestion({ db, vision: fakeVision(verdict(true, `Is question number ${i} a problem?`)), patientId, asked: `q${i}`, nowMs: NOW });
    }
    expect(list()).toHaveLength(MAX_VISIT_QUESTIONS);
    expect(list()).not.toContain('Is question number 1 a problem?');
  });

  it('only accepts a single plain question', () => {
    expect(cleanQuestion('should I weigh myself every day?')).toBe('Should I weigh myself every day?');
    expect(cleanQuestion('Take two water pills. Is that okay?')).toBeNull();
    expect(cleanQuestion('Stop your spironolactone today')).toBeNull();
    expect(cleanQuestion('Is this www.example.com advice right?')).toBeNull();
    // Asking the doctor about a dose is the point.
    expect(cleanQuestion('Should I take an extra water pill when my weight goes up?')).toBe('Should I take an extra water pill when my weight goes up?');
    expect(parseReview('not json')).toBeNull();
    expect(parseReview(verdict(true, 'No question mark'))).toEqual({ needsDoctor: true, alreadyListed: false, question: null });
    expect(reviewPrompt('say "hi"', [])).toContain('"say \'hi\'"');
  });

  describe('through Ask AI', () => {
    async function setupApp(vision?: VisionClient, adpDelayMs = 0) {
      const { db, close } = createTestDb();
      const adp = { ask: vi.fn(async () => { await new Promise((r) => setTimeout(r, adpDelayMs)); return 'Swollen ankles can mean extra fluid. Weigh yourself and tell your nurse.'; }) };
      const app = createApiApp({ db, logger: false, now: () => NOW, adp, vision });
      cleanup.push(close, () => app.close());
      async function signup(phone: string) {
        const response = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { name: 'Mr Lee', phone, pin: '1234' } });
        return cookieFrom(response);
      }
      const call = (method: 'GET' | 'POST' | 'DELETE', url: string, cookie: string, payload?: object) =>
        app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
      return { signup, call };
    }

    it('says in the reply when a dose question goes on the visit list', async () => {
      const vision = fakeVision(verdict(true, 'Can I skip my water pill on days I go out?'));
      const { signup, call } = await setupApp(vision);
      const cookie = await signup('90000011');

      const reply = (await call('POST', '/api/ask', cookie, { question: 'can i skip my water pill tomorrow' })).json();
      expect(reply).toMatchObject({ kind: 'dose', visitQuestion: { status: 'added', question: 'Can i skip my water pill tomorrow?' } });
      // Tidied by the AI just after.
      await vi.waitFor(async () => {
        expect((await call('GET', '/api/visit-questions', cookie)).json().questions[0].question).toBe('Can I skip my water pill on days I go out?');
      });

      const again = (await call('POST', '/api/ask', cookie, { question: 'Can I skip my water pill on days I go out?' })).json();
      expect(again.visitQuestion).toMatchObject({ status: 'already' });
    });

    it('says it under the answer when the doctor check finishes in time', async () => {
      const vision = fakeVision(verdict(true, 'Why are my ankles swollen?'));
      const { signup, call } = await setupApp(vision);
      const cookie = await signup('90000012');
      const reply = (await call('POST', '/api/ask', cookie, { question: 'my ankles are swollen, why?' })).json();
      expect(reply).toMatchObject({ kind: 'answer', reply: expect.stringContaining('Swollen ankles'), visitQuestion: { status: 'added', question: 'Why are my ankles swollen?' } });

      // A general question: no note.
      const general = fakeVision(verdict(false));
      const plain = await setupApp(general);
      const other = await plain.signup('90000013');
      expect((await plain.call('POST', '/api/ask', other, { question: 'what foods are low in salt' })).json().visitQuestion).toBeNull();
    });

    it("doesn't hold the answer for a slow check, but still adds the question", async () => {
      const slow = fakeVision(() => new Promise((resolve) => setTimeout(() => resolve(verdict(true, 'Why am I so tired?')), 5_000)));
      const { signup, call } = await setupApp(slow);
      const cookie = await signup('90000014');
      const started = Date.now();
      const reply = (await call('POST', '/api/ask', cookie, { question: 'why am i so tired' })).json();
      expect(Date.now() - started).toBeLessThan(4_800);
      expect(reply).toMatchObject({ kind: 'answer', visitQuestion: null });
      await vi.waitFor(async () => {
        expect((await call('GET', '/api/visit-questions', cookie)).json().questions).toHaveLength(1);
      }, { timeout: 3_000 });
    }, 15_000);

    it('lists and removes questions, only for their patient', async () => {
      const { signup, call } = await setupApp();
      const cookie = await signup('90000015');
      // No TokenHub: dose questions are still added in their own words.
      expect((await call('POST', '/api/ask', cookie, { question: 'can i double my heart pill' })).json().visitQuestion).toMatchObject({ status: 'added' });
      const [saved] = (await call('GET', '/api/visit-questions', cookie)).json().questions;
      expect(saved).toMatchObject({ question: 'Can i double my heart pill?', asked: 'can i double my heart pill' });

      const other = await signup('90000016');
      expect((await call('GET', '/api/visit-questions', other)).json().questions).toEqual([]);
      expect((await call('DELETE', `/api/visit-questions/${saved.id}`, other)).statusCode).toBe(404);
      expect((await call('DELETE', `/api/visit-questions/${saved.id}`, cookie)).json()).toEqual({ ok: true, deletedId: saved.id });
    });

    it('leaves emergencies out: those go to SOS now, not to a visit', async () => {
      const vision = fakeVision(verdict(true, 'Why did I have chest pain?'));
      const { signup, call } = await setupApp(vision);
      const cookie = await signup('90000017');
      const reply = (await call('POST', '/api/ask', cookie, { question: 'I have chest pain and cannot breathe' })).json();
      expect(reply).toMatchObject({ kind: 'emergency', visitQuestion: null });
      expect(vision.completeText).not.toHaveBeenCalled();
    });
  });
});
