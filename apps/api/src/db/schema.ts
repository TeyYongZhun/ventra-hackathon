import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

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
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  token: text('token').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
}, (table) => [
  index('sessions_patient_id_idx').on(table.patientId),
]);

export const careTargets = sqliteTable('care_targets', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  dryKg: real('dry_kg').notNull(),
  alertGainKg: real('alert_gain_kg').notNull(),
  alertDays: integer('alert_days').notNull(),
  fluidMl: integer('fluid_ml').notNull(),
  sodiumMg: integer('sodium_mg').notNull(),
  capMl: integer('cap_ml').notNull(),
}, (table) => [
  index('care_targets_patient_id_idx').on(table.patientId),
]);

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
}, (table) => [
  index('medications_patient_id_idx').on(table.patientId),
]);

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
}, (table) => [
  index('dose_events_patient_id_idx').on(table.patientId),
]);

export const weights = sqliteTable('weights', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  weightKg: real('weight_kg').notNull(),
}, (table) => [
  index('weights_patient_id_idx').on(table.patientId),
]);

export const fluidEntries = sqliteTable('fluid_entries', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  what: text('what').notNull(),
  ml: integer('ml').notNull(),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('fluid_entries_patient_id_idx').on(table.patientId),
]);

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
}, (table) => [
  index('meals_patient_id_idx').on(table.patientId),
]);

export const symptoms = sqliteTable('symptoms', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  key: text('key').notNull(),
  sev: text('sev').notNull(),
}, (table) => [
  index('symptoms_patient_id_idx').on(table.patientId),
]);

export const alerts = sqliteTable('alerts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  zone: text('zone').notNull(),
  familyTold: integer('family_told', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('alerts_patient_id_idx').on(table.patientId),
]);

export const contacts = sqliteTable('contacts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  name: text('name').notNull(),
  relation: text('relation').notNull(),
  phone: text('phone'),
}, (table) => [
  index('contacts_patient_id_idx').on(table.patientId),
]);

export const shareSettings = sqliteTable('share_settings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  index('share_settings_patient_id_idx').on(table.patientId),
]);

export const summaries = sqliteTable('summaries', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  date: text('date').notNull(),
  sentAt: text('sent_at'),
}, (table) => [
  index('summaries_patient_id_idx').on(table.patientId),
]);

export const uiFlags = sqliteTable('ui_flags', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, (table) => [
  index('ui_flags_patient_id_idx').on(table.patientId),
]);

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('chat_messages_patient_id_idx').on(table.patientId),
]);
