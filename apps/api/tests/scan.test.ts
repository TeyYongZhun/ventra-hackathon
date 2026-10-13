import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { seedDemoPatient } from '../src/db/seed.js';
import { SCANS_PER_HOUR } from '../src/routes/vision.js';
import {
  createTokenHubClient,
  DEFAULT_TOKENHUB_MODEL,
  DEFAULT_TOKENHUB_URL,
  FALLBACK_TIP,
  parseMealReply,
  plateShares,
  readTokenHubEnv,
  VISION_TIMEOUT_MS,
  VisionError,
  type VisionClient,
} from '../src/services/vision.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 9:41 AM in Singapore on the demo day (2026-10-07).
const DEMO_NOW = Date.parse('2026-10-07T01:41:00.000Z');

// Smallest thing that passes as a JPEG: the FF D8 FF start, then filler.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)]);
const PHOTO = JPEG.toString('base64');

// What glm-5.3-flash actually sends back: JSON in a ```json fence.
const CHICKEN_RICE = [
  '```json',
  JSON.stringify({
    isFood: true,
    what: 'Hainanese chicken rice',
    sodiumMg: 1450,
    kcal: 650,
    potassiumMg: 420,
    phosphorusMg: 310,
    carbs: { g: 80, what: 'Rice cooked in chicken stock' },
    protein: { g: 30, what: 'Steamed chicken' },
    fat: { g: 22, what: 'Chicken skin and rice oil' },
    plate: [0.55, 0.3, 0.15],
    fluidMl: 154,
    fluidWhat: 'Soup',
    tip: 'Ask for no chilli sauce and leave the soup.',
    confidence: 0.95,
  }),
  '```',
].join('\n');

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

function fakeVision(reply: string | (() => Promise<string>) = CHICKEN_RICE): VisionClient & { describeMeal: ReturnType<typeof vi.fn> } {
  return { describeMeal: vi.fn(async () => (typeof reply === 'string' ? reply : reply())), completeText: vi.fn(async () => '') };
}

