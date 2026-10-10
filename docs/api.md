# Ventra API Contract

> Teammate A builds the frontend against this contract.  
> Every route except `POST /api/auth/signup` and `POST /api/auth/login` requires a valid session cookie.  
> `patient_id` always comes from the session — never from the request body.

---

## Standard error shape

All errors return HTTP 4xx/5xx with this JSON body:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Session required"
  }
}
```

Common codes:
- `UNAUTHORIZED` — missing or invalid session cookie
- `VALIDATION_ERROR` — request body failed zod validation
- `NOT_FOUND` — resource does not exist
- `CONFLICT` — business rule blocked the action (e.g. undoing fluid from a previous day)
- `TOO_MANY_ATTEMPTS` — 5 wrong PIN attempts locked login for 5 minutes
- `RATE_LIMITED` — too many AI questions this minute (`Retry-After` header says when to retry)
- `FORBIDDEN` — demo tools used by a patient who is not the demo patient
- `NOT_LINKED` — the family member has not connected Telegram yet
- `UNAVAILABLE` / `SEND_FAILED` — Telegram is not set up on the server / did not accept the message
- `INTERNAL_ERROR` — unexpected server error

---

## Auth

### POST /api/auth/signup
Create a new patient account and start a session.

**Session required:** No

**Request body:**
```json
{
  "phone": "string",
  "pin": "string (4 digits)",
  "name": "string"
}
```

**Success 200:**
```json
{
  "ok": true,
  "patientId": 1
}
```

**Errors:** `VALIDATION_ERROR`, `CONFLICT` (phone already registered)

---

### POST /api/auth/login
Authenticate with phone + PIN. Sets an `httpOnly` session cookie.

**Session required:** No

**Request body:**
```json
{
  "phone": "string",
  "pin": "string (4 digits)"
}
```

**Success 200:**
```json
{
  "ok": true
}
```

**Errors:** `UNAUTHORIZED` (invalid credentials), `VALIDATION_ERROR`, `TOO_MANY_ATTEMPTS`

---

### GET /api/me
Return the logged-in patient's display identity.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "name": "Mdm Tan",
  "is_demo": true,
  "text_size": null,
  "set_up": true
}
```
`text_size`: `large` | `xl` | `null`. `set_up` is `false` for a new patient until the care targets are saved.

**Errors:** `UNAUTHORIZED`

---

