import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ApiDb } from '../app.js';
import { sendError } from '../errors.js';
import { linkTelegram } from '../services/family.js';
import type { TelegramClient } from '../services/telegram.js';

const updateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.number().int() }),
    text: z.string().max(4096).optional(),
  }).optional(),
});

const START = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9]{4,12}))?\s*$/;

export interface TelegramRouteOptions {
  db: ApiDb;
  now: () => number;
  telegram?: TelegramClient;
  webhookSecret?: string;
}

function sameSecret(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Called by Telegram's servers (no session). Telegram sends our secret in a header.
// "/start CODE" links the family member's chat to the patient who showed the code.
export function registerTelegramRoutes(app: FastifyInstance, options: TelegramRouteOptions) {
  const { db, now, telegram, webhookSecret } = options;

  app.post('/api/telegram/webhook', async (request, reply) => {
    if (!webhookSecret || !sameSecret(request.headers['x-telegram-bot-api-secret-token'], webhookSecret)) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Bad webhook secret');
    }

    // Always answer 200 so Telegram does not keep retrying messages we ignore.
    const parsed = updateSchema.safeParse(request.body);
    const message = parsed.success ? parsed.data.message : undefined;
    const match = message?.text ? START.exec(message.text.trim()) : null;
    if (!message || !match) return { ok: true };

    const chatId = String(message.chat.id);
    const code = match[1];
    const name = code ? linkTelegram(db, code, chatId, now()) : null;

    const text = name
      ? `You're connected. You'll get ${name}'s Ventra alerts straight away and a summary every evening.`
      : code
        ? 'That code is not valid or has expired. Please ask for a new one in the Ventra app (More › Summary for my family).'
        : 'Hello! To connect, open the link from the Ventra app (More › Summary for my family).';
    await telegram?.sendMessage(chatId, text);

    return { ok: true };
  });
}
