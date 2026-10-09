CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`zone` text NOT NULL,
	`family_told` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`dry_kg` real NOT NULL,
	`alert_gain_kg` real NOT NULL,
	`alert_days` integer NOT NULL,
	`fluid_ml` integer NOT NULL,
	`sodium_mg` integer NOT NULL,
	`cap_ml` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`name` text NOT NULL,
	`relation` text NOT NULL,
	`phone` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dose_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`med_id` text NOT NULL,
	`time` integer NOT NULL,
	`status` text NOT NULL,
	`taken_at` text,
	`why` text,
	`locked` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fluid_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`what` text NOT NULL,
	`ml` integer NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`meal` text NOT NULL,
	`what` text NOT NULL,
	`sodium_mg` integer NOT NULL,
	`kcal` integer NOT NULL,
	`potassium_mg` integer NOT NULL,
	`phosphorus_mg` integer NOT NULL,
	`carbs_json` text NOT NULL,
	`protein_json` text NOT NULL,
	`fat_json` text NOT NULL,
	`plate_json` text NOT NULL,
	`tip` text NOT NULL,
	`is_demo_scan` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`med_id` text NOT NULL,
	`name` text NOT NULL,
	`generic` text NOT NULL,
	`strength` text NOT NULL,
	`times` text NOT NULL,
	`purpose` text NOT NULL,
	`looks` text NOT NULL,
	`tile` text,
	`round` text,
	`oval` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`pin_hash` text NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`condition` text NOT NULL,
	`discharge_date` text,
	`discharge_weight_kg` real,
	`text_size` text,
	`weigh_time` text,
	`is_demo` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `share_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `symptoms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`key` text NOT NULL,
	`sev` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ui_flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `alerts_patient_id_idx` ON `alerts` (`patient_id`);--> statement-breakpoint
CREATE INDEX `care_targets_patient_id_idx` ON `care_targets` (`patient_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_patient_id_idx` ON `chat_messages` (`patient_id`);--> statement-breakpoint
CREATE INDEX `contacts_patient_id_idx` ON `contacts` (`patient_id`);--> statement-breakpoint
CREATE INDEX `dose_events_patient_id_idx` ON `dose_events` (`patient_id`);--> statement-breakpoint
CREATE INDEX `fluid_entries_patient_id_idx` ON `fluid_entries` (`patient_id`);--> statement-breakpoint
CREATE INDEX `meals_patient_id_idx` ON `meals` (`patient_id`);--> statement-breakpoint
CREATE INDEX `medications_patient_id_idx` ON `medications` (`patient_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `patients_phone_unique` ON `patients` (`phone`);--> statement-breakpoint
CREATE INDEX `sessions_patient_id_idx` ON `sessions` (`patient_id`);--> statement-breakpoint
CREATE INDEX `share_settings_patient_id_idx` ON `share_settings` (`patient_id`);--> statement-breakpoint
CREATE INDEX `summaries_patient_id_idx` ON `summaries` (`patient_id`);--> statement-breakpoint
CREATE INDEX `symptoms_patient_id_idx` ON `symptoms` (`patient_id`);--> statement-breakpoint
CREATE INDEX `ui_flags_patient_id_idx` ON `ui_flags` (`patient_id`);--> statement-breakpoint
CREATE INDEX `weights_patient_id_idx` ON `weights` (`patient_id`);