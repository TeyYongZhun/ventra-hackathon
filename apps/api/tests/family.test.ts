import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApiApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { reseedDemoPatient, seedDemoPatient } from '../src/db/seed.js';
import { runDailySummaries, summaryMinutes } from '../src/services/family.js';
import { createTelegramClient, type TelegramClient } from '../src/services/telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 9:41 AM Singapore on the demo day; the seed's last day is 7 Oct.
const DEMO_NOW = Date.parse('2026-10-07T01:41:00.000Z');
const SECRET = 'test-webhook-secret';
const MINUTE = 60 * 1000;

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('Expected Set-Cookie header');
  return raw.split(';')[0];
}

function fakeTelegram() {
  return {
    sendMessage: vi.fn(async (_chatId: string, _text: string) => true),
    setWebhook: vi.fn(async () => true),
    botUsername: vi.fn(async () => 'VentraCareBot'),
  } satisfies TelegramClient;
}

describe('alerts, family sharing and Telegram', () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanup.length) {
      await cleanup.pop()?.();
    }
  });

  async function setup(options: { telegram?: TelegramClient | null } = {}) {
    let nowMs = DEMO_NOW;
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    const demoId = await seedDemoPatient(db);
    const telegram = options.telegram === null ? undefined : options.telegram ?? fakeTelegram();
    const app = createApiApp({ db, logger: false, now: () => nowMs, telegram, telegramWebhookSecret: SECRET });
    cleanup.push(() => sqlite.close(), () => app.close());

    async function login(phone = '81234567') {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone, pin: '1234' } });
      expect(response.statusCode).toBe(200);
      return cookieFrom(response);
    }

    function call(method: 'GET' | 'POST' | 'PUT', url: string, cookie: string, payload?: object) {
      return app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
    }

    function webhook(text: string, chatId = 555, secret = SECRET) {
      return app.inject({
        method: 'POST',
        url: '/api/telegram/webhook',
        headers: { 'x-telegram-bot-api-secret-token': secret },
        payload: { update_id: 1, message: { message_id: 1, chat: { id: chatId, type: 'private' }, text } },
      });
    }

    async function linkFamily(cookie: string, chatId = 555) {
      const settings = (await call('GET', '/api/family/settings', cookie)).json();
      expect((await webhook(`/start ${settings.linkCode}`, chatId)).statusCode).toBe(200);
    }

    return {
      app,
      db,
      demoId,
      telegram: telegram as ReturnType<typeof fakeTelegram> | undefined,
      login,
      call,
      webhook,
      linkFamily,
      setNow: (ms: number) => { nowMs = ms; },
    };
  }

  describe('GET /api/alerts/latest', () => {
    it('shows the latest alert day and its nurse script when today is green', async () => {
      const { login, call } = await setup();
      const body = (await call('GET', '/api/alerts/latest', await login())).json();

      expect(body).toMatchObject({
        zone: 'yellow',
        date: '2026-10-03',
        time: '6:10 PM',
        familyTold: true,
        family: { name: 'Mei Ling', relation: 'daughter' },
      });
      expect(body.reasons.map((reason: { key: string }) => reason.key)).toEqual(['missed', 'fluid', 'sym']);
      const script = body.script.flatMap((line: { segs: { t: string }[] }) => line.segs.map((seg) => seg.t)).join('');
      expect(script).toContain('Mdm Tan');
      expect(script).toContain('1,750 ml');
    });
  });

  describe('demo yellow day → alert → Telegram', () => {
    it('tells the linked family member within the same request cycle', async () => {
      const { login, call, linkFamily, telegram, setNow, db, demoId } = await setup();
      const cookie = await login();
      await linkFamily(cookie);
      telegram!.sendMessage.mockClear();

      expect((await call('POST', '/api/demo/yellow-day', cookie)).statusCode).toBe(200);
      setNow(DEMO_NOW + 49 * MINUTE); // 10:30 AM
      await call('POST', '/api/fluid', cookie, { what: 'Soup', ml: 900 });
      await call('POST', '/api/symptoms', cookie, { key: 'ankles', sev: 'Mild' });

      await vi.waitFor(() => expect(telegram!.sendMessage).toHaveBeenCalledTimes(1));
      const [chatId, text] = telegram!.sendMessage.mock.calls[0];
      expect(chatId).toBe('555');
      expect(text).toContain('Ventra alert for Mdm Tan · YELLOW');
      expect(text).toContain('Wed 7 Oct, 10:30 AM');
      expect(text).toContain('• Missed water pill (8 AM)');
      expect(text).toContain('• Drank 1,750 ml · limit 1,500');

      await vi.waitFor(() => {
        const alert = db.select().from(schema.alerts).where(eq(schema.alerts.patientId, demoId)).all()
          .find((row) => row.date === '2026-10-07');
        expect(alert?.familyTold).toBe(true);
      });

      const latest = (await call('GET', '/api/alerts/latest', cookie)).json();
      expect(latest).toMatchObject({ date: '2026-10-07', time: '10:30 AM', zone: 'yellow', familyTold: true });
      expect(latest.headline).toBe('Signs of extra fluid in your body');
    });

    it('sends nothing when no family member is linked', async () => {
      const { login, call, telegram, setNow } = await setup();
      const cookie = await login();
      await call('POST', '/api/demo/yellow-day', cookie);
      setNow(DEMO_NOW + 49 * MINUTE);
      await call('POST', '/api/fluid', cookie, { what: 'Soup', ml: 900 });

      expect((await call('GET', '/api/metrics', cookie)).json().zone).toBe('yellow');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(telegram!.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('family settings', () => {
    it('shows a link code, the three locked items and the preview', async () => {
      const { login, call } = await setup();
      const body = (await call('GET', '/api/family/settings', await login())).json();

      expect(body).toMatchObject({
        alerts: true,
        status: true,
        medicines: true,
        dailySummary: true,
        weight: false,
        drinks: false,
        symptoms: false,
        family: { name: 'Mei Ling', relation: 'daughter' },
        linked: false,
        sentToday: false,
      });
      expect(body.linkCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(body.linkUrl).toBe(`https://t.me/VentraCareBot?start=${body.linkCode}`);
      expect(body.preview.map((line: { key: string }) => line.key)).toEqual(['alerts', 'status', 'medicines']);
    });

    it('keeps the same code until it is used', async () => {
      const { login, call } = await setup();
      const cookie = await login();
      const first = (await call('GET', '/api/family/settings', cookie)).json().linkCode;
      const second = (await call('GET', '/api/family/settings', cookie)).json().linkCode;
      expect(second).toBe(first);
    });

    it('saves the optional items and ignores attempts to turn off locked ones', async () => {
      const { login, call } = await setup();
      const cookie = await login();

      const put = await call('PUT', '/api/family/settings', cookie, { weight: true, drinks: true, alerts: false, medicines: false });
      expect(put.statusCode).toBe(200);

      const body = (await call('GET', '/api/family/settings', cookie)).json();
      expect(body).toMatchObject({ alerts: true, medicines: true, weight: true, drinks: true, symptoms: false });
      expect(body.preview.map((line: { key: string }) => line.key)).toEqual(['alerts', 'status', 'weight', 'medicines', 'drinks']);
    });

    it('rejects a bad body', async () => {
      const { login, call } = await setup();
      const response = await call('PUT', '/api/family/settings', await login(), { weight: 'yes' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Telegram webhook', () => {
    it('rejects calls without the secret header', async () => {
      const { webhook } = await setup();
      expect((await webhook('/start ABCDEF', 1, 'wrong')).statusCode).toBe(401);
    });

    it('links the family chat with /start CODE and confirms in Telegram', async () => {
      const { login, call, webhook, telegram } = await setup();
      const cookie = await login();
      const code = (await call('GET', '/api/family/settings', cookie)).json().linkCode;

      expect((await webhook(`/start ${code.toLowerCase()}`, 777)).json()).toEqual({ ok: true });

      expect(telegram!.sendMessage).toHaveBeenCalledWith('777', expect.stringContaining("You're connected. You'll get Mdm Tan's Ventra alerts"));
      const after = (await call('GET', '/api/family/settings', cookie)).json();
      expect(after).toMatchObject({ linked: true, linkCode: null, linkUrl: null });
    });

    it('refuses a wrong or expired code', async () => {
      const { login, call, webhook, telegram, setNow } = await setup();
      const cookie = await login();
      const code = (await call('GET', '/api/family/settings', cookie)).json().linkCode;

      await webhook('/start ZZZZZZ', 777);
      expect(telegram!.sendMessage).toHaveBeenLastCalledWith('777', expect.stringContaining('not valid or has expired'));

      setNow(DEMO_NOW + 25 * 60 * MINUTE);
      await webhook(`/start ${code}`, 777);
      expect(telegram!.sendMessage).toHaveBeenLastCalledWith('777', expect.stringContaining('not valid or has expired'));
      expect((await call('GET', '/api/family/settings', cookie)).json().linked).toBe(false);
    });

    it('ignores other messages but still answers 200', async () => {
      const { webhook, telegram } = await setup();
      expect((await webhook('hello there')).statusCode).toBe(200);
      expect(telegram!.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('daily summary', () => {
    it('needs a linked family member', async () => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/family/summary/send', await login());
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('NOT_LINKED');
    });

    it('sends now, then refuses a second send and skips the 10 PM job', async () => {
      const { db, login, call, linkFamily, telegram, setNow } = await setup();
      const cookie = await login();
      await linkFamily(cookie);
      telegram!.sendMessage.mockClear();

      const sent = await call('POST', '/api/family/summary/send', cookie);
      expect(sent.statusCode).toBe(200);
      expect(telegram!.sendMessage).toHaveBeenCalledWith('555', expect.stringContaining("Ventra · today's summary for Mdm Tan"));
      expect((await call('GET', '/api/family/settings', cookie)).json().sentToday).toBe(true);

      const again = await call('POST', '/api/family/summary/send', cookie);
      expect(again.statusCode).toBe(409);

      const tenPm = Date.parse('2026-10-07T14:00:00.000Z');
      setNow(tenPm);
      expect(await runDailySummaries(db, telegram, tenPm, 22 * 60)).toBe(0);
      expect(telegram!.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('sends at 10 PM, not before, once per day', async () => {
      const { db, login, linkFamily, telegram } = await setup();
      await linkFamily(await login());
      telegram!.sendMessage.mockClear();

      expect(await runDailySummaries(db, telegram, Date.parse('2026-10-07T13:59:00.000Z'), 22 * 60)).toBe(0);
      expect(await runDailySummaries(db, telegram, Date.parse('2026-10-07T14:00:00.000Z'), 22 * 60)).toBe(1);
      expect(await runDailySummaries(db, telegram, Date.parse('2026-10-07T14:05:00.000Z'), 22 * 60)).toBe(0);
      expect(telegram!.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('says so when Telegram is not set up on the server', async () => {
      const { login, call, db, demoId } = await setup({ telegram: null });
      db.update(schema.contacts).set({ telegramChatId: '555' }).where(eq(schema.contacts.patientId, demoId)).run();
      const response = await call('POST', '/api/family/summary/send', await login());
      expect(response.statusCode).toBe(503);
    });

    it('reads the summary time from FAMILY_SUMMARY_CRON', () => {
      expect(summaryMinutes('0 22 * * *')).toBe(22 * 60);
      expect(summaryMinutes('30 21 * * *')).toBe(21 * 60 + 30);
      expect(summaryMinutes(undefined)).toBe(22 * 60);
      expect(summaryMinutes('*/5 * * * *')).toBe(22 * 60);
    });
  });

  describe('SOS family message', () => {
    it('tells the linked family member what is happening', async () => {
      const { login, call, linkFamily, telegram } = await setup();
      const cookie = await login();
      await linkFamily(cookie);
      telegram!.sendMessage.mockClear();

      const response = await call('POST', '/api/emergency/notify', cookie, { what: "Can't breathe" });

      expect(response.json()).toEqual({ told: true, family: { name: 'Mei Ling', relation: 'daughter' } });
      expect(telegram!.sendMessage).toHaveBeenCalledWith('555', expect.stringContaining("SOS from Mdm Tan in Ventra: Can't breathe."));
    });

    it('reports told: false when no one is linked', async () => {
      const { login, call, telegram } = await setup();
      const response = await call('POST', '/api/emergency/notify', await login(), { what: 'Chest pain' });
      expect(response.json()).toMatchObject({ told: false });
      expect(telegram!.sendMessage).not.toHaveBeenCalled();
    });

    it('only accepts the four choices', async () => {
      const { login, call } = await setup();
      const response = await call('POST', '/api/emergency/notify', await login(), { what: 'Anything goes' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('demo tools', () => {
    it('are only for the demo patient', async () => {
      const { app, call } = await setup();
      const signup = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { name: 'Real', phone: '80000301', pin: '1234' } });
      const cookie = cookieFrom(signup);
      expect((await call('POST', '/api/demo/reset', cookie)).statusCode).toBe(403);
      expect((await call('POST', '/api/demo/yellow-day', cookie)).statusCode).toBe(403);
    });

    it('resets the demo day without logging out and keeps the family link', async () => {
      const { login, call, linkFamily } = await setup();
      const cookie = await login();
      await linkFamily(cookie);
      await call('POST', '/api/fluid', cookie, { what: 'Water', ml: 300 });
      expect((await call('GET', '/api/metrics', cookie)).json().fluidToday).toBe(1150);

      expect((await call('POST', '/api/demo/reset', cookie)).statusCode).toBe(200);

      expect((await call('GET', '/api/metrics', cookie)).json().fluidToday).toBe(850);
      expect((await call('GET', '/api/family/settings', cookie)).json().linked).toBe(true);
    });

    it('pre-links the demo family from DEMO_FAMILY_CHAT_ID on a fresh database', async () => {
      const sqlite = new Database(':memory:');
      const db = drizzle(sqlite, { schema });
      migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
      cleanup.push(() => sqlite.close());

      const id = await reseedDemoPatient(db, '2026-10-07', { familyChatId: '999' });
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.patientId, id)).get();
      expect(contact?.telegramChatId).toBe('999');
    });
  });
});

describe('Telegram client', () => {
  it('calls the Bot API and never puts the token in its log lines', async () => {
    const logs: string[] = [];
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: false, description: 'Forbidden' }), { status: 403 }));
    const client = createTelegramClient({ token: 'SECRET-TOKEN', fetchImpl, log: (line) => logs.push(line) });

    expect(await client.sendMessage('1', 'hi')).toBe(false);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('https://api.telegram.org/botSECRET-TOKEN/sendMessage');
    expect(logs.join('\n')).toContain('HTTP 403');
    expect(logs.join('\n')).not.toContain('SECRET-TOKEN');
  });

  it('returns false instead of throwing when Telegram is unreachable', async () => {
    const client = createTelegramClient({ token: 't', fetchImpl: vi.fn(async () => { throw new TypeError('fetch failed'); }) });
    await expect(client.sendMessage('1', 'hi')).resolves.toBe(false);
  });
});