### POST /api/auth/logout
Clear the session cookie.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "ok": true
}
```

---

## Onboarding

Set-up steps after sign-up. A new patient starts empty (no targets, medicines or history). `GET /api/me` returns `set_up: false` until the targets are saved, and the app sends the patient through set-up first.

### PUT /api/onboarding/profile
Partial update: send only what changed.

```json
{ "age": 68, "textSize": "xl" }
```
Fields: `name`, `age` (18–120), `condition`, `dischargeDate` (YYYY-MM-DD), `textSize` (`large` | `xl`).

**Success 200:** `{ "ok": true }` · **Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### PUT /api/onboarding/targets
Filled in by clinic staff. Creates or replaces the care targets.

```json
{ "dryKg": 70, "fluidMl": 1200, "sodiumMg": 2000, "alertGainKg": 2, "alertDays": 3 }
```
Sanity ranges: dry weight 25–250 kg, fluid 500–5,000 ml, sodium 500–6,000 mg, gain 0.5–10 kg, days 1–14. `capMl` is optional here.

**Success 200:** `{ "ok": true }` · **Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### PUT /api/onboarding/medications
Replaces the medicine list with picks from `MEDICINE_CATALOG` (`packages/core/medicines.ts`), each with its times in minutes after midnight.

```json
{ "meds": [{ "id": "furo", "times": [480] }, { "id": "dapa", "times": [480] }] }
```

**Success 200:** `{ "ok": true }` · **Errors:** `VALIDATION_ERROR`, `NOT_FOUND` (id not in the catalog), `UNAUTHORIZED`

---

### PUT /api/onboarding/cap
```json
{ "capMl": 200 }
```
**Success 200:** `{ "ok": true }` · **Errors:** `VALIDATION_ERROR`, `CONFLICT` (save the targets first), `UNAUTHORIZED`

---

### PUT /api/onboarding/contact
One family contact; editing keeps an existing Telegram link.

```json
{ "name": "Lee Wei", "relation": "son", "phone": "91234567" }
```
**Success 200:** `{ "ok": true }` · **Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Metrics

### GET /api/metrics?date=YYYY-MM-DD
Returns every number the screens show for the given date, built by `buildMetrics` in `@ventra/core`.  
If `date` is omitted, defaults to today in Singapore. A past date is treated as a finished day.

**Dose model** (`dosesOn` in `packages/core/src/record.ts`):
- A dose is `taken` only after `POST /api/doses/confirm` ("I took it"). Confirmed doses are locked.
- An unconfirmed dose is `missed` 2 hours after its time (`MISSED_GRACE_MIN`), or on any earlier day.
- `adherence` counts only settled doses (taken or missed); a dose still inside its 2-hour window is left out.
- `pillsToday.next` is the first dose today that is neither taken nor missed.

**Demo patient:** Mdm Tan is rebuilt on every server start with her history shifted so her last day is today. Her numbers are the same on any day.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "patient": {
    "name": "Mdm Tan",
    "age": 72,
    "condition": "heart failure",
    "family": { "name": "Mei Ling", "relation": "daughter" }
  },
  "today": "2026-10-07",
  "targets": { "dryKg": 58, "alertGainKg": 2, "alertDays": 3, "fluidMl": 1500, "sodiumMg": 2000, "capMl": 150 },
  "adherence": { "due": 34, "taken": 32, "missed": 2, "pct": 94, "text": "32 of 34" },
  "pillsToday": {
    "all": [ /* DoseStatus[] */ ],
    "morning": [ /* DoseStatus[] */ ],
    "evening": [ /* DoseStatus[] */ ],
    "total": 5,
    "taken": 4,
    "morningTaken": 4,
    "next": { /* DoseStatus */ },
    "nextTime": "8 PM"
  },
  "weightChange": 0.2,
  "vsDry": 0.4,
  "weighStreak": 11,
  "fluidToday": 850,
  "fluidOk": true,
  "sodiumToday": 1600,
  "zone": "green",
  "goodDays": 4,
  "goodStreak": 0,
  "reasons": [],
  "symptomsToday": [],
  "alertsToday": [],
  "questions": [
    "My ankles were swollen on 2 days. Is that a problem?",
    "I feel tired most afternoons. Is it my medicine?",
    "How can I take my water pill when I go out?"
  ]
}
```

**Errors:** `UNAUTHORIZED`, `VALIDATION_ERROR` (bad date format)

### Full example — GET /api/metrics for Mdm Tan on 2026-10-07

This example uses the real values from `@ventra/core` (`mdmTanSeed`) and the metric / rules functions:

```json
{
  "patient": {
    "name": "Mdm Tan",
    "age": 72,
    "condition": "heart failure",
    "family": { "name": "Mei Ling", "relation": "daughter" }
  },
  "today": "2026-10-07",
  "targets": { "dryKg": 58, "alertGainKg": 2, "alertDays": 3, "fluidMl": 1500, "sodiumMg": 2000, "capMl": 150 },
  "adherence": { "due": 34, "taken": 32, "missed": 2, "pct": 94, "text": "32 of 34" },
  "pillsToday": {
    "all": [
      { "med": { "id": "furo", "name": "Water pill", "generic": "Furosemide", "strength": "40 mg", "times": [480], "purpose": "Helps your body get rid of extra water, so you breathe easier and swell less.", "looks": "Small white round tablet", "tile": "#DCE3EC", "round": { "size": 36, "bg": "#FFFFFF", "border": "#C9CED6", "line": "#C9CED6" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "biso", "name": "Heart rate pill", "generic": "Bisoprolol", "strength": "2.5 mg", "times": [480], "purpose": "Keeps your heartbeat slow and steady, so your heart works less hard.", "looks": "Small pale-yellow round tablet", "tile": "#E3E6EC", "round": { "size": 30, "bg": "#F6E7A8", "border": "#D8C277", "line": "#C9B266" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "sv", "name": "Heart helper", "generic": "Sacubitril/Valsartan", "strength": "49/51 mg", "times": [480, 1200], "purpose": "Relaxes your blood vessels so your heart pumps more easily.", "looks": "Light-purple oval tablet", "tile": "#E6E8EE", "oval": { "bg": "#D9C8E6", "border": "#B8A3C9" } }, "time": 480, "index": 0, "of": 2, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "spiro", "name": "Heart protector", "generic": "Spironolactone", "strength": "25 mg", "times": [480], "purpose": "Protects your heart muscle over time and helps remove extra water.", "looks": "Light-brown round tablet", "tile": "#E3E6EC", "round": { "size": 34, "bg": "#EFD8BE", "border": "#CDB08F", "line": "#C2A584" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "sv", "name": "Heart helper", "generic": "Sacubitril/Valsartan", "strength": "49/51 mg", "times": [480, 1200], "purpose": "Relaxes your blood vessels so your heart pumps more easily.", "looks": "Light-purple oval tablet", "tile": "#E6E8EE", "oval": { "bg": "#D9C8E6", "border": "#B8A3C9" } }, "time": 1200, "index": 1, "of": 2, "due": false, "missed": false, "taken": false, "takenAt": null }
    ],
    "morning": [
      { "med": { "id": "furo", "name": "Water pill", "generic": "Furosemide", "strength": "40 mg", "times": [480], "purpose": "Helps your body get rid of extra water, so you breathe easier and swell less.", "looks": "Small white round tablet", "tile": "#DCE3EC", "round": { "size": 36, "bg": "#FFFFFF", "border": "#C9CED6", "line": "#C9CED6" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "biso", "name": "Heart rate pill", "generic": "Bisoprolol", "strength": "2.5 mg", "times": [480], "purpose": "Keeps your heartbeat slow and steady, so your heart works less hard.", "looks": "Small pale-yellow round tablet", "tile": "#E3E6EC", "round": { "size": 30, "bg": "#F6E7A8", "border": "#D8C277", "line": "#C9B266" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "sv", "name": "Heart helper", "generic": "Sacubitril/Valsartan", "strength": "49/51 mg", "times": [480, 1200], "purpose": "Relaxes your blood vessels so your heart pumps more easily.", "looks": "Light-purple oval tablet", "tile": "#E6E8EE", "oval": { "bg": "#D9C8E6", "border": "#B8A3C9" } }, "time": 480, "index": 0, "of": 2, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" },
      { "med": { "id": "spiro", "name": "Heart protector", "generic": "Spironolactone", "strength": "25 mg", "times": [480], "purpose": "Protects your heart muscle over time and helps remove extra water.", "looks": "Light-brown round tablet", "tile": "#E3E6EC", "round": { "size": 34, "bg": "#EFD8BE", "border": "#CDB08F", "line": "#C2A584" } }, "time": 480, "index": 0, "of": 1, "due": true, "missed": false, "taken": true, "takenAt": "8:05 AM" }
    ],
    "evening": [
      { "med": { "id": "sv", "name": "Heart helper", "generic": "Sacubitril/Valsartan", "strength": "49/51 mg", "times": [480, 1200], "purpose": "Relaxes your blood vessels so your heart pumps more easily.", "looks": "Light-purple oval tablet", "tile": "#E6E8EE", "oval": { "bg": "#D9C8E6", "border": "#B8A3C9" } }, "time": 1200, "index": 1, "of": 2, "due": false, "missed": false, "taken": false, "takenAt": null }
    ],
    "total": 5,
    "taken": 4,
    "morningTaken": 4,
    "next": { "med": { "id": "sv", "name": "Heart helper", "generic": "Sacubitril/Valsartan", "strength": "49/51 mg", "times": [480, 1200], "purpose": "Relaxes your blood vessels so your heart pumps more easily.", "looks": "Light-purple oval tablet", "tile": "#E6E8EE", "oval": { "bg": "#D9C8E6", "border": "#B8A3C9" } }, "time": 1200, "index": 1, "of": 2, "due": false, "missed": false, "taken": false, "takenAt": null },
    "nextTime": "8 PM"
  },
  "weightChange": 0.2,
  "vsDry": 0.4,
  "weighStreak": 11,
  "fluidToday": 850,
  "fluidOk": true,
  "sodiumToday": 1600,
  "zone": "green",
  "goodDays": 4,
  "goodStreak": 0,
  "reasons": [],
  "symptomsToday": [],
  "alertsToday": [],
  "questions": [
    "My ankles were swollen on 2 days. Is that a problem?",
    "I feel tired most afternoons. Is it my medicine?",
    "How can I take my water pill when I go out?"
  ]
}
```

