// Ask AI → "Questions to ask" on Visit prep. Questions that need the patient's own doctor go on
// their list for the next visit, and Ask AI says so in the chat (VisitQuestionNote).
// - Dose questions (Ask AI never answers them) are added at once in the patient's own words;
//   the AI then rewrites them more clearly in the background (polishQuestion).
// - Other questions: the AI (TokenHub, text only) decides whether answering them properly needs
//   the doctor — their symptoms, medicines, doses, results, limits or treatment — and if so writes
//   the question the way the patient would ask it at the visit (reviewAskQuestion).
// Only the question text is sent to TokenHub, never who asked.
import { and, desc, eq, ne } from 'drizzle-orm';
import { screenOutput, type VisitQuestionNote } from '@ventra/core';
import type { ApiDb } from '../app.js';
import * as schema from '../db/schema.js';
import type { VisionClient } from './vision.js';

// Enough for one visit; the oldest drop off the list.
export const MAX_VISIT_QUESTIONS = 20;
const REVIEW_TIMEOUT_MS = 45_000;

export function reviewPrompt(asked: string, existing: string[]): string {
  const said = oneLine(asked, 300).replace(/"/g, "'");
  return [
    `A person with heart failure asked this in a health app: "${said}"`,
    'Decide if answering it properly needs their own doctor: for example their symptoms or how they feel,',
    'their medicines or doses, their test results, their weight, drink or salt limits, or changes to their treatment.',
    'General questions (what heart failure is, low-salt food ideas, how to measure drinks) do not.',
    ...(existing.length ? ['Questions already on their list for the doctor:', ...existing.map((q, i) => `${i + 1}. ${q}`)] : []),
    'If it needs the doctor, write it as one short question they can ask the doctor:',
    'first person, plain English, under 20 words, ending with "?". It must be a question, never advice.',
    'Set alreadyListed to true if the same question is already on their list.',
    'Reply with JSON only: {"needsDoctor": true or false, "alreadyListed": true or false, "question": "..."}',
    'Think briefly, then answer straight away with the JSON.',
  ].join('\n');
}

function oneLine(text: string, max: number): string {
  const line = text.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return line.length > max ? line.slice(0, max).trimEnd() : line;
}

// One plain question for the doctor, or null. A single sentence ending in "?": no advice slipped
// in before it, no links. Dose words are fine here — it is the patient asking their doctor.
export function cleanQuestion(text: string): string | null {
  const line = oneLine(text, 200);
  const question = line.charAt(0).toUpperCase() + line.slice(1);
  if (question.length < 8 || question.length > 160) return null;
  if (!question.endsWith('?') || /[.!?]\s/.test(question.slice(0, -1))) return null;
  if (/https?:|www\./i.test(question)) return null;
  const screened = screenOutput(question);
  if (!screened.allowed && screened.reason !== 'dose_advice') return null;
  return question;
}

// The AI's verdict, or null when the reply can't be read.
export function parseReview(text: string): { needsDoctor: boolean; alreadyListed: boolean; question: string | null } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as { needsDoctor?: unknown; alreadyListed?: unknown; question?: unknown };
    if (typeof json.needsDoctor !== 'boolean') return null;
    return {
      needsDoctor: json.needsDoctor,
      alreadyListed: json.alreadyListed === true,
      question: typeof json.question === 'string' ? cleanQuestion(json.question) : null,
    };
  } catch {
    return null;
  }
}

const same = (a: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function listed(db: ApiDb, patientId: number): Array<{ id: number; question: string }> {
  return db.select({ id: schema.visitQuestions.id, question: schema.visitQuestions.question })
    .from(schema.visitQuestions)
    .where(eq(schema.visitQuestions.patientId, patientId))
    .orderBy(desc(schema.visitQuestions.id))
    .all();
}

// Adds the question (unless it is already there) and keeps the newest MAX_VISIT_QUESTIONS.
function save(db: ApiDb, patientId: number, question: string, asked: string, nowMs: number): { id: number | null; note: VisitQuestionNote } {
  const already = listed(db, patientId).find((row) => same(row.question) === same(question));
  if (already) return { id: null, note: { status: 'already', question: already.question } };

  const id = db.transaction((tx) => {
    const row = tx.insert(schema.visitQuestions).values({
      patientId,
      createdAt: new Date(nowMs).toISOString(),
      question,
      asked: oneLine(asked, 300),
    }).returning({ id: schema.visitQuestions.id }).get();
    const old = tx.select({ id: schema.visitQuestions.id })
      .from(schema.visitQuestions)
      .where(eq(schema.visitQuestions.patientId, patientId))
      .orderBy(desc(schema.visitQuestions.id))
      .all()
      .slice(MAX_VISIT_QUESTIONS);
    for (const stale of old) tx.delete(schema.visitQuestions).where(eq(schema.visitQuestions.id, stale.id)).run();
    return row.id;
  });
  return { id, note: { status: 'added', question } };
}

// A dose question, added straight away in the patient's own words (tidied). Synchronous, so the
// Ask AI reply can say so without waiting for the AI.
export function addDoseQuestion(db: ApiDb, patientId: number, asked: string, nowMs: number): { id: number | null; note: VisitQuestionNote } | null {
  const own = oneLine(asked, 150).replace(/[.!]+$/, '');
  const question = cleanQuestion(own.endsWith('?') ? own : `${own}?`);
  return question ? save(db, patientId, question, asked, nowMs) : null;
}

// After addDoseQuestion: the AI rewrites the patient's words as a clearer question for the doctor.
// Keeps their words if the AI is unavailable or its question is unusable or already listed.
export async function polishQuestion(input: { db: ApiDb; vision: VisionClient; patientId: number; id: number; asked: string }): Promise<string | null> {
  const { db, vision, patientId, id, asked } = input;
  const others = listed(db, patientId).filter((row) => row.id !== id).map((row) => row.question);
  const verdict = parseReview(await vision.completeText(reviewPrompt(asked, others), { timeoutMs: REVIEW_TIMEOUT_MS }));
  const better = verdict?.question;
  if (!better || others.some((q) => same(q) === same(better))) return null;
  const updated = db.update(schema.visitQuestions)
    .set({ question: better })
    .where(and(eq(schema.visitQuestions.id, id), eq(schema.visitQuestions.patientId, patientId), ne(schema.visitQuestions.question, better)))
    .run();
  return updated.changes > 0 ? better : null;
}

export interface ReviewInput {
  db: ApiDb;
  vision: VisionClient;
  patientId: number;
  asked: string;
  nowMs: number;
}

// Any other Ask AI question: added only if the AI says the doctor needs to answer it.
// Returns what to tell the patient, or null (not needed, or the AI's reply was unusable).
export async function reviewAskQuestion(input: ReviewInput): Promise<VisitQuestionNote | null> {
  const { db, vision, patientId, asked, nowMs } = input;
  const existing = listed(db, patientId).map((row) => row.question);
  const verdict = parseReview(await vision.completeText(reviewPrompt(asked, existing), { timeoutMs: REVIEW_TIMEOUT_MS }));
  if (!verdict?.needsDoctor) return null;
  // Already on the list (perhaps worded differently): don't add a near-copy.
  if (verdict.alreadyListed) return { status: 'already', question: verdict.question ?? '' };
  return verdict.question ? save(db, patientId, verdict.question, asked, nowMs).note : null;
}
