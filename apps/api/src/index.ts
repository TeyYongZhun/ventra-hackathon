import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createApiApp } from './app.js';
import { createDb } from './db/client.js';
import { reseedDemoPatient } from './db/seed.js';
import { createAdpClient, DEFAULT_ADP_CHAT_URL } from './services/adp.js';
import { runDailySummaries, summaryMinutes } from './services/family.js';
import { createTelegramClient } from './services/telegram.js';
import { sgDate } from './time.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load secrets from the repo-root .env.local when present. Variables already set win.
const envFile = path.join(__dirname, '../../../.env.local');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const adpKey = process.env.ADP_KEY_GENERAL;
const adp = adpKey
  ? createAdpClient({ url: process.env.ADP_CHAT_URL || DEFAULT_ADP_CHAT_URL, appKey: adpKey })
  : undefined;

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegram = telegramToken
  ? createTelegramClient({ token: telegramToken, log: (message) => app.log.warn(message) })
  : undefined;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;

const db = createDb();
const app = createApiApp({ db, adp, telegram, telegramWebhookSecret: webhookSecret });

if (!adp) {
  app.log.warn('ADP_KEY_GENERAL is not set: Ask AI will only give fixed safety replies');
}
if (!telegram) {
  app.log.warn('TELEGRAM_BOT_TOKEN is not set: family alerts and summaries are off');
}

// Run Drizzle migrations on every start
migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });

// Rebuild the demo patient on every start so her 11-day history ends today.
// Other patients are untouched.
const demoToday = sgDate(Date.now());
// DEMO_FAMILY_CHAT_ID pre-links the demo family on hosts whose disk is wiped on restart.
await reseedDemoPatient(db, demoToday, { familyChatId: process.env.DEMO_FAMILY_CHAT_ID || null });
app.log.info(`Seeded demo patient (Mdm Tan) ending ${demoToday}`);

// Serve built web app in production
if (process.env.NODE_ENV === 'production') {
  const webDist = path.join(__dirname, '../../web/dist');
  app.register(fastifyStatic, {
    root: webDist,
    prefix: '/',
    wildcard: false,
  });
  app.get('*', async (request, reply) => {
    return reply.sendFile('index.html', webDist);
  });
}

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });

    // Point the Telegram bot at this server. Production only, so a dev server never
    // takes the webhook away from the live one.
    const publicUrl = process.env.PUBLIC_URL;
    if (telegram && webhookSecret && process.env.NODE_ENV === 'production' && publicUrl?.startsWith('https://')) {
      const ok = await telegram.setWebhook(`${publicUrl.replace(/\/$/, '')}/api/telegram/webhook`, webhookSecret);
      app.log.info(ok ? 'Telegram webhook registered' : 'Telegram webhook registration failed');
    }

    // Nightly family summary (10 PM Singapore by default), skipped if already sent today.
    const atMinutes = summaryMinutes(process.env.FAMILY_SUMMARY_CRON);
    let running = false;
    setInterval(() => {
      if (running) return;
      running = true;
      runDailySummaries(db, telegram, Date.now(), atMinutes)
        .then((sent) => {
          if (sent > 0) app.log.info(`Sent ${sent} family summaries`);
        })
        .catch((error) => app.log.error({ err: error }, 'Family summary job failed'))
        .finally(() => {
          running = false;
        });
    }, 60 * 1000).unref();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