describe('meal photo scan and medicine barcodes', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()?.();
  });

  async function setup(vision: VisionClient | null = fakeVision()) {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    await seedDemoPatient(db);
    const app = createApiApp({ db, logger: false, now: () => DEMO_NOW, vision: vision ?? undefined });
    cleanup.push(() => sqlite.close(), () => app.close());

    async function login() {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone: '81234567', pin: '1234' } });
      return cookieFrom(response);
    }
    async function signup(phone: string) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { name: 'Real', phone, pin: '1234' } });
      return cookieFrom(response);
    }
    function call(method: 'GET' | 'POST' | 'DELETE', url: string, cookie?: string, payload?: object) {
      return app.inject({ method, url, headers: cookie ? { cookie } : {}, ...(payload ? { payload } : {}) });
    }
    return { db, login, signup, call };
  }

  it('needs a session', async () => {
    const { call } = await setup();
    expect((await call('POST', '/api/vision/meal', undefined, { photo: PHOTO })).statusCode).toBe(401);
    expect((await call('GET', '/api/medicines/barcode/2000000000022')).statusCode).toBe(401);
  });

  it('reports whether photo checking is set up', async () => {
    const on = await setup();
    expect((await on.call('GET', '/api/vision/status', await on.login())).json()).toEqual({ meal: true });
    const off = await setup(null);
    const cookie = await off.login();
    expect((await off.call('GET', '/api/vision/status', cookie)).json()).toEqual({ meal: false });
    const scan = await off.call('POST', '/api/vision/meal', cookie, { photo: PHOTO });
    expect(scan.statusCode).toBe(503);
    expect(scan.json().error.code).toBe('NOT_CONFIGURED');
  });

  it('checks a photo, then logs the stored estimate with its photo', async () => {
    const vision = fakeVision();
    const { call, login } = await setup(vision);
    const cookie = await login();

    const scan = await call('POST', '/api/vision/meal', cookie, { photo: `data:image/jpeg;base64,${PHOTO}` });
    expect(scan.statusCode).toBe(200);
    expect(vision.describeMeal).toHaveBeenCalledWith(JPEG, {});
    const body = scan.json();
    expect(body).toMatchObject({
      found: true,
      sure: true,
      scanId: expect.any(Number),
      estimate: {
        what: 'Hainanese chicken rice',
        sodiumMg: 1450,
        kcal: 650,
        plate: [0.625, 0.25, 0.125],
        tip: 'Ask for no chilli sauce and leave the soup.',
      },
    });

    // Nothing is logged until the patient says yes.
    const before = (await call('GET', '/api/meals', cookie)).json().entries.length;
    const logged = await call('POST', '/api/meals', cookie, { scanId: body.scanId });
    expect(logged.statusCode).toBe(200);
    expect(logged.json()).toMatchObject({ meal: 'Breakfast', time: '9:41 AM', what: 'Hainanese chicken rice', sodiumMg: 1450 });
    const photoUrl = logged.json().photoUrl as string;
    expect(photoUrl).toBe(`/api/meals/${logged.json().id}/photo`);

    const entries = (await call('GET', '/api/meals', cookie)).json().entries;
    expect(entries).toHaveLength(before + 1);
    expect(entries[0].photoUrl).toBe(photoUrl);
    expect(entries.slice(1).every((entry: { photoUrl: string | null }) => entry.photoUrl === null)).toBe(true);

    const photo = await call('GET', photoUrl, cookie);
    expect(photo.statusCode).toBe(200);
    expect(photo.headers['content-type']).toBe('image/jpeg');
    expect(photo.rawPayload.equals(JPEG)).toBe(true);

    // The scan is used up.
    expect((await call('POST', '/api/meals', cookie, { scanId: body.scanId })).statusCode).toBe(404);
  });

  it('keeps photos private to the patient who took them', async () => {
    const { call, login, signup } = await setup();
    const cookie = await login();
    const { scanId } = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();

    const other = await signup('90000001');
    expect((await call('POST', '/api/meals', other, { scanId })).statusCode).toBe(404);

    const { photoUrl } = (await call('POST', '/api/meals', cookie, { scanId })).json();
    expect((await call('GET', photoUrl, other)).statusCode).toBe(404);
  });

  it('logs the soup with the meal as a drink, and undo takes both off', async () => {
    const { call, login } = await setup();
    const cookie = await login();
    const fluidBefore = (await call('GET', '/api/metrics', cookie)).json().fluidToday;

    const scan = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();
    // To the nearest 10 ml.
    expect(scan.estimate).toMatchObject({ fluidMl: 150, fluidWhat: 'soup' });
    const meal = (await call('POST', '/api/meals', cookie, { scanId: scan.scanId })).json();
    expect(meal.fluidAddedMl).toBe(150);

    expect((await call('GET', '/api/metrics', cookie)).json().fluidToday).toBe(fluidBefore + 150);
    const drinks = (await call('GET', '/api/fluid', cookie)).json().entries;
    expect(drinks[0]).toMatchObject({ what: 'Soup with hainanese chicken rice', ml: 150 });
    expect((await call('GET', '/api/meals', cookie)).json().entries[0].fluidAddedMl).toBe(150);

    await call('DELETE', '/api/meals/last', cookie);
    expect((await call('GET', '/api/metrics', cookie)).json().fluidToday).toBe(fluidBefore);
    expect((await call('GET', '/api/fluid', cookie)).json().entries.some((entry: { what: string }) => entry.what.startsWith('Soup with'))).toBe(false);
  });

  it('leaves the soup out of drinks when the patient says so', async () => {
    const { call, login } = await setup();
    const cookie = await login();
    const fluidBefore = (await call('GET', '/api/metrics', cookie)).json().fluidToday;
    const { scanId } = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();
    const meal = (await call('POST', '/api/meals', cookie, { scanId, addFluid: false })).json();
    expect(meal.fluidAddedMl).toBeNull();
    expect((await call('GET', '/api/metrics', cookie)).json().fluidToday).toBe(fluidBefore);
  });

  it("passes the patient's note to the AI, and can check the same photo again with one", async () => {
    const vision = fakeVision();
    const { call, login, signup } = await setup(vision);
    const cookie = await login();

    const first = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO, note: 'half portion, no gravy' })).json();
    expect(vision.describeMeal).toHaveBeenLastCalledWith(JPEG, { note: 'half portion, no gravy' });

    // "Not right? Tell us what it is": the stored photo, the new note, a new scan in its place.
    const again = await call('POST', '/api/vision/meal', cookie, { scanId: first.scanId, note: 'it is fish soup' });
    expect(again.statusCode).toBe(200);
    expect(vision.describeMeal).toHaveBeenLastCalledWith(JPEG, { note: 'it is fish soup' });
    expect(again.json().scanId).not.toBe(first.scanId);
    expect((await call('POST', '/api/meals', cookie, { scanId: first.scanId })).statusCode).toBe(404);

    // Someone else's scan, a re-check without a note, or an over-long note: no.
    const other = await signup('90000002');
    expect((await call('POST', '/api/vision/meal', other, { scanId: again.json().scanId, note: 'mine now' })).statusCode).toBe(404);
    expect((await call('POST', '/api/vision/meal', cookie, { scanId: again.json().scanId })).statusCode).toBe(400);
    expect((await call('POST', '/api/vision/meal', cookie, { photo: PHOTO, note: 'x'.repeat(201) })).statusCode).toBe(400);
  });

  it('undo removes the meal and its photo', async () => {
    const { db, call, login } = await setup();
    const cookie = await login();
    const { scanId } = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();
    const { id, photoUrl } = (await call('POST', '/api/meals', cookie, { scanId })).json();

    expect((await call('DELETE', '/api/meals/last', cookie)).json()).toEqual({ ok: true, deletedId: id });
    expect((await call('GET', photoUrl, cookie)).statusCode).toBe(404);
    expect(db.select().from(schema.mealPhotos).all()).toHaveLength(0);
  });

  it('keeps only the newest unlogged scan', async () => {
    const { db, call, login } = await setup();
    const cookie = await login();
    const first = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();
    const second = (await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).json();
    expect(db.select().from(schema.mealScans).all().map((scan) => scan.id)).toEqual([second.scanId]);
    expect((await call('POST', '/api/meals', cookie, { scanId: first.scanId })).statusCode).toBe(404);
  });

  it('says so when there is no meal in the photo, and stores nothing', async () => {
    const { db, call, login } = await setup(fakeVision('```json\n{"isFood": false}\n```'));
    const scan = await call('POST', '/api/vision/meal', await login(), { photo: PHOTO });
    expect(scan.json()).toEqual({ found: false });
    expect(db.select().from(schema.mealScans).all()).toHaveLength(0);
  });

  it('rejects photos that are not a JPEG', async () => {
    const vision = fakeVision();
    const { call, login } = await setup(vision);
    const cookie = await login();
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(300)]).toString('base64');
    expect((await call('POST', '/api/vision/meal', cookie, { photo: png })).statusCode).toBe(400);
    expect((await call('POST', '/api/vision/meal', cookie, { photo: 'not base64!' })).statusCode).toBe(400);
    expect((await call('POST', '/api/vision/meal', cookie, {})).statusCode).toBe(400);
    expect(vision.describeMeal).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'empty'] as const)('tries once more when TokenHub fails with %s', async (code) => {
    const vision = {
      describeMeal: vi.fn()
        .mockRejectedValueOnce(new VisionError(code, 'first try failed'))
        .mockResolvedValueOnce(CHICKEN_RICE),
    };
    const { call, login } = await setup(vision);
    const scan = await call('POST', '/api/vision/meal', await login(), { photo: PHOTO });
    expect(scan.statusCode).toBe(200);
    expect(scan.json()).toMatchObject({ found: true, estimate: { what: 'Hainanese chicken rice' } });
    expect(vision.describeMeal).toHaveBeenCalledTimes(2);
    // The retry gets its own limit, within the 90 s for the whole check.
    expect(vision.describeMeal.mock.calls[1]).toEqual([JPEG, { timeoutMs: VISION_TIMEOUT_MS }]);
  });

  it('tries once more when the reply is unreadable', async () => {
    const vision = {
      describeMeal: vi.fn()
        .mockResolvedValueOnce('Let me look at this photo')
        .mockResolvedValueOnce(CHICKEN_RICE),
    };
    const { call, login } = await setup(vision);
    const scan = await call('POST', '/api/vision/meal', await login(), { photo: PHOTO });
    expect(scan.statusCode).toBe(200);
    expect(vision.describeMeal).toHaveBeenCalledTimes(2);
  });

  it('does not retry an HTTP error from TokenHub', async () => {
    const vision = { describeMeal: vi.fn().mockRejectedValue(new VisionError('http', 'TokenHub returned HTTP 402: arrears', 'TokenHub HTTP 402 (401006)')) };
    const { call, login } = await setup(vision);
    const scan = await call('POST', '/api/vision/meal', await login(), { photo: PHOTO });
    expect(scan.statusCode).toBe(502);
    expect(vision.describeMeal).toHaveBeenCalledTimes(1);
    // The patient sees the message; the short reason says what went wrong without the server logs.
    expect(scan.json()).toEqual({ error: { code: 'VISION_FAILED', message: "We couldn't check this photo right now. Please try again.", reason: 'TokenHub HTTP 402 (401006)' } });
  });

  it('answers 502 when TokenHub fails or replies with nonsense', async () => {
    const failing = await setup(fakeVision(() => Promise.reject(new VisionError('timeout', 'slow'))));
    const failed = await failing.call('POST', '/api/vision/meal', await failing.login(), { photo: PHOTO });
    expect(failed.statusCode).toBe(502);
    expect(failed.json().error.code).toBe('VISION_FAILED');

    const garbled = await setup(fakeVision('I think this is rice.'));
    expect((await garbled.call('POST', '/api/vision/meal', await garbled.login(), { photo: PHOTO })).statusCode).toBe(502);
  });

  it(`allows ${SCANS_PER_HOUR} checks an hour per patient`, async () => {
    const { call, login } = await setup();
    const cookie = await login();
    for (let i = 0; i < SCANS_PER_HOUR; i++) {
      expect((await call('POST', '/api/vision/meal', cookie, { photo: PHOTO })).statusCode).toBe(200);
    }
    const limited = await call('POST', '/api/vision/meal', cookie, { photo: PHOTO });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it("explains a medicine box, and says whether it is on the patient's list", async () => {
    const { call, login } = await setup();
    const cookie = await login();

    const biso = (await call('GET', '/api/medicines/barcode/2000000000022', cookie)).json();
    expect(biso).toMatchObject({
      status: 'yours',
      medicine: { id: 'biso', name: 'Heart rate pill', generic: 'Bisoprolol', strength: '2.5 mg', times: [480] },
      leaflet: { mayFeel: expect.any(String), callNurse: expect.any(String) },
    });

    // Mdm Tan doesn't take dapagliflozin.
    expect((await call('GET', '/api/medicines/barcode/2000000000053', cookie)).json()).toMatchObject({
      status: 'not_yours',
      medicine: { id: 'dapa', generic: 'Dapagliflozin' },
    });

    expect((await call('GET', '/api/medicines/barcode/2009990000012', cookie)).json()).toEqual({ status: 'unknown' });
    expect((await call('GET', '/api/medicines/barcode/12ab', cookie)).statusCode).toBe(400);
  });
});

