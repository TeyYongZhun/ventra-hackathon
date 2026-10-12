// Meal photo → nutrition estimate, using a vision model on Tencent Cloud TokenHub
// (OpenAI-compatible chat API, glm-5.3-flash by default). Only the photo is sent: no name,
// phone or patient id. The API key only goes in the Authorization header; it is never logged
// or put in an error.
import { z } from 'zod';
import { screenOutput, type MealEstimate } from '@ventra/core';

export const DEFAULT_TOKENHUB_URL = 'https://tokenhub-intl.tencentcloudmaas.com/v1';
export const DEFAULT_TOKENHUB_MODEL = 'glm-5.3-flash';
// glm-5.3-flash always thinks (reasoning_content) before it answers, and can't be told not to
// here: a busy photo can take 30+ seconds. MAX_TOKENS leaves room for the answer after the thinking.
export const VISION_TIMEOUT_MS = 60_000;
export const MAX_TOKENS = 4096;

export interface VisionClient {
  // The model's reply to MEAL_PROMPT for this JPEG, as raw text (parse with parseMealReply).
  // timeoutMs overrides the client's own limit for this one call.
  describeMeal(jpeg: Buffer, options?: { timeoutMs?: number }): Promise<string>;
}

export interface TokenHubClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export type VisionErrorCode = 'timeout' | 'network' | 'http' | 'empty';

export class VisionError extends Error {
  constructor(public readonly code: VisionErrorCode, message: string) {
    super(message);
    this.name = 'VisionError';
  }
}

// Plain request on purpose: TokenHub rejects this model when asked for response_format or for
// thinking to be switched off, so the JSON shape is asked for in the prompt instead.
export const MEAL_PROMPT = [
  'This photo was taken by an older adult in Singapore who has heart failure and must eat less salt.',
  'Estimate the food in the photo, for the portion shown. Sauce, gravy, soup and pickles count toward sodium.',
  'Reply with JSON only, no other text:',
  '{"isFood": true,',
  ' "what": "the dish in 2 to 5 words, as a Singapore hawker stall would call it, no brackets",',
  ' "sodiumMg": number, "kcal": number, "potassiumMg": number, "phosphorusMg": number,',
  ' "carbs": {"g": number, "what": "main carb foods, 2 to 4 words"},',
  ' "protein": {"g": number, "what": "main protein foods, 2 to 4 words"},',
  ' "fat": {"g": number, "what": "main sources of fat, 2 to 4 words"},',
  ' "plate": [carbs share, protein share, fat share] adding up to 1,',
  ' "tip": "one short, kind sentence (under 20 words) on eating this with less salt. Food only, never medicine.",',
  ' "confidence": number from 0 to 1, how sure you are what the dish is}',
  'If there is no food in the photo, reply {"isFood": false}.',
  'Think briefly, then answer straight away with the JSON.',
].join('\n');

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export function createTokenHubClient(options: TokenHubClientOptions): VisionClient {
  const defaultTimeoutMs = options.timeoutMs ?? VISION_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`;

  return {
    async describeMeal(jpeg, call = {}) {
      const timeoutMs = call.timeoutMs ?? defaultTimeoutMs;
      let body: { choices?: Array<{ message?: { content?: unknown } }> };
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: options.model,
            temperature: 0.2,
            max_tokens: MAX_TOKENS,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: MEAL_PROMPT },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpeg.toString('base64')}` } },
              ],
            }],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          throw new VisionError('http', `TokenHub returned HTTP ${response.status}`);
        }
        body = await response.json();
      } catch (error) {
        if (error instanceof VisionError) throw error;
        if (isAbort(error)) throw new VisionError('timeout', `TokenHub did not answer within ${timeoutMs} ms`);
        throw new VisionError('network', 'TokenHub request failed');
      }

      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new VisionError('empty', 'TokenHub returned no answer');
      return content;
    },
  };
}

// ------------------------------------------------------------------
// Reading the reply
// ------------------------------------------------------------------

