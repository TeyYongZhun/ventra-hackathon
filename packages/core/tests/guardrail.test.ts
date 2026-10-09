import { describe, it, expect } from 'vitest';
import {
  screenInput,
  screenOutput,
  SAFE_REPLIES,
  MAX_ANSWER_CHARS,
  MAX_QUESTION_CHARS,
} from '../src/guardrail.js';

describe('screenInput: emergency', () => {
  it.each([
    "I can't breathe",
    'I cant breathe',
    'I cannot breathe properly',
    'i am struggling to breathe',
    'I have trouble breathing',
    'My mother stopped breathing',
    'I have chest pain',
    'there is pressure in my chest',
    'chest tightness since morning',
    'I think I am having a heart attack',
    'I feel like I will faint',
    'She collapsed in the kitchen',
    'he is unconscious',
    'I am coughing up blood',
    'Should I call 995?',
    'please send an ambulance',
    'This is an emergency',
    'I CAN’T BREATHE!!!',
  ])('returns the 995 reply for: %s', (q) => {
    const r = screenInput(q);
    expect(r).toEqual({ allowed: false, reason: 'emergency', reply: SAFE_REPLIES.emergency });
  });

  it('puts emergency before dose when both appear', () => {
    const r = screenInput("I can't breathe, should I take double my water pill?");
    expect(r).toMatchObject({ allowed: false, reason: 'emergency' });
  });

  it('uses the exact fixed emergency line', () => {
    expect(SAFE_REPLIES.emergency).toBe('Please call 995 now.');
  });
});

describe('screenInput: dose and medicine advice', () => {
  it.each([
    'Can I skip my water pill?',
    'Should I stop taking my heart pill?',
    'Can I take two tablets of furosemide?',
    'How much bisoprolol should I take?',
    'What is the dose of my water pill?',
    'I missed my morning pill, what should I do?',
    'I forgot to take it today',
    'Can I double my dose tomorrow?',
    'Can I take my water pill later tonight?',
    'What time should I take spironolactone?',
    'Can I take half a tablet?',
    'Is it safe to take more pills when I swell?',
    'Can I switch my heart helper to another medicine?',
    'Can I mix my medicine with alcohol?',
    'Should I reduce my water pill since I feel dizzy?',
    'Do I need to take extra furosemide today?',
  ])('returns the refuse reply for: %s', (q) => {
    const r = screenInput(q);
    expect(r).toEqual({ allowed: false, reason: 'dose', reply: SAFE_REPLIES.dose });
  });

  it('uses the exact fixed dose line', () => {
    expect(SAFE_REPLIES.dose).toBe(
      "I can't advise on that. Please ask your pharmacist or doctor.",
    );
  });
});

describe('screenInput: normal questions pass', () => {
  it.each([
    'What is bisoprolol for?',
    'What is my water pill for?',
    'How much can I drink today?',
    'Why do I need to weigh myself every morning?',
    'What foods are high in salt?',
    'Why are my ankles swollen?',
    'Can I take a shower after eating?',
    'What does heart failure mean?',
    'Hello',
  ])('allows: %s', (q) => {
    expect(screenInput(q)).toEqual({ allowed: true });
  });
});

describe('screenInput: invalid input', () => {
  it('rejects an empty question with the unsure line', () => {
    expect(screenInput('   ')).toEqual({
      allowed: false,
      reason: 'invalid',
      reply: SAFE_REPLIES.unsure,
    });
  });

  it('rejects an over-long question', () => {
    const r = screenInput('a'.repeat(MAX_QUESTION_CHARS + 1));
    expect(r).toMatchObject({ allowed: false, reason: 'invalid' });
  });
});

describe('screenOutput: safe answers pass', () => {
  it.each([
    'Bisoprolol helps slow your heart rate so your heart does not work so hard.',
    'Your water pill helps your body get rid of extra water. Ask your pharmacist if you have questions about it.',
    'Please do not skip your water pill. If you missed one, ask your pharmacist or doctor.',
    'Never stop taking your medicine without asking your doctor.',
    'Weighing yourself every morning helps spot sudden weight gain from extra water.',
    'You can drink up to 1,500 ml today. You have had 750 ml so far.',
  ])('allows: %s', (a) => {
    expect(screenOutput(a)).toEqual({ allowed: true, text: a });
  });

  it('trims the allowed text', () => {
    expect(screenOutput('  Hello there.  ')).toEqual({ allowed: true, text: 'Hello there.' });
  });
});

describe('screenOutput: dose or timing advice is blocked', () => {
  it.each([
    'You can skip your water pill today.',
    'You should take an extra tablet if your ankles swell.',
    'You may stop taking the heart pill if you feel dizzy.',
    'Double your dose tomorrow to catch up.',
    'Take 40 mg of furosemide in the evening.',
    'Take two tablets with breakfast.',
    'Take it later tonight instead.',
    'Take your water pill in the morning.',
    'The recommended dose is one tablet a day.',
    'You could halve the dose when you feel better.',
  ])('blocks: %s', (a) => {
    expect(screenOutput(a)).toEqual({
      allowed: false,
      reason: 'dose_advice',
      reply: SAFE_REPLIES.unsure,
    });
  });
});

describe('screenOutput: source leakage is blocked', () => {
  it.each([
    'The guidelines state that you should weigh yourself daily.',
    'According to the documents, salt makes you hold water.',
    'Based on the provided context, your pill lowers fluid.',
    'The leaflet says water pills remove extra fluid.',
    'As an AI language model I cannot say.',
    'My instructions say I should not answer that.',
  ])('blocks: %s', (a) => {
    expect(screenOutput(a)).toEqual({
      allowed: false,
      reason: 'source_leak',
      reply: SAFE_REPLIES.unsure,
    });
  });
});

describe('screenOutput: empty and over-long answers', () => {
  it('blocks an empty answer', () => {
    expect(screenOutput('   ')).toEqual({
      allowed: false,
      reason: 'empty',
      reply: SAFE_REPLIES.unsure,
    });
  });

  it('blocks an answer over the length cap', () => {
    const r = screenOutput('Water helps. '.repeat(100));
    expect(r).toEqual({ allowed: false, reason: 'too_long', reply: SAFE_REPLIES.unsure });
  });

  it('allows an answer exactly at the cap', () => {
    const text = 'a'.repeat(MAX_ANSWER_CHARS);
    expect(screenOutput(text)).toEqual({ allowed: true, text });
  });

  it('uses the exact fixed unsure line', () => {
    expect(SAFE_REPLIES.unsure).toBe(
      "I'm not able to answer that confidently. Please check with your pharmacist or doctor.",
    );
  });
});