describe('reading the vision reply', () => {
  it('clamps numbers, screens the tip and fills gaps', () => {
    const reply = parseMealReply(JSON.stringify({
      what: '  Mee   rebus\nwith egg ',
      sodiumMg: 99999,
      kcal: '480',
      carbs: { g: -5, what: 'Noodles' },
      tip: 'Take an extra water pill after this meal.',
      confidence: 0.3,
    }));
    expect(reply).toMatchObject({
      found: true,
      sure: false,
      estimate: {
        what: 'Mee rebus with egg',
        sodiumMg: 6000,
        kcal: 480,
        potassiumMg: 0,
        carbs: { g: 0, what: 'Noodles' },
        protein: { g: 0, what: 'Not sure' },
        tip: FALLBACK_TIP,
      },
    });
  });

  it('turns plate shares into eighths that add up to 1', () => {
    expect(plateShares([0.55, 0.3, 0.15], [0, 0, 0])).toEqual([0.625, 0.25, 0.125]);
    expect(plateShares([1, 1, 1], [0, 0, 0])).toEqual([0.375, 0.375, 0.25]);
    expect(plateShares([1, 1, 1], [0, 0, 0]).reduce((a, b) => a + b, 0)).toBe(1);
    expect(plateShares(undefined, [60, 20, 20])).toEqual([0.625, 0.25, 0.125]);
    expect(plateShares([0, 0, 0], [0, 0, 0])).toEqual([0.5, 0.25, 0.25]);
  });

  it('reads the soup or drink in the meal', () => {
    const base = { what: 'Fish soup', sodiumMg: 1100, kcal: 420 };
    expect(parseMealReply(JSON.stringify({ ...base, fluidMl: 2400, fluidWhat: 'Fish Soup' }))).toMatchObject({ estimate: { fluidMl: 1000, fluidWhat: 'fish soup' } });
    expect(parseMealReply(JSON.stringify({ ...base, fluidMl: 246 }))).toMatchObject({ estimate: { fluidMl: 250, fluidWhat: 'soup' } });
    expect(parseMealReply(JSON.stringify({ ...base, fluidMl: -5, fluidWhat: 'tea' }))).toMatchObject({ estimate: { fluidMl: 0, fluidWhat: '' } });
  });

  it('returns null for a reply with no JSON', () => {
    expect(parseMealReply('Sorry, I cannot help.')).toBeNull();
    expect(parseMealReply('{not json}')).toBeNull();
  });
});