const num = z.coerce.number().finite();
const macro = z.object({ g: num, what: z.string() });
const replySchema = z.object({
  isFood: z.boolean().optional(),
  what: z.string().optional(),
  sodiumMg: num.optional(),
  kcal: num.optional(),
  potassiumMg: num.optional(),
  phosphorusMg: num.optional(),
  carbs: macro.optional(),
  protein: macro.optional(),
  fat: macro.optional(),
  plate: z.array(num).length(3).optional(),
  tip: z.string().optional(),
  confidence: num.optional(),
});

export const FALLBACK_TIP = 'Ask for less sauce or gravy, and leave the soup to cut the salt.';
// Below this the app says "We're not very sure about this one".
const SURE_FROM = 0.6;

const clamp = (value: number, min: number, max: number) => Math.round(Math.min(Math.max(value, min), max));

// One line of plain text, at most `max` characters.
function words(text: string, max: number): string {
  const line = text.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

// Plate shares rounded to eighths (the card shows ⅛ ¼ ½ ¾) and adding up to exactly 1.
// No plate, or an empty one, falls back to the grams of each.
export function plateShares(plate: number[] | undefined, grams: [number, number, number]): [number, number, number] {
  let raw = plate?.map((f) => Math.max(f, 0)) ?? [];
  if (raw.length !== 3 || raw.every((f) => f === 0)) raw = grams.map((g) => Math.max(g, 0));
  const total = raw.reduce((sum, f) => sum + f, 0);
  if (total === 0) return [0.5, 0.25, 0.25];
  // Largest remainder: round each down, then hand the eighths left over to the biggest remainders.
  const exact = raw.map((f) => (f / total) * 8);
  const eighths = exact.map(Math.floor);
  const byRemainder = [0, 1, 2].sort((a, b) => (exact[b] - eighths[b]) - (exact[a] - eighths[a]));
  for (let left = 8 - eighths.reduce((sum, e) => sum + e, 0), i = 0; left > 0; left--, i++) eighths[byRemainder[i]] += 1;
  return eighths.map((e) => e / 8) as [number, number, number];
}

export type ParsedMealReply =
  | { found: true; sure: boolean; estimate: MealEstimate }
  | { found: false };

// The model wraps its JSON in ```json fences and may add text around it: take the outermost
// {...}, check every field, and keep each number in a sensible range. null = unreadable reply.
export function parseMealReply(text: string): ParsedMealReply | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = replySchema.safeParse(json);
  if (!parsed.success) return null;
  const reply = parsed.data;

  const name = words(reply.what ?? '', 60);
  const what = name.charAt(0).toUpperCase() + name.slice(1);
  if (reply.isFood === false || !what || reply.sodiumMg == null || reply.kcal == null) return { found: false };

  const part = (m: z.infer<typeof macro> | undefined, fallback: string) => ({
    g: clamp(m?.g ?? 0, 0, 300),
    what: words(m?.what ?? '', 40) || fallback,
  });
  const carbs = part(reply.carbs, 'Not sure');
  const protein = part(reply.protein, 'Not sure');
  const fat = part(reply.fat, 'Not sure');

  // The tip is AI text the patient reads: same guardrail as Ask AI (no dose talk, no leaks).
  const tip = words(reply.tip ?? '', 160);
  const screened = tip ? screenOutput(tip) : null;

  return {
    found: true,
    sure: (reply.confidence ?? 0) >= SURE_FROM,
    estimate: {
      what,
      sodiumMg: clamp(reply.sodiumMg, 0, 6000),
      kcal: clamp(reply.kcal, 0, 3000),
      potassiumMg: clamp(reply.potassiumMg ?? 0, 0, 4000),
      phosphorusMg: clamp(reply.phosphorusMg ?? 0, 0, 2000),
      carbs,
      protein,
      fat,
      plate: plateShares(reply.plate, [carbs.g, protein.g, fat.g]),
      tip: screened?.allowed ? screened.text : FALLBACK_TIP,
    },
  };
}
