import type {
  IsoDate,
  PatientInfo,
  Targets,
  SymptomKey,
  SymptomLog,
  AlertLog,
  AdherenceSummary,
  PillsTodaySummary,
  Reason,
  ScriptLine,
} from './record.js';
import type { AlertZone } from './rules.js';
import type { SummaryLine } from './family.js';

// ------------------------------------------------------------------
// Standard error shape
// ------------------------------------------------------------------
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
export interface SignupRequest {
  phone: string;
  pin: string;
  name: string;
}

export interface MeResponse {
  name: string;
  is_demo: boolean;
  // 'large' | 'xl' | null (not chosen yet)
  text_size: string | null;
  // False until the set-up steps are done (targets saved)
  set_up: boolean;
}

export interface SignupResponse {
  ok: true;
  patientId: number;
}

export interface LoginRequest {
  phone: string;
  pin: string;
}

export interface LoginResponse {
  ok: true;
}

export interface LogoutResponse {
  ok: true;
}

// ------------------------------------------------------------------
// Onboarding
// ------------------------------------------------------------------
// Partial update: send only what changed.
export interface OnboardingProfileRequest {
  name?: string;
  age?: number;
  condition?: string;
  dischargeDate?: string;
  textSize?: 'large' | 'xl';
}

export interface OnboardingTargetsRequest {
  dryKg: number;
  alertGainKg: number;
  alertDays: number;
  fluidMl: number;
  sodiumMg: number;
  // Optional here; usually set in its own step (PUT /api/onboarding/cap)
  capMl?: number;
}

// Medicines picked from MEDICINE_CATALOG, each with its times (minutes after midnight).
// Replaces the patient's list.
export interface OnboardingMedicationsRequest {
  meds: Array<{ id: string; times: number[] }>;
}

export interface OnboardingCapRequest {
  capMl: number;
}

export interface OnboardingContactRequest {
  name: string;
  relation: string;
  phone?: string;
}

export interface OnboardingResponse {
  ok: true;
}

// ------------------------------------------------------------------
// Metrics
// ------------------------------------------------------------------
export interface MetricsResponse {
  patient: PatientInfo;
  today: IsoDate;
  targets: Targets;
  adherence: AdherenceSummary;
  pillsToday: PillsTodaySummary;
  weightChange: number | null;
  vsDry: number | null;
  weightToday: number | null;
  weightChange1: number | null;
  // Every logged morning weight since discharge (or the first one), oldest first
  weightHistory: Array<{ date: IsoDate; kg: number }>;
  weighStreak: number;
  fluidToday: number;
  fluidOk: boolean;
  sodiumToday: number;
  zone: AlertZone;
  goodDays: number;
  goodStreak: number;
  reasons: Reason[];
  symptomsToday: SymptomLog[];
  alertsToday: AlertLog[];
  questions: string[];
}

// ------------------------------------------------------------------
// Fluid
// ------------------------------------------------------------------
export interface FluidCreateRequest {
  what: string;
  ml: number;
}

export interface FluidEntryResponse {
  id: number;
  date: IsoDate;
  time: string;
  what: string;
  ml: number;
}

export interface FluidDeleteResponse {
  ok: true;
  deletedId: number;
}

// ------------------------------------------------------------------
// Meals
// ------------------------------------------------------------------
// Manual food log: pick a food from FOODS (packages/core/foods.ts). The server fills in the
// nutrition values and the meal name (Breakfast/Lunch/Dinner/Snack) from the time.
export interface MealCreateRequest {
  foodId: string;
}

export interface MealListEntry {
  id: number;
  time: string;
  meal: string;
  what: string;
  sodiumMg: number;
  tip: string;
}

export interface MealListResponse {
  entries: MealListEntry[];
}

export interface MealEntryResponse {
  id: number;
  date: IsoDate;
  time: string;
  meal: string;
  what: string;
  sodiumMg: number;
  kcal: number;
  potassiumMg: number;
  phosphorusMg: number;
  carbsJson: string;
  proteinJson: string;
  fatJson: string;
  plateJson: string;
  tip: string;
}

export interface MealDeleteResponse {
  ok: true;
  deletedId: number;
}

// ------------------------------------------------------------------
// Weight
// ------------------------------------------------------------------
export interface WeightCreateRequest {
  weightKg: number;
}

export interface WeightEntryResponse {
  id: number;
  date: IsoDate;
  weightKg: number;
}

// ------------------------------------------------------------------
// Doses
// ------------------------------------------------------------------
export interface DoseConfirmRequest {
  date: IsoDate;
  medId: string;
  time: number;
}

export interface DoseConfirmResponse {
  ok: true;
  takenAt: string;
}