describe('TokenHub client', () => {
  it('sends the photo as an image_url and returns the reply text, without leaking the key', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      choices: [{ message: { content: CHICKEN_RICE } }],
    }), { status: 200 }));
    const client = createTokenHubClient({ baseUrl: 'https://hub.test/v1/', apiKey: 'sk-secret', model: 'glm-5.3-flash', fetchImpl });

    expect(await client.describeMeal(JPEG)).toBe(CHICKEN_RICE);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://hub.test/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk-secret');
    const sent = JSON.parse(init?.body as string);
    expect(sent.model).toBe('glm-5.3-flash');
    expect(sent.response_format).toBeUndefined();
    // Room for the answer after the model's thinking.
    expect(sent.max_tokens).toBe(4096);
    expect(sent.messages[0].content[1].image_url.url).toBe(`data:image/jpeg;base64,${PHOTO}`);
    expect(init?.body as string).not.toContain('sk-secret');
  });

  it('gives up after the time limit, which one call can shorten', async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    }));
    const client = createTokenHubClient({ baseUrl: 'https://hub.test/v1', apiKey: 'k', model: 'm', fetchImpl });
    await expect(client.describeMeal(JPEG, { timeoutMs: 20 })).rejects.toMatchObject({ code: 'timeout', message: 'TokenHub did not answer within 20 ms' });
  });

  it('turns failures into VisionError without the key in the message', async () => {
    const client = createTokenHubClient({
      baseUrl: 'https://hub.test/v1',
      apiKey: 'sk-secret',
      model: 'm',
      fetchImpl: vi.fn(async () => new Response('{"error":{"code":"401001","message":"bad key sk-secret"}}', { status: 401 })),
    });
    await expect(client.describeMeal(JPEG)).rejects.toMatchObject({ code: 'http', message: 'TokenHub returned HTTP 401: bad key [key]', reason: 'TokenHub HTTP 401 (401001)' });

    const offline = createTokenHubClient({
      baseUrl: 'https://hub.test/v1',
      apiKey: 'k',
      model: 'm',
      fetchImpl: vi.fn(async () => { throw new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' }) }); }),
    });
    await expect(offline.describeMeal(JPEG)).rejects.toMatchObject({ code: 'network', reason: 'network ENOTFOUND' });

    const empty = createTokenHubClient({
      baseUrl: 'https://hub.test/v1',
      apiKey: 'k',
      model: 'm',
      fetchImpl: vi.fn(async () => new Response('{"choices":[]}', { status: 200 })),
    });
    await expect(empty.describeMeal(JPEG)).rejects.toMatchObject({ code: 'empty' });
  });
});

