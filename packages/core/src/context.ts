// The patient's own numbers, added to an Ask AI question so answers like "How much can I
// drink today?" use them. No name, phone or ID, and deliberately no medicines or dose times:
// the AI must never be steered towards dose or timing advice.
import { fluidOn, sodiumToday, type PatientRecord } from './record.js';

function num(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function patientContext(record: PatientRecord): string {
  const { targets } = record;
  const facts: string[] = [];

  if (targets.fluidMl > 0) {
    const drunk = fluidOn(record, record.today) ?? 0;
    facts.push(
      `Drink limit set by the care team: ${num(targets.fluidMl)} ml a day. Drunk so far today: ${num(drunk)} ml. Left today: ${num(Math.max(targets.fluidMl - drunk, 0))} ml.`,
    );
  }
  if (targets.capMl > 0) facts.push(`One full thermos cap holds ${num(targets.capMl)} ml.`);
  if (targets.sodiumMg > 0) {
    facts.push(`Salt (sodium) limit: ${num(targets.sodiumMg)} mg a day. Eaten so far today: ${num(sodiumToday(record))} mg.`);
  }
  const weight = record.weights[record.today];
  if (weight != null) facts.push(`Weight this morning: ${weight.toFixed(1)} kg.`);
  if (targets.dryKg > 0) {
    facts.push(`Dry weight: ${targets.dryKg.toFixed(1)} kg. Call the nurse if weight goes up ${targets.alertGainKg} kg or more in ${targets.alertDays} days.`);
  }

  return facts.length ? `The patient's own numbers today, from the Ventra app:\n- ${facts.join('\n- ')}` : '';
}

// What is sent to the AI: the question, plus the patient's numbers when there are any.
export function questionWithContext(question: string, record: PatientRecord): string {
  const context = patientContext(record);
  return context ? `${context}\n\nUse these numbers only if the question needs them.\nQuestion: ${question}` : question;
}
