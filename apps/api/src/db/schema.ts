import { sqliteTable, integer, text, real, index, blob } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  condition: text('condition').notNull(),
  dischargeDate: text('discharge_date'),
  dischargeWeightKg: real('discharge_weight_kg'),
  textSize: text('text_size'),
  weighTime: text('weigh_time'),
  // Weigh-ins before this date (YYYY-MM-DD) are ignored: set when the patient restarts their
  // weight history after a big dry-weight change (My details → My numbers). Null = use all.
  weightSince: text('weight_since'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  token: text('token').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
}, (table) => ({
  patientIdIdx: index('sessions_patient_id_idx').on(table.patientId),
}));

export const careTargets = sqliteTable('care_targets', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  dryKg: real('dry_kg').notNull(),
  alertGainKg: real('alert_gain_kg').notNull(),
  alertDays: integer('alert_days').notNull(),
  fluidMl: integer('fluid_ml').notNull(),
  sodiumMg: integer('sodium_mg').notNull(),
  capMl: integer('cap_ml').notNull(),
  // When the drink or salt limit changes, the old limit still applies on the day of the change
  // and before it (so a mid-day change doesn't turn today, or past days, yellow).
  fluidBeforeMl: integer('fluid_before_ml'),
  fluidChangedOn: text('fluid_changed_on'),
  sodiumBeforeMg: integer('sodium_before_mg'),
  sodiumChangedOn: text('sodium_changed_on'),
}, (table) => ({
  patientIdIdx: index('care_targets_patient_id_idx').on(table.patientId),
}));

export const medications = sqliteTable('medications', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  medId: text('med_id').notNull(),
  name: text('name').notNull(),
  generic: text('generic').notNull(),
  strength: text('strength').notNull(),
  times: text('times').notNull(),
  purpose: text('purpose').notNull(),
  looks: text('looks').notNull(),
  tile: text('tile'),
  round: text('round'),
  oval: text('oval'),
}, (table) => ({
  patientIdIdx: index('medications_patient_id_idx').on(table.patientId),
}));

export const doseEvents = sqliteTable('dose_events', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  medId: text('med_id').notNull(),
  time: integer('time').notNull(),
  status: text('status').notNull(),
  takenAt: text('taken_at'),
  why: text('why'),
  locked: integer('locked', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  patientIdIdx: index('dose_events_patient_id_idx').on(table.patientId),
}));

export const weights = sqliteTable('weights', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  weightKg: real('weight_kg').notNull(),
}, (table) => ({
  patientIdIdx: index('weights_patient_id_idx').on(table.patientId),
}));

export const fluidEntries = sqliteTable('fluid_entries', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  what: text('what').notNull(),
  ml: integer('ml').notNull(),
  deletedAt: text('deleted_at'),
  // Soup or a drink logged with a scanned meal: undoing the meal removes it too.
  mealId: integer('meal_id'),
}, (table) => ({
  patientIdIdx: index('fluid_entries_patient_id_idx').on(table.patientId),
}));

export const meals = sqliteTable('meals', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  meal: text('meal').notNull(),
  what: text('what').notNull(),
  sodiumMg: integer('sodium_mg').notNull(),
  kcal: integer('kcal').notNull(),
  potassiumMg: integer('potassium_mg').notNull(),
  phosphorusMg: integer('phosphorus_mg').notNull(),
  carbsJson: text('carbs_json').notNull(),
  proteinJson: text('protein_json').notNull(),
  fatJson: text('fat_json').notNull(),
  plateJson: text('plate_json').notNull(),
  tip: text('tip').notNull(),
  isDemoScan: integer('is_demo_scan', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  patientIdIdx: index('meals_patient_id_idx').on(table.patientId),
}));

// Photo of a meal logged from "Scan my meal" (JPEG, resized by the app). Shown on its card.
export const mealPhotos = sqliteTable('meal_photos', {
  mealId: integer('meal_id').primaryKey().references(() => meals.id),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  photo: blob('photo', { mode: 'buffer' }).notNull(),
}, (table) => ({
  patientIdIdx: index('meal_photos_patient_id_idx').on(table.patientId),
}));

// A meal photo just checked by the AI, waiting for "Yes, log it". Logging it moves the photo
// to meal_photos; a new scan replaces the patient's older ones, so unlogged photos don't pile up.
export const mealScans = sqliteTable('meal_scans', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  createdAt: text('created_at').notNull(),
  photo: blob('photo', { mode: 'buffer' }).notNull(),
  estimateJson: text('estimate_json').notNull(),
}, (table) => ({
  patientIdIdx: index('meal_scans_patient_id_idx').on(table.patientId),
}));

export const symptoms = sqliteTable('symptoms', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  key: text('key').notNull(),
  sev: text('sev').notNull(),
}, (table) => ({
  patientIdIdx: index('symptoms_patient_id_idx').on(table.patientId),
}));

export const alerts = sqliteTable('alerts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  zone: text('zone').notNull(),
  familyTold: integer('family_told', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  patientIdIdx: index('alerts_patient_id_idx').on(table.patientId),
}));

export const contacts = sqliteTable('contacts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  name: text('name').notNull(),
  relation: text('relation').notNull(),
  phone: text('phone'),
  // Set when the family member sends /start <code> to the Telegram bot.
  telegramChatId: text('telegram_chat_id'),
  // One-time code shown in the app; cleared once used.
  linkCode: text('link_code'),
  linkCodeExpiresAt: text('link_code_expires_at'),
}, (table) => ({
  patientIdIdx: index('contacts_patient_id_idx').on(table.patientId),
}));

// Alerts, status and medicines are always shared (not stored); these three are the patient's choice.
export const shareSettings = sqliteTable('share_settings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  weight: integer('weight', { mode: 'boolean' }).notNull().default(false),
  drinks: integer('drinks', { mode: 'boolean' }).notNull().default(false),
  symptoms: integer('symptoms', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  patientIdIdx: index('share_settings_patient_id_idx').on(table.patientId),
}));

export const summaries = sqliteTable('summaries', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  sentAt: text('sent_at'),
}, (table) => ({
  patientIdIdx: index('summaries_patient_id_idx').on(table.patientId),
}));

export const uiFlags = sqliteTable('ui_flags', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, (table) => ({
  patientIdIdx: index('ui_flags_patient_id_idx').on(table.patientId),
}));

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
  requestId: text('request_id'),
  latencyMs: integer('latency_ms'),
}, (table) => ({
  patientIdIdx: index('chat_messages_patient_id_idx').on(table.patientId),
}));

// Clinic visits and tests the patient adds (Calendar: "Add a visit"). Date YYYY-MM-DD,
// time as shown ("10:30 AM"); doctor, place and what to bring are optional.
export const visits = sqliteTable('visits', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  title: text('title').notNull(),
  doctor: text('doctor'),
  place: text('place'),
  bring: text('bring'),
}, (table) => ({
  patientIdIdx: index('visits_patient_id_idx').on(table.patientId),
}));

// Questions for the next doctor visit, added when the AI decides something the patient asked in
// Ask AI needs their own doctor to explain. Shown on Visit prep; the patient can remove them.
export const visitQuestions = sqliteTable('visit_questions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  createdAt: text('created_at').notNull(),
  // The question as the patient will ask it, e.g. "Can I take my water pill later when I go out?"
  question: text('question').notNull(),
  // What they typed in Ask AI
  asked: text('asked').notNull(),
}, (table) => ({
  patientIdIdx: index('visit_questions_patient_id_idx').on(table.patientId),
}));