describe('TokenHub settings', () => {
  it('needs only the key, and forgives quotes, spaces and the full chat address', () => {
    expect(readTokenHubEnv({})).toBeUndefined();
    expect(readTokenHubEnv({ TOKENHUB_API_KEY: '  ' })).toBeUndefined();
    expect(readTokenHubEnv({ TOKENHUB_API_KEY: 'sk-abc' })).toEqual({ apiKey: 'sk-abc', baseUrl: DEFAULT_TOKENHUB_URL, model: DEFAULT_TOKENHUB_MODEL });
    expect(readTokenHubEnv({
      TOKENHUB_API_KEY: ' "sk-abc" ',
      TOKENHUB_BASE_URL: 'https://tokenhub-intl.tencentcloudmaas.com/v1/chat/completions/',
      TOKENHUB_MODEL: "'glm-5.3-flash'",
    })).toEqual({ apiKey: 'sk-abc', baseUrl: 'https://tokenhub-intl.tencentcloudmaas.com/v1', model: 'glm-5.3-flash' });
  });
});

describe('TokenHub prompts', () => {
  it("puts the patient's note in the meal prompt, without its quotes", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));
    const client = createTokenHubClient({ baseUrl: 'https://hub.test/v1', apiKey: 'k', model: 'm', fetchImpl });

    await client.describeMeal(JPEG, { note: 'my "fish" soup\nhalf' });
    const meal = JSON.parse(fetchImpl.mock.calls[0][1]?.body as string);
    expect(meal.messages[0].content[0].text).toContain('The person who took the photo says: "my \'fish\' soup half".');
    expect(meal.messages[0].content[0].text).toContain('"fluidMl"');

    await client.completeText('Hello');
    const text = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string);
    expect(text.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });
});
