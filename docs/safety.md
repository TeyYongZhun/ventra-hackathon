# Safety

Ventra is a self-care companion for older heart-failure patients. The design rule is simple: **code decides, the AI only explains.**

## Fixed safety lines

| Case | Exact reply |
|---|---|
| Emergency | Please call 995 now. |
| Dose / medicine advice | I can't advise on that. Please ask your pharmacist or doctor. |
| Unsure, blocked or AI unavailable | I'm not able to answer that confidently. Please check with your pharmacist or doctor. |

These strings live in `SAFE_REPLIES` (`packages/core/src/guardrail.ts`) and tests check them word for word.

## Why a code guardrail, not just a prompt

While building the ADP app we saw the model ignore fixed-line rules in its prompt, and quote "the guidelines state…" from instructional leaflets as if it were advice. Prompts are probabilistic; a regex in code is not. So every question and every answer passes through code, and the prompt is a second layer.

## The Ask AI flow

1. **Session and validation:** only a logged-in patient; the body is checked with zod (1–2,000 characters).
2. **`screenInput(question)`**, before anything else:
   - **Emergency words** (can't breathe, chest pain, fainted, collapsed, coughing blood, 995, ambulance…) → "Please call 995 now." plus an SOS card. Checked first, even in a very long message.
   - **Dose or medicine-change questions** (skip, stop, double, extra, missed, how much, what time… together with a medicine word, or any mention of "dose") → the refusal line plus a nurse card.
   - Neither case reaches the AI, and neither is rate limited.
3. **Rate limit:** 8 AI calls a minute for the whole app (the ADP free plan allows 10).
4. **ADP call** with the question and the patient's own numbers for today: drink limit and intake, salt limit and intake, weight and dry weight, cap size. **Never sent:** name, phone, patient ID, medicines or dose times — medicines are left out on purpose so the AI is never steered towards dose advice. `visitor_biz_id` and `session_id` are HMAC pseudonyms.
5. **`screenOutput(answer)`** blocks:
   - dose or timing advice ("you can skip…", "take two tablets…", "take it later…", "the recommended dose…"), unless negated ("do not stop…");
   - source leakage ("the guidelines state…", "according to the documents…", "as an AI…");
   - answers over 700 characters, empty answers, and anything ADP itself flags (`is_evil`);
   - a stream that ended before the final reply.
   Any block → the unsure line.
6. **Logging:** the question and the reply are stored with a request ID and latency. Server logs never contain the question text or any key.

The guardrail has 77 unit tests; the API route has tests for every branch (emergency, dose, blocked output, timeout, rate limit, no AI configured, patient scoping, no question text in logs).

**Limits:** English only; keyword matching errs on the side of blocking (e.g. "What counts as an emergency?" gets the 995 line). That is deliberate.

## Alerts are rules, not AI

`evaluate` in `packages/core/src/rules.ts` turns a day yellow when:

- weight is up 2 kg or more in 3 days (the patient's own targets), or
- the water pill was missed **and** drinks are over the limit or ankles are swollen, or
- drinks are over the limit **and** ankles are swollen, or
- breathlessness is medium or bad.

Every rule has unit tests. The first yellow of the day is recorded and the linked family member is told on Telegram straight away.

## Medicines

- The AI explains what a medicine is for; it never advises on doses or timing.
- A dose counts as taken only when the patient confirms it, after a "You can't change this after you say yes" check. Confirmed doses are locked: there is no update or delete route.
- An unconfirmed dose becomes "missed" two hours after its time, so adherence is never inflated.

## Emergencies

- A red SOS button is on every screen after login.
- SOS → what's happening → 10-second countdown with a large **Cancel** → simulated call. The app never dials 995 in this prototype and says so on screen: "Demo: no real call is made. In a real emergency, call 995 yourself."
- The linked family member gets a Telegram message ("SOS from …"); the screen only claims this if it was delivered.

## Data protection

- Each patient sees only their own data: every query is filtered by the `patient_id` from the session, never from the request body (tested: patient B cannot read patient A).
- PINs are stored as bcrypt hashes; 5 wrong PINs lock the login for 5 minutes; session cookie is httpOnly, SameSite=Lax, Secure in production.
- Secrets (ADP key, bot token, webhook secret) come from environment variables and are never logged or sent to the browser. The Telegram webhook checks a secret header with a timing-safe comparison.
- Family sharing: alerts, status and medicines are always shared for safety; weight, drinks and symptoms only if the patient turns them on. Linking needs a one-time code from the patient's app.
- All demo data is synthetic.
