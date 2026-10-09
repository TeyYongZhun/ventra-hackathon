import type {
  IsoDate,
  PatientInfo,
  Targets,
  Medicine,
  MealLog,
  DrinkLog,
  SymptomKey,
  SymptomLog,
  AlertLog,
  DoseStatus,
  AdherenceSummary,
  PillsTodaySummary,
  Reason,
  ScriptLine,
} from './record.js';
import type { AlertZone } from './rules.js';

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
  age: number;
  condition: string;
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
export interface OnboardingProfileRequest {
  name: string;
  age: number;
  condition: string;
  dischargeDate?: string;
  dischargeWeightKg?: number;
  textSize?: string;
  weighTime?: string;
}

export interface OnboardingTargetsRequest {
  dryKg: number;
  alertGainKg: number;
  alertDays: number;
  fluidMl: number;
  sodiumMg: number;
  capMl: number;
}

export interface OnboardingMedicationsRequest {
  meds: Medicine[];
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
  adherence: AdherenceSummary;
  pillsToday: PillsTodaySummary;
  weightChange: number | null;
  vsDry: number | null;
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
export interface MealCreateRequest {
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
export interface AlertsLatestResponse {
  zone: AlertZone;
  reasons: Reason[];
  script: ScriptLine[];
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
// AI Chat
// ------------------------------------------------------------------
export interface AiChatRequest {
  mode: 'general' | 'medicine';
  text: string;
}

// Response is SSE — no JSON response type.

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
export interface FamilySettingsResponse {
  enabled: boolean;
  alerts: boolean;
  status: boolean;
  medicines: boolean;
  dailySummary: boolean;
}

export interface FamilySettingsUpdateRequest {
  enabled?: boolean;
}

export interface FamilySettingsUpdateResponse {
  ok: true;
}

export interface FamilySummarySendResponse {
  ok: true;
  sentAt: string;
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
