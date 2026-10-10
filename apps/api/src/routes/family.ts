import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  familySummaryLines,
  type EmergencyNotifyResponse,
  type FamilySettingsResponse,
  type FamilySettingsUpdateResponse,
  type FamilySummarySendResponse,
} from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import { patientScope } from '../db/scope.js';
import { sendError } from '../errors.js';
import { loadRecordNow } from '../services/alerts.js';
import {
  ensureLinkCode,
  familyContact,
  sendDailySummary,
  shareChoices,
  summarySentOn,
} from '../services/family.js';
import type { TelegramClient } from '../services/telegram.js';

const sosSchema = z.object({
  what: z.enum(["Can't breathe", 'Chest pain', 'Fainted or very dizzy', 'Other emergency']),
});

// Only the patient's own choices; alerts, status and medicines are locked on and ignored here.
const updateSchema = z.object({
  weight: z.boolean().optional(),
  drinks: z.boolean().optional(),
  symptoms: z.boolean().optional(),
});

export interface FamilyRouteOptions {
  db: ApiDb;
  now: () => number;
  telegram?: TelegramClient;
}

export function registerFamilyRoutes(app: FastifyInstance, options: FamilyRouteOptions) {
  const { db, now, telegram } = options;

  app.get('/api/family/settings', async (request) => {
    const scope = patientScope(request);
    const nowMs = now();
    const contact = familyContact(db, scope.patientId);
    const share = shareChoices(db, scope.patientId);
    const linkCode = ensureLinkCode(db, scope.patientId, nowMs);
    const bot = linkCode && telegram ? await telegram.botUsername() : null;
    const record = loadRecordNow(db, scope.patientId, nowMs);

    return {
      enabled: true,
      alerts: true,
      status: true,
      medicines: true,
      dailySummary: true,
      ...share,
      family: contact ? { name: contact.name, relation: contact.relation } : null,
      linked: Boolean(contact?.telegramChatId),
      linkCode,
      linkUrl: linkCode && bot ? `https://t.me/${bot}?start=${linkCode}` : null,
      sentToday: summarySentOn(db, scope.patientId, record.today),
      preview: familySummaryLines(record, share),
    } satisfies FamilySettingsResponse;
  });

  app.put('/api/family/settings', async (request, reply) => {
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const changes = parsed.data;
    const existing = db.select({ id: schema.shareSettings.id })
      .from(schema.shareSettings)
      .where(scope.where(schema.shareSettings.patientId))
      .get();

    if (existing) {
      if (Object.keys(changes).length > 0) {
        db.update(schema.shareSettings).set(changes).where(eq(schema.shareSettings.id, existing.id)).run();
      }
    } else {
      db.insert(schema.shareSettings).values(scope.values({ enabled: true, ...changes })).run();
    }

    return { ok: true } satisfies FamilySettingsUpdateResponse;
  });

  // Telegram re-link: forget the linked family chat and the old code, so the next
  // GET /api/family/settings makes a fresh code (24 hours) to link a Telegram account with.
  // Until it is linked again, alerts and summaries are not sent to the family.
  app.post('/api/family/telegram/reset', async (request) => {
    const scope = patientScope(request);
    db.update(schema.contacts)
      .set({ telegramChatId: null, linkCode: null, linkCodeExpiresAt: null })
      .where(scope.where(schema.contacts.patientId))
      .run();
    return { ok: true } satisfies FamilySettingsUpdateResponse;
  });

  // SOS: after the 10-second countdown, tell the linked family member straight away.
  // The 995 call itself is simulated in this prototype.
  app.post('/api/emergency/notify', async (request, reply) => {
    const parsed = sosSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body');
    }

    const scope = patientScope(request);
    const contact = familyContact(db, scope.patientId);
    const patient = db.select({ name: schema.patients.name }).from(schema.patients)
      .where(eq(schema.patients.id, scope.patientId)).get();
    let told = false;
    if (telegram && contact?.telegramChatId && patient) {
      told = await telegram.sendMessage(
        contact.telegramChatId,
        `🚨 SOS from ${patient.name} in Ventra: ${parsed.data.what}.\nPlease call or check on ${patient.name} now.`,
      );
    }

    return { told, family: contact ? { name: contact.name, relation: contact.relation } : null } satisfies EmergencyNotifyResponse;
  });

  // "Send today's summary now". Once sent, tonight's 10 PM summary is skipped.
  app.post('/api/family/summary/send', async (request, reply) => {
    const scope = patientScope(request);
    const nowMs = now();
    const result = await sendDailySummary(db, telegram, scope.patientId, nowMs);

    switch (result) {
      case 'sent':
        return { ok: true, sentAt: new Date(nowMs).toISOString() } satisfies FamilySummarySendResponse;
      case 'already_sent':
        return sendError(reply, 409, 'CONFLICT', "Today's summary was already sent");
      case 'not_linked':
        return sendError(reply, 409, 'NOT_LINKED', 'Your family member has not connected Telegram yet');
      case 'unavailable':
        return sendError(reply, 503, 'UNAVAILABLE', 'Messages to family are not set up on this server');
      default:
        return sendError(reply, 502, 'SEND_FAILED', "The summary couldn't be sent. Please try again");
    }
  });
}