---

## Fluid

### GET /api/fluid
Return non-deleted fluid entries for the logged-in patient.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "entries": [
    {
      "id": 1,
      "date": "2026-10-07",
      "time": "3:00 PM",
      "what": "Water",
      "ml": 300
    }
  ]
}
```

**Errors:** `UNAUTHORIZED`

---

### POST /api/fluid
Add a drink entry for today.

**Session required:** Yes

**Request body:**
```json
{
  "what": "Water",
  "ml": 300
}
```

**Success 200:**
```json
{
  "id": 1,
  "date": "2026-10-07",
  "time": "3:00 PM",
  "what": "Water",
  "ml": 300
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### DELETE /api/fluid/last
Undo the most recent fluid entry for the same day only. Soft delete (`deleted_at`); alert rules run after.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "ok": true,
  "deletedId": 1
}
```

**Errors:** `CONFLICT` (last entry is from a previous day), `NOT_FOUND`

---

## Meals

Manual food log (photo scanning is optional and not built). Foods come from `FOODS` in `packages/core/foods.ts`: common Singapore meals with **approximate** sodium per serving. Today's total feeds `sodiumToday` in `GET /api/metrics`.

### GET /api/meals
Today's meals, newest first.

```json
{ "entries": [{ "id": 3, "time": "12:30 PM", "meal": "Lunch", "what": "Chicken rice", "sodiumMg": 1300, "tip": "Ask for less dark sauce and chilli, and skip the soup." }] }
```

---

### POST /api/meals
```json
{ "foodId": "chicken-rice" }
```
The server fills in the nutrition values and names the meal from the Singapore time (Breakfast before 11 AM, Lunch before 4 PM, Dinner from 6 PM, otherwise Snack).

**Success 200:** the new entry (same shape as above) · **Errors:** `VALIDATION_ERROR`, `NOT_FOUND` (unknown food), `UNAUTHORIZED`

---

### DELETE /api/meals/last
Undo the latest meal logged today.

**Success 200:** `{ "ok": true, "deletedId": 3 }` · **Errors:** `NOT_FOUND` (nothing logged today), `UNAUTHORIZED`

---

## Weight

### POST /api/weight
Record today's weight (20–250 kg, rounded to 0.1). One weight per day: weighing again today replaces it. Triggers alert rules after save.

**Session required:** Yes

**Request body:**
```json
{
  "weightKg": 58.4
}
```

**Success 200:**
```json
{
  "id": 1,
  "date": "2026-10-07",
  "weightKg": 58.4
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Doses

### POST /api/doses/confirm
Mark a dose as taken ("I took it"). No update or delete route — taken doses are locked.  
Only today's doses (Singapore date). A dose can be confirmed early (e.g. the evening pill) or late. `medId` and `time` must be on the patient's schedule.

**Session required:** Yes

**Request body:**
```json
{
  "date": "2026-10-07",
  "medId": "furo",
  "time": 480
}
```

**Success 200:**
```json
{
  "ok": true,
  "takenAt": "8:05 AM"
}
```

**Errors:** `VALIDATION_ERROR`, `CONFLICT` (already taken, or not today), `NOT_FOUND` (not on the schedule)

---

## Symptoms

### POST /api/symptoms
Log a symptom. `key`: `ankles` | `tired` | `dizzy` | `breath`; `sev`: `Mild` | `Moderate` | `Severe`. One entry per symptom per day: logging it again updates the severity. Triggers alert rules after save.

**Session required:** Yes

**Request body:**
```json
{
  "key": "ankles",
  "sev": "Mild"
}
```

**Success 200:**
```json
{
  "id": 1,
  "date": "2026-10-07",
  "key": "ankles",
  "sev": "Mild"
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Alerts

Alert rules run in code (`packages/core/rules.ts`) after every write. The first time a day turns yellow an alert is recorded and, because alerts are always shared, the linked family member gets a Telegram message straight away (`familyTold` becomes `true` once it is delivered).

### GET /api/alerts/latest
The yellow alert and nurse script. The day shown is today if today is yellow or has an alert; otherwise the most recent alert day; otherwise today.

**Session required:** Yes

**Success 200:**
```json
{
  "zone": "yellow",
  "date": "2026-10-07",
  "time": "10:30 AM",
  "headline": "Signs of extra fluid in your body",
  "reasons": [
    { "key": "missed", "chip": "Missed water pill (8 AM)" },
    { "key": "fluid", "chip": "Drank 1,750 ml · limit 1,500" },
    { "key": "sym", "chip": "Swollen ankles (mild)" }
  ],
  "script": [
    { "i": 0, "segs": [{ "t": "“Hello, I am ", "b": false }, { "t": "Mdm Tan", "b": true }, { "t": ". I have heart failure.", "b": false }] }
  ],
  "familyTold": true,
  "family": { "name": "Mei Ling", "relation": "daughter" }
}
```
`time` is `null` when the day shown has no alert.

**Errors:** `UNAUTHORIZED`

---

## Voice

### POST /api/voice/transcribe
Upload an audio blob and receive a transcript.

**Session required:** Yes

**Request body:** `multipart/form-data` with an `audio` field (blob).

**Success 200:**
```json
{
  "text": "I drank a cup of tea"
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### POST /api/voice/intent
Parse intent from transcribed text.

**Session required:** Yes

**Request body:**
```json
{
  "text": "I drank a cup of tea"
}
```

**Success 200:**
```json
{
  "intent": "log_fluid",
  "params": { "what": "Tea", "ml": 250 }
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### POST /api/voice/confirm
Confirm and execute a parsed voice intent.

**Session required:** Yes

**Request body:**
```json
{
  "intent": "log_fluid",
  "params": { "what": "Tea", "ml": 250 }
}
```

**Success 200:**
```json
{
  "ok": true,
  "action": "Created fluid entry 250 ml Tea"
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`, `CONFLICT`

---

## TTS

### POST /api/tts
Request a cached MP3 of the given text.

**Session required:** Yes

**Request body:**
```json
{
  "text": "Remember to weigh yourself before breakfast"
}
```

**Success 200:**
```json
{
  "url": "/tts-cache/abc123.mp3"
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Ask AI

### POST /api/ask
Ask the AI a question. Every question and answer passes the code guardrail in `packages/core/src/guardrail.ts`. The response is plain JSON (not a stream), because the full answer must be checked before the patient sees it.

**Session required:** Yes

**Request body:**
```json
{
  "question": "What is bisoprolol for?"
}
```
`question`: 1–2000 characters after trimming. Any `patient_id` in the body is ignored.

**Success 200:**
```json
{
  "reply": "Bisoprolol helps your heart beat slower and more steadily. It eases the heart's workload over time.",
  "kind": "answer",
  "request_id": "6f1c2a4e-0b7d-4f43-9a51-2d8e3c7b9f10"
}
```

| `kind` | When | `reply` | UI |
|---|---|---|---|
| `answer` | AI answered and the answer passed the output check | AI text | Chat bubble |
| `emergency` | Question has emergency words (e.g. "I can't breathe", chest pain) | `Please call 995 now.` | SOS card |
| `dose` | Question asks to skip, stop, change, double or time a medicine | `I can't advise on that. Please ask your pharmacist or doctor.` | Nurse card |
| `unsure` | Answer blocked (dose advice, source wording, too long), AI slow/down/not configured, or question over 500 characters | `I'm not able to answer that confidently. Please check with your pharmacist or doctor.` | Chat bubble |

**Flow:**
1. Session required; body validated with zod.
2. `screenInput`: `emergency` and `dose` questions return the fixed line and never reach the AI. These are never rate limited.
3. Rate limit: 8 AI calls per minute for the whole app (ADP free plan allows 10).
4. ADP is called with the question plus the patient's own numbers for today (`questionWithContext` in `packages/core/context.ts`): drink limit and intake, salt limit and intake, weight and dry weight, cap size. So "How much can I drink today?" gets their real number. Never sent: name, phone, patient id, medicines or dose times. `visitor_biz_id` and `session_id` are HMAC pseudonyms. Only the question itself is saved in `chat_messages`.
5. `screenOutput` checks the answer; blocked answers become the `unsure` line.
6. Question and reply are saved to `chat_messages` with `request_id` and `latency_ms`.

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`, `RATE_LIMITED` (429)

---

## Vision

### POST /api/vision/meal
Upload a meal photo for nutrition analysis.

**Session required:** Yes

**Request body:** `multipart/form-data` with an `image` field.

**Success 200:**
```json
{
  "meal": "Dinner",
  "what": "Steamed fish with rice and vegetables",
  "sodiumMg": 450,
  "kcal": 480,
  "potassiumMg": 720,
  "phosphorusMg": 320,
  "carbs": { "g": 60, "what": "Rice" },
  "protein": { "g": 28, "what": "Fish" },
  "fat": { "g": 10, "what": "Oil" },
  "plate": [0.5, 0.25, 0.25],
  "tip": "Great pick \u2014 steaming keeps the salt low. Skip extra soy sauce."
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### POST /api/vision/medbox
Upload a photo of a medicine box for identification.

**Session required:** Yes

**Request body:** `multipart/form-data` with an `image` field.

**Success 200:**
```json
{
  "medId": "furo",
  "name": "Water pill",
  "confidence": 0.94
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Visits

Clinic visits and tests the patient adds (Calendar). Every query is limited to the session's patient.

### GET /api/visits
Upcoming visits (today onwards), soonest first.

**Success 200:**
```json
{
  "today": "2026-10-07",
  "visits": [
    { "id": 1, "date": "2026-10-13", "time": "10:30 AM", "title": "Heart clinic", "doctor": "Dr Lim", "place": "Level 3, Room 12", "bring": "Medicine list · this phone · IC card" }
  ]
}
```

### POST /api/visits
**Request body:** `{ "date": "2026-10-20", "time": "2:30 PM", "title": "Pharmacy", "doctor": "", "place": "Block 123", "bring": "" }` — `time` as "h:mm AM/PM"; `doctor`, `place`, `bring` optional (empty becomes `null`). Dates before today are rejected.

**Success 200:** the saved visit (same shape as in the list).

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

### DELETE /api/visits/:id
**Success 200:** `{ "ok": true, "deletedId": 3 }`

**Errors:** `NOT_FOUND` (no such visit for this patient), `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Family

Family members get messages on Telegram. Alerts, status and medicines are always shared (locked); weight, drinks and how I feel are the patient's choice. All family text comes from `packages/core/family.ts`, so the in-app preview matches what is sent.

### GET /api/family/settings

**Session required:** Yes

**Success 200:**
```json
{
  "enabled": true,
  "alerts": true,
  "status": true,
  "medicines": true,
  "dailySummary": true,
  "weight": false,
  "drinks": false,
  "symptoms": false,
  "family": { "name": "Mei Ling", "relation": "daughter" },
  "linked": false,
  "linkCode": "K7Q2MX",
  "linkUrl": "https://t.me/VentraCareBot?start=K7Q2MX",
  "sentToday": false,
  "preview": [
    { "key": "alerts", "label": "Alerts", "value": "None today" },
    { "key": "status", "label": "Status", "value": "Green — on track" },
    { "key": "medicines", "label": "Medicines", "value": "4 of 5 taken · 8 PM still to take" }
  ]
}
```
While not linked, a one-time `linkCode` (6 characters, valid 24 hours) is created and reused until it expires. `linkUrl` is set when the bot username is known.

**Errors:** `UNAUTHORIZED`

---

### PUT /api/family/settings
Change the patient's own choices. Locked keys (`alerts`, `status`, `medicines`) are ignored if sent.

**Request body:**
```json
{ "weight": true, "drinks": false, "symptoms": true }
```

**Success 200:** `{ "ok": true }`

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### POST /api/family/telegram/reset
Unlink the family member's Telegram chat (if linked) and drop the old link code. The next `GET /api/family/settings` returns `linked: false` with a fresh 6-character `linkCode` (valid 24 hours) and `linkUrl`. Until the family member links again, alerts, SOS messages and summaries are not sent to them. Any patient, not just the demo.

**Success 200:** `{ "ok": true }`

**Errors:** `UNAUTHORIZED`

---

### POST /api/family/summary/send
Send today's summary now. Once sent, the 10 PM summary is skipped for today.

**Success 200:**
```json
{ "ok": true, "sentAt": "2026-10-07T14:32:00.000Z" }
```

**Errors:** `CONFLICT` (already sent today), `NOT_LINKED` (409, family has not connected Telegram), `UNAVAILABLE` (503, no bot token on the server), `SEND_FAILED` (502), `UNAUTHORIZED`

**Nightly job:** at `FAMILY_SUMMARY_CRON` (default `0 22 * * *`, Asia/Singapore) the server sends today's summary to every linked family member not yet sent today.

---

### POST /api/emergency/notify
Called by the SOS call screen after the 10-second countdown. Messages the linked family member. The 995 call itself is simulated in this prototype.

**Request body:**
```json
{ "what": "Can't breathe" }
```
`what`: `Can't breathe` | `Chest pain` | `Fainted or very dizzy` | `Other emergency`

**Success 200:**
```json
{ "told": true, "family": { "name": "Mei Ling", "relation": "daughter" } }
```
`told` is `true` only if the message was delivered.

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Report

### GET /api/report
The doctor report data, built by `buildReport` in `packages/core/report.ts` from the same functions as Home, Medicine and Track, so the numbers always match. The app renders it as a page that prints or saves as PDF on A4 (browser print).

**Success 200 (shape):**
```json
{
  "patient": { "name": "Mdm Tan", "age": 72, "condition": "heart failure", "family": { "name": "Mei Ling", "relation": "daughter" } },
  "today": "2026-10-07",
  "period": { "from": "2026-10-01", "to": "2026-10-07" },
  "discharge": "2026-09-27",
  "targets": { "dryKg": 58, "alertGainKg": 2, "alertDays": 3, "fluidMl": 1500, "sodiumMg": 2000, "capMl": 150 },
  "weightToday": 58.4,
  "vsDry": 0.4,
  "weightChange": 0.2,
  "adherence": { "due": 34, "taken": 32, "missed": 2, "pct": 94, "text": "32 of 34" },
  "fluidDays": { "ok": 6, "of": 7 },
  "sodiumToday": 1600,
  "yellowDays": ["2026-10-03"],
  "summary": ["Status: 6 green and 1 yellow day (3 Oct).", "…"],
  "days": [{ "date": "2026-10-03", "zone": "yellow", "weightKg": 58.0, "fluid": "1,750 ml · over limit", "fluidOver": true, "medicines": "4 of 5 · missed furosemide", "missed": true, "symptoms": "Swollen ankles (mild)" }],
  "medicines": [{ "name": "Water pill", "generic": "Furosemide", "dose": "40 mg · 8 AM", "taken": 5, "due": 7, "missedDates": ["2026-10-03", "2026-10-06"] }],
  "meals": [{ "time": "12:40 PM", "meal": "Lunch", "what": "Fish soup with noodles", "sodiumMg": 1100, "kcal": 420 }],
  "weights": [{ "date": "2026-09-27", "kg": 59.2 }]
}
```

**Errors:** `UNAUTHORIZED`

---

## Telegram

### POST /api/telegram/webhook
Telegram Bot API updates. Called by Telegram's servers, so no session; instead Telegram must send the `X-Telegram-Bot-Api-Secret-Token` header equal to `TELEGRAM_WEBHOOK_SECRET`.

A message `/start <code>` from the family member's phone links their chat to the patient who showed the code, and the bot replies to confirm. Wrong or expired codes get a short reply; other messages are ignored.

**Request body:** a Telegram `Update`, e.g.
```json
{ "update_id": 1, "message": { "message_id": 1, "chat": { "id": 123456789, "type": "private" }, "text": "/start K7Q2MX" } }
```

**Success 200:** `{ "ok": true }` (always, so Telegram does not retry)

**Errors:** `UNAUTHORIZED` (missing or wrong secret header)

The production server registers this webhook on start when `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and an `https://` `PUBLIC_URL` are set.

---

## UI Flags

### GET /api/ui-flags
Fetch all UI flags for the patient (e.g. "motivationNoteSeen").

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "motivationNoteSeen": "2026-10-07"
}
```

**Errors:** `UNAUTHORIZED`

---

### PUT /api/ui-flags
Set a UI flag.

**Session required:** Yes

**Request body:**
```json
{
  "key": "motivationNoteSeen",
  "value": "2026-10-07"
}
```

**Success 200:**
```json
{ "ok": true }
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

## Demo

Only the demo patient (`is_demo`) can use these; anyone else gets `FORBIDDEN`. Both rebuild Mdm Tan's synthetic data in place with her history ending today. The caller stays logged in and the family's Telegram link is kept.

### POST /api/demo/reset
Back to the normal green demo day.

**Success 200:** `{ "ok": true }`

**Errors:** `UNAUTHORIZED`, `FORBIDDEN`

### POST /api/demo/yellow-day
Same history, but today's water pill is recorded as missed. Logging drinks past the limit or swollen ankles then turns the day yellow and alerts the family.

**Success 200:** `{ "ok": true }`

**Errors:** `UNAUTHORIZED`, `FORBIDDEN`

---

## Mock-data note for frontend development

Until an endpoint is implemented, the frontend can fake it with the seed fixture exported by `@ventra/core`. `GET /api/metrics` uses the same builder, so mock and real numbers match:

```ts
import { buildMetrics, mdmTanSeed } from '@ventra/core';

const metrics = buildMetrics(mdmTanSeed); // Mdm Tan on 2026-10-07 at 9:41 AM
```

All numbers in the example `GET /api/metrics` response above come from this call.
