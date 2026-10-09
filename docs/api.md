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
  "is_demo": true
}
```

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

All onboarding routes save one setup step for the logged-in patient.

### PUT /api/onboarding/profile

**Session required:** Yes

**Request body:**
```json
{
  "name": "string",
  "age": 72,
  "condition": "string",
  "dischargeDate": "2026-09-27",
  "dischargeWeightKg": 59.2,
  "textSize": "string",
  "weighTime": "7:10 AM"
}
```

**Success 200:**
```json
{ "ok": true }
```

---

### PUT /api/onboarding/targets

**Session required:** Yes

**Request body:**
```json
{
  "dryKg": 58.0,
  "alertGainKg": 2.0,
  "alertDays": 3,
  "fluidMl": 1500,
  "sodiumMg": 2000,
  "capMl": 150
}
```

**Success 200:**
```json
{ "ok": true }
```

---

### PUT /api/onboarding/medications

**Session required:** Yes

**Request body:**
```json
{
  "meds": [
    {
      "id": "furo",
      "name": "Water pill",
      "generic": "Furosemide",
      "strength": "40 mg",
      "times": [480],
      "purpose": "Helps your body get rid of extra water...",
      "looks": "Small white round tablet",
      "tile": "#DCE3EC",
      "round": { "size": 36, "bg": "#FFFFFF", "border": "#C9CED6", "line": "#C9CED6" }
    }
  ]
}
```

**Success 200:**
```json
{ "ok": true }
```

---

### PUT /api/onboarding/cap

**Session required:** Yes

**Request body:**
```json
{
  "capMl": 150
}
```

**Success 200:**
```json
{ "ok": true }
```

---

### PUT /api/onboarding/contact

**Session required:** Yes

**Request body:**
```json
{
  "name": "Mei Ling",
  "relation": "daughter",
  "phone": "+65xxxx"
}
```

**Success 200:**
```json
{ "ok": true }
```

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

### POST /api/meals
Log a meal after vision confirmation.

**Session required:** Yes

**Request body:**
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
  "tip": "Great pick — steaming keeps the salt low. Skip extra soy sauce."
}
```

**Success 200:**
```json
{
  "id": 1,
  "date": "2026-10-07",
  "time": "6:30 PM",
  "meal": "Dinner",
  "what": "Steamed fish with rice and vegetables",
  "sodiumMg": 450,
  "kcal": 480,
  "potassiumMg": 720,
  "phosphorusMg": 320,
  "carbsJson": "{\"g\":60,\"what\":\"Rice\"}",
  "proteinJson": "{\"g\":28,\"what\":\"Fish\"}",
  "fatJson": "{\"g\":10,\"what\":\"Oil\"}",
  "plateJson": "[0.5,0.25,0.25]",
  "tip": "Great pick — steaming keeps the salt low. Skip extra soy sauce."
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### DELETE /api/meals/last
Undo the most recent meal entry.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "ok": true,
  "deletedId": 1
}
```

**Errors:** `NOT_FOUND`

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

### GET /api/alerts/latest
Returns the latest alert with reasons and nurse script.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "zone": "yellow",
  "reasons": [
    { "key": "weight", "chip": "Weight up 2.1 kg in 3 days" },
    { "key": "missed", "chip": "Missed water pill (8:00 AM)" },
    { "key": "fluid", "chip": "Drank 1,750 ml \u00b7 limit 1,500" },
    { "key": "sym", "chip": "Swollen ankles (mild)" }
  ],
  "script": [
    { "i": 0, "segs": [{ "t": "\u201cHello, I am ", "b": false }, { "t": "Mdm Tan", "b": true }, { "t": ". I have heart failure.", "b": false }] },
    { "i": 1, "segs": [{ "t": "My weight went up from ", "b": false }, { "t": "58.0 kg to 60.1 kg", "b": true }, { "t": " in 3 days.", "b": false }] },
    { "i": 2, "segs": [{ "t": "I have ", "b": false }, { "t": "swollen ankles", "b": true }, { "t": " (mild).", "b": false }] },
    { "i": 3, "segs": [{ "t": "I drank ", "b": false }, { "t": "1,750 ml", "b": true }, { "t": " today. My limit is 1,500 ml.", "b": false }] },
    { "i": 4, "segs": [{ "t": "I missed my ", "b": false }, { "t": "water pill (furosemide 40 mg)", "b": true }, { "t": " at 8:00 AM. I took my other medicines.\u201d", "b": false }] }
  ]
}
```

**Errors:** `UNAUTHORIZED`, `NOT_FOUND` (no alerts yet)

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
4. ADP is called with the question only. `visitor_biz_id` and `session_id` are HMAC pseudonyms; no name, phone or patient id is sent.
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

## Family

### GET /api/family/settings

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "enabled": true,
  "alerts": true,
  "status": true,
  "medicines": true,
  "dailySummary": true
}
```

**Errors:** `UNAUTHORIZED`

---

### PUT /api/family/settings
Update family-sharing settings. Locked keys (`alerts`, `status`, `medicines`) are ignored on PUT.

**Session required:** Yes

**Request body:**
```json
{
  "enabled": true
}
```

**Success 200:**
```json
{ "ok": true }
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED`

---

### POST /api/family/summary/send
Manually send the daily family summary and mark today as sent.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{
  "ok": true,
  "sentAt": "2026-10-07T14:32:00.000Z"
}
```

**Errors:** `CONFLICT` (already sent today), `UNAUTHORIZED`

---

## Report

### GET /api/report.pdf
Download the patient's PDF report.

**Session required:** Yes

**Request body:** none

**Success 200:** `application/pdf` binary stream.

**Errors:** `UNAUTHORIZED`, `NOT_FOUND`

---

### POST /api/report/send
Email or send the PDF report to the configured family contact.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{ "ok": true }
```

**Errors:** `UNAUTHORIZED`, `NOT_FOUND` (no contact configured)

---

## Telegram

### POST /api/telegram/webhook
Handle Telegram bot updates. A `/start <code>` message links a family contact to the patient.

**Session required:** No (called by Telegram servers)

**Request body:**
```json
{
  "code": "abc123",
  "chatId": 123456789
}
```

**Success 200:**
```json
{ "ok": true }
```

**Errors:** `VALIDATION_ERROR`, `NOT_FOUND` (code invalid or expired)

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

### POST /api/demo/reset
Reset the demo patient (`Mdm Tan`) to the seed fixture state.

**Session required:** Yes

**Request body:** none

**Success 200:**
```json
{ "ok": true }
```

**Errors:** `UNAUTHORIZED`, `FORBIDDEN` (caller is not the demo patient)

---

## Mock-data note for frontend development

Until an endpoint is implemented, the frontend can fake it with the seed fixture exported by `@ventra/core`. `GET /api/metrics` uses the same builder, so mock and real numbers match:

```ts
import { buildMetrics, mdmTanSeed } from '@ventra/core';

const metrics = buildMetrics(mdmTanSeed); // Mdm Tan on 2026-10-07 at 9:41 AM
```

All numbers in the example `GET /api/metrics` response above come from this call.
