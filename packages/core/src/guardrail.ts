// Safety guardrail for the Ask AI flow. Pure functions, no I/O.
// screenInput runs on every question before ADP is called.
// screenOutput runs on every ADP answer before it reaches the patient.

export const SAFE_REPLIES = {
  emergency: 'Please call 995 now.',
  dose: "I can't advise on that. Please ask your pharmacist or doctor.",
  unsure:
    "I'm not able to answer that confidently. Please check with your pharmacist or doctor.",
} as const;

export const MAX_QUESTION_CHARS = 500;
export const MAX_ANSWER_CHARS = 700;

export type InputScreenResult =
  | { allowed: true }
  | { allowed: false; reason: 'emergency' | 'dose' | 'invalid'; reply: string };

export type OutputScreenResult =
  | { allowed: true; text: string }
  | {
      allowed: false;
      reason: 'empty' | 'too_long' | 'dose_advice' | 'source_leak';
      reply: string;
    };

// Lowercase, straighten quotes, drop apostrophes ("can't" -> "cant"), turn other
// punctuation into spaces and collapse whitespace.
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ---------- input: emergency ----------

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(cant|cannot|can not|couldnt|unable to|not able to|struggl\w* to|trouble|difficulty|hard to|difficult to|stopped|stop) (to )?(breathe|breathing)\b/,
  /\bcatch (my|his|her|their) breath\b/,
  /\bgasping\b/,
  /\bchest (pain|pains|tightness|pressure|discomfort|is tight|hurts?|feels tight)\b/,
  /\b(pain|pains|pressure|tightness|discomfort) in (my |the |his |her )?chest\b/,
  /\b(heart attack|cardiac arrest|having a stroke|stroke)\b/,
  /\b(faint|fainted|fainting|passed out|passing out|pass out|collapse|collapsed|collapsing|unconscious|unresponsive)\b/,
  /\b(not responding|not breathing|wont wake|will not wake|not waking)\b/,
  /\b(coughing|vomiting|spitting|throwing) (up )?blood\b/,
  /\b(choke|choking|choked)\b/,
  /\b995\b/,
  /\bambulance\b/,
  /\b(medical )?emergency\b/,
];

// ---------- input: dose / medicine advice ----------

const MEDICINE_TERM =
  /\b(pills?|tablets?|capsules?|medicines?|medications?|meds?|drugs?|inhalers?|injections?|insulin|furosemide|frusemide|lasix|bisoprolol|sacubitril|valsartan|entresto|spironolactone|ramipril|digoxin|warfarin|aspirin|statins?|atorvastatin|metformin|dapagliflozin|blood thinners?|water pill|heart (rate )?pill|heart helper|heart protector)\b/;

const TAKE_TERM = /\b(take|taking|taken|took)\b/;

const DOSE_WORD = /\b(doses?|dosages?|dosing|overdos\w*)\b/;

const STRONG_ACTION =
  /\b(skip|skips|skipped|skipping|stop|stops|stopped|stopping|quit|quitting|miss|missed|missing|forgot|forget|forgotten|double|doubled|doubling|triple|halve|halved|half|extra|increase|increased|increasing|raise|reduce|reduced|reducing|decrease|lower|lowering|cut down|cut back)\b/;

const WEAK_ACTION =
  /\b(change|changing|switch|switching|swap|replace|delay|delayed|late|later|earlier|postpone|instead|together|mix|mixing|combine|combining|alongside|how much|how many|how often|what time|when should|when do|when can|when to|should i take|can i take|may i take|safe to take|ok to take|okay to take|take (more|less|another|two|three|one more)|more pills?|more tablets?|dont need|no need)\b/;

function isDoseQuestion(n: string): boolean {
  if (DOSE_WORD.test(n)) return true;
  if (MEDICINE_TERM.test(n) && (STRONG_ACTION.test(n) || WEAK_ACTION.test(n))) return true;
  if (TAKE_TERM.test(n) && STRONG_ACTION.test(n)) return true;
  return false;
}

export function screenInput(question: string): InputScreenResult {
  const trimmed = question.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUESTION_CHARS) {
    return { allowed: false, reason: 'invalid', reply: SAFE_REPLIES.unsure };
  }

  const n = normalise(trimmed);

  // Emergency wins over everything else.
  if (EMERGENCY_PATTERNS.some((p) => p.test(n))) {
    return { allowed: false, reason: 'emergency', reply: SAFE_REPLIES.emergency };
  }

  if (isDoseQuestion(n)) {
    return { allowed: false, reason: 'dose', reply: SAFE_REPLIES.dose };
  }

  return { allowed: true };
}

// ---------- output ----------

const NEGATION = /\b(not|never|dont|do not|avoid|without|no need to)\b/;

// Patterns that are dose or timing advice when they appear as an instruction.
const ADVICE_PATTERNS: RegExp[] = [
  /\byou (can|could|may|might|should|must|need to|ought to|are able to)( safely| just| also)? (skip|stop|quit|double|halve|reduce|increase|lower|delay|postpone|miss|take (an? )?(extra|more|another|less|half|double|two|three|\d))\b/,
  /\b(skip|stop taking|stop|double|halve|increase|reduce|lower|delay|postpone|cut) (the |your |a |that |this |any )?(\w+ ){0,2}(dose|doses|pill|pills|tablet|tablets|medicine|medication|capsule|capsules)\b/,
  /\btake (an? )?(extra|another|double|half|one|two|three|four|\d+( \d+)?) ?(\w+ ){0,3}(mg|mcg|tablets?|pills?|capsules?|doses?)\b/,
  /\btake (it|them|your \w+( pill| tablet| medicine)?|the \w+( pill| tablet| medicine)?) (later|earlier|now|tomorrow|instead|at \d|in the (morning|afternoon|evening|night)|before|after|twice|once|every)\b/,
  /\b(recommended|usual|normal|standard|maximum|max|safe|starting|daily) dos(e|age)\b/,
];

const LEAK_PATTERNS: RegExp[] = [
  /\b(guidelines?|materials?|documents?|leaflets?|knowledge base|sources?|context|passages?|references?) (state|states|stated|say|says|said|mention|mentions|mentioned|indicate|indicates|indicated|suggest|suggests)\b/,
  /\baccording to (the|our|these|this|my) (guidelines?|documents?|materials?|leaflets?|knowledge base|context|information provided|sources?)\b/,
  /\bbased on (the|these|this) (provided|given|above|following)? ?(documents?|context|information|materials?|leaflets?|sources?)\b/,
  /\b(my|the) (system )?(prompt|instructions)\b/,
  /\bas an ai( language model)?\b/,
];

function hasUnnegatedMatch(n: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, 'g');
  for (const match of n.matchAll(re)) {
    const start = match.index ?? 0;
    const before = n.slice(Math.max(0, start - 25), start);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

export function screenOutput(answer: string): OutputScreenResult {
  const text = answer.trim();
  if (text.length === 0) {
    return { allowed: false, reason: 'empty', reply: SAFE_REPLIES.unsure };
  }
  if (text.length > MAX_ANSWER_CHARS) {
    return { allowed: false, reason: 'too_long', reply: SAFE_REPLIES.unsure };
  }

  const n = normalise(text);

  if (LEAK_PATTERNS.some((p) => p.test(n))) {
    return { allowed: false, reason: 'source_leak', reply: SAFE_REPLIES.unsure };
  }
  if (ADVICE_PATTERNS.some((p) => hasUnnegatedMatch(n, p))) {
    return { allowed: false, reason: 'dose_advice', reply: SAFE_REPLIES.unsure };
  }

  return { allowed: true, text };
}
