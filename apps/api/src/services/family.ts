import crypto from 'node:crypto';
import { and, eq, isNotNull } from 'drizzle-orm';
import { alertMessage, familySummaryMessage, type ShareChoices } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { sgDate, sgMinutes } from '../time.js';
import { loadRecordNow } from './alerts.js';
import type { TelegramClient } from './telegram.js';

const LINK_CODE_TTL_MS = 24 * 60 * 60 * 1000;
// No 0/O or 1/I, so a code read aloud or typed is hard to get wrong.
const LINK_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type SummaryResult = 'sent' | 'already_sent' | 'not_linked' | 'unavailable' | 'failed';

export function familyContact(db: ApiDb, patientId: number) {
  return db.select().from(schema.contacts).where(eq(schema.contacts.patientId, patientId)).get();
}

export function shareChoices(db: ApiDb, patientId: number): ShareChoices {
  const row = db.select().from(schema.shareSettings).where(eq(schema.shareSettings.patientId, patientId)).get();
  return { weight: row?.weight ?? false, drinks: row?.drinks ?? false, symptoms: row?.symptoms ?? false };
}

export function summarySentOn(db: ApiDb, patientId: number, date: string): boolean {
  const row = db.select({ id: schema.summaries.id })
    .from(schema.summaries)
    .where(and(eq(schema.summaries.patientId, patientId), eq(schema.summaries.date, date), isNotNull(schema.summaries.sentAt)))
    .get();
  return Boolean(row);
}

// A one-time code the family member sends to the bot (/start CODE). Reused until it expires.
export function ensureLinkCode(db: ApiDb, patientId: number, nowMs: number): string | null {
  const contact = familyContact(db, patientId);
  if (!contact || contact.telegramChatId) return null;
  if (contact.linkCode && contact.linkCodeExpiresAt && Date.parse(contact.linkCodeExpiresAt) > nowMs) {
    return contact.linkCode;
  }

  let code = '';
  for (let i = 0; i < 6; i += 1) code += LINK_CODE_CHARS[crypto.randomInt(LINK_CODE_CHARS.length)];
  db.update(schema.contacts)
    .set({ linkCode: code, linkCodeExpiresAt: new Date(nowMs + LINK_CODE_TTL_MS).toISOString() })
    .where(eq(schema.contacts.id, contact.id))
    .run();
  return code;
}

// Links the Telegram chat that sent a valid code. Returns the patient's name, or null.
export function linkTelegram(db: ApiDb, code: string, chatId: string, nowMs: number): string | null {
  const contact = db.select().from(schema.contacts).where(eq(schema.contacts.linkCode, code.toUpperCase())).get();
  if (!contact || !contact.linkCodeExpiresAt || Date.parse(contact.linkCodeExpiresAt) <= nowMs) return null;

  db.update(schema.contacts)
    .set({ telegramChatId: chatId, linkCode: null, linkCodeExpiresAt: null })
    .where(eq(schema.contacts.id, contact.id))
    .run();

  const patient = db.select({ name: schema.patients.name }).from(schema.patients)
    .where(eq(schema.patients.id, contact.patientId)).get();
  return patient?.name ?? null;
}

// Alerts are always shared: tell the linked family member straight away.
export async function notifyAlert(
  db: ApiDb,
  telegram: TelegramClient | undefined,
  patientId: number,
  alertId: number,
  nowMs: number,
): Promise<boolean> {
  const chatId = familyContact(db, patientId)?.telegramChatId;
  if (!telegram || !chatId) return false;

  const alert = db.select().from(schema.alerts)
    .where(and(eq(schema.alerts.id, alertId), eq(schema.alerts.patientId, patientId))).get();
  if (!alert) return false;

  const record = loadRecordNow(db, patientId, nowMs);
  const sent = await telegram.sendMessage(chatId, alertMessage(record, record.today, alert.time));
  if (sent) {
    db.update(schema.alerts).set({ familyTold: true }).where(eq(schema.alerts.id, alertId)).run();
  }
  return sent;
}

// Today's summary, sent once a day: by the patient ("Send now") or by the 10 PM job.
export async function sendDailySummary(
  db: ApiDb,
  telegram: TelegramClient | undefined,
  patientId: number,
  nowMs: number,
): Promise<SummaryResult> {
  const date = sgDate(nowMs);
  if (summarySentOn(db, patientId, date)) return 'already_sent';
  const chatId = familyContact(db, patientId)?.telegramChatId;
  if (!chatId) return 'not_linked';
  if (!telegram) return 'unavailable';

  const record = loadRecordNow(db, patientId, nowMs);
  const sent = await telegram.sendMessage(chatId, familySummaryMessage(record, shareChoices(db, patientId)));
  if (!sent) return 'failed';

  db.insert(schema.summaries).values({ patientId, date, sentAt: new Date(nowMs).toISOString() }).run();
  return 'sent';
}

// The nightly job: at or after the summary time, send to every linked family not yet sent today.
export async function runDailySummaries(
  db: ApiDb,
  telegram: TelegramClient | undefined,
  nowMs: number,
  atMinutes: number,
): Promise<number> {
  if (!telegram || sgMinutes(nowMs) < atMinutes) return 0;

  const linked = db.select({ patientId: schema.contacts.patientId })
    .from(schema.contacts)
    .where(isNotNull(schema.contacts.telegramChatId))
    .all();

  let sent = 0;
  for (const { patientId } of linked) {
    if ((await sendDailySummary(db, telegram, patientId, nowMs)) === 'sent') sent += 1;
  }
  return sent;
}

// "0 22 * * *" → 22:00. Only plain minute and hour fields are supported; anything else means 22:00.
export function summaryMinutes(cron: string | undefined): number {
  const [minute, hour] = (cron ?? '').trim().split(/\s+/);
  const m = Number(minute);
  const h = Number(hour);
  if (Number.isInteger(m) && Number.isInteger(h) && m >= 0 && m < 60 && h >= 0 && h < 24) return h * 60 + m;
  return 22 * 60;
}
