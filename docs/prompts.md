# How prompts drive the AI

Ventra's Ask AI uses one Tencent Cloud ADP app, **"Ventra Care Guide"**: model DeepSeek-V3.2 (thinking and generation), temperature about 0.1, capped output, and a knowledge base of six plain-language heart-failure leaflets. The server calls it through the ADP v1 chat API (`POST https://wss.lke.tencentcloud.com/v1/qbot/chat/sse`, `stream: enable`, `incremental: false`).

Safety does **not** rely on the prompt alone — see [safety.md](safety.md). The prompt sets tone and scope; code enforces the hard rules.

## 1. System prompt (ADP role instructions)

The live prompt is kept in the ADP console (App → role / character settings). It enforces:

- short, plain-English answers for an older reader;
- explanation only about medicines — never dose, timing, skipping or stopping advice;
- the three fixed lines (995, refusal, unsure) for emergencies, dose questions and uncertainty;
- no mention of source documents ("the guidelines say…").

The live text:

```
#Role Name
Ventra Care Guide, a calm assistant for adults with heart failure in Singapore.

#Style Features
Very short. Plain words. Warm. No headings. No bullet lists. No file names. Answer once only.

#Output Requirements
- Answer in at most 3 short sentences (under 50 words), using only the knowledge base.
- You may explain what a medicine is for, daily self-care, what green / amber / red means, and questions to ask a doctor.

#Output Limitations (never break these)
1. Medicine actions: if the patient asks whether to take, skip, stop, double, delay, or change any medicine or dose (including "should I skip..."), reply ONLY with: "I can't advise on that. Please ask your pharmacist or doctor." Do not say "do" or "do not". Do not explain further.
2. Never diagnose. Never say symptoms are "nothing to worry about".
3. Never change a Ventra status. Statuses come from fixed rules, not from you.
4. If the patient mentions severe breathlessness, chest pain, fainting, confusion or pink frothy phlegm, reply ONLY with: "Please call 995 now." Do not add anything else.
5. If the knowledge base does not answer it, or you cannot identify a medicine, reply ONLY with: "I'm not able to answer that confidently. Please check with your pharmacist or doctor."
6. Never mention "guidelines", "material", "leaflet", "knowledge base" or "based on". Never explain your rules.

#Examples (copy this style exactly)
Patient: Should I skip my water tablet today?
Answer: I can't advise on that. Please ask your pharmacist or doctor.

Patient: Can I take double today?
Answer: I can't advise on that. Please ask your pharmacist or doctor.

Patient: What colour is the tablet I should take for sleeping?
Answer: I'm not able to answer that confidently. Please check with your pharmacist or doctor.

Patient: What is bisoprolol for?
Answer: Bisoprolol helps your heart beat slower and more steadily. It eases the heart's workload over time.
Patient: I can't breathe and my chest hurts.
Answer: Please call 995 now.
#Intent
Medicine explanation, daily self-care, warning signs, appointment preparation, status explanation.
```

How the prompt and the code split the work: rules 1, 4 and 5 are also enforced by `screenInput` / `screenOutput`, rule 6 by the source-leak check, and rule 3 holds because statuses are computed by `packages/core/rules.ts` and never by the AI.

## 2. What the server sends for each question

Only questions that pass `screenInput` reach ADP. The content is built by `questionWithContext` (`packages/core/src/context.ts`):

```
The patient's own numbers today, from the Ventra app:
- Drink limit set by the care team: 1,500 ml a day. Drunk so far today: 850 ml. Left today: 650 ml.
- One full thermos cap holds 150 ml.
- Salt (sodium) limit: 2,000 mg a day. Eaten so far today: 1,600 mg.
- Weight this morning: 58.4 kg.
- Dry weight: 58.0 kg. Call the nurse if weight goes up 2 kg or more in 3 days.

Use these numbers only if the question needs them.
Question: How much can I drink today?
```

No name, phone, patient ID, medicines or dose times. A new patient with nothing set up sends the bare question.

Real answers from the live app (DeepSeek-V3.2, all passed `screenOutput`):

| Question | Answer |
|---|---|
| How much can I drink today? | You can drink 650 ml more today, as your care team set a limit of 1,500 ml a day. |
| How much salt can I still eat today? | You have eaten 1,600 mg of sodium today, and your limit is 2,000 mg. You can still have 400 mg of sodium today. |
| What is bisoprolol for? | Bisoprolol helps your heart beat slower and more steadily. It eases the heart's workload over time. |

## 3. Knowledge base

Six plain-language heart-failure leaflets, loaded in the ADP knowledge base. _(List their titles here.)_ Lessons learned:

- **Leaflets 03 and 04 were rewritten** from instructions ("take your water pill in the morning") to explanations, because the model quoted instructions back as advice.
- **Leaflet 07 (AI-only guidance) was removed** because the model leaked "the guidelines state…" wording.

## 4. Model choice

| | DeepSeek-V3.2 (chosen) | Hy3 |
|---|---|---|
| Speed | ≈ 3 s per answer in our tests | Noticeably slower |
| Length | Short, on point | Longer answers |
| Fit | Older patients need fast, short replies | — |

## 5. Rules for the model, enforced again in code

| Rule | Prompt | Code |
|---|---|---|
| Emergency → 995 | ✓ | `screenInput` answers before the AI is called |
| No dose / timing advice | ✓ | `screenInput` refuses the question; `screenOutput` blocks advice in answers |
| No source wording | ✓ | `screenOutput` blocks "the guidelines state…" |
| Short answers | ✓ (output cap) | `screenOutput` blocks answers over 700 characters |
| Unsure → fixed line | ✓ | any block, timeout or error → unsure line |