// ------------------------------------------------------------------
// Symptoms
// ------------------------------------------------------------------
export interface SymptomCreateRequest {
  key: SymptomKey;
  sev: string;
}

export interface SymptomEntryResponse {
  id: number;
  date: IsoDate;
  key: SymptomKey;
  sev: string;
}

// ------------------------------------------------------------------
// Alerts
// ------------------------------------------------------------------
// The day the nurse script is about: today if today has an alert or is yellow,
// otherwise the most recent alert day, otherwise today.
export interface AlertsLatestResponse {
  zone: AlertZone;
  date: IsoDate;
  // Time the alert was raised; null when that day has no alert
  time: string | null;
  headline: string;
  reasons: Reason[];
  script: ScriptLine[];
  familyTold: boolean;
  family: { name: string; relation: string };
}

// ------------------------------------------------------------------
// Voice
// ------------------------------------------------------------------
export interface VoiceTranscribeResponse {
  text: string;
}

export interface VoiceIntentRequest {
  text: string;
}

export interface VoiceIntentResponse {
  intent: string;
  params?: Record<string, unknown>;
}

export interface VoiceConfirmRequest {
  intent: string;
  params?: Record<string, unknown>;
}

export interface VoiceConfirmResponse {
  ok: true;
  action: string;
}

// ------------------------------------------------------------------
// TTS
// ------------------------------------------------------------------
export interface TtsRequest {
  text: string;
}

export interface TtsResponse {
  url: string;
}

// ------------------------------------------------------------------
// Ask AI
// ------------------------------------------------------------------
export interface AskRequest {
  question: string;
}

// answer: checked AI answer · emergency: 995 line (show SOS card)
// dose: refuse line (show nurse card) · unsure: fallback line
export type AskReplyKind = 'answer' | 'emergency' | 'dose' | 'unsure';

export interface AskResponse {
  reply: string;
  kind: AskReplyKind;
  request_id: string;
}

// ------------------------------------------------------------------
// Vision
// ------------------------------------------------------------------
export interface VisionMealResponse {
  meal: string;
  what: string;
  sodiumMg: number;
  kcal: number;
  potassiumMg: number;
  phosphorusMg: number;
  carbs: { g: number; what: string };
  protein: { g: number; what: string };
  fat: { g: number; what: string };
  plate: [number, number, number];
  tip: string;
}

export interface VisionMedboxResponse {
  medId?: string;
  name?: string;
  confidence: number;
}

// ------------------------------------------------------------------
// Family
// ------------------------------------------------------------------
// alerts, status, medicines and dailySummary are always true (locked for safety).
export interface FamilySettingsResponse {
  enabled: boolean;
  alerts: boolean;
  status: boolean;
  medicines: boolean;
  dailySummary: boolean;
  weight: boolean;
  drinks: boolean;
  symptoms: boolean;
  family: { name: string; relation: string } | null;
  // Telegram link state. linkCode/linkUrl are only set while not linked.
  linked: boolean;
  linkCode: string | null;
  linkUrl: string | null;
  sentToday: boolean;
  preview: SummaryLine[];
}

// Locked keys (alerts, status, medicines) are ignored if sent.
export interface FamilySettingsUpdateRequest {
  weight?: boolean;
  drinks?: boolean;
  symptoms?: boolean;
}

export interface FamilySettingsUpdateResponse {
  ok: true;
}

export interface FamilySummarySendResponse {
  ok: true;
  sentAt: string;
}

// POST /api/emergency/notify { what }: told is true only if the family message was delivered.
export type EmergencyWhat = "Can't breathe" | 'Chest pain' | 'Fainted or very dizzy' | 'Other emergency';

export interface EmergencyNotifyRequest {
  what: EmergencyWhat;
}

export interface EmergencyNotifyResponse {
  told: boolean;
  family: { name: string; relation: string } | null;
}

// ------------------------------------------------------------------
// Report
// ------------------------------------------------------------------
export interface ReportSendResponse {
  ok: true;
}

// ------------------------------------------------------------------
// Telegram
// ------------------------------------------------------------------
export interface TelegramWebhookRequest {
  code: string;
  chatId: number;
}

export interface TelegramWebhookResponse {
  ok: true;
}

// ------------------------------------------------------------------
// UI Flags
// ------------------------------------------------------------------
export type UiFlagsResponse = Record<string, string>;

export interface UiFlagsUpdateRequest {
  key: string;
  value: string;
}

export interface UiFlagsUpdateResponse {
  ok: true;
}

// ------------------------------------------------------------------
// Demo
// ------------------------------------------------------------------
export interface DemoResetResponse {
  ok: true;
}
