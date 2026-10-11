CREATE TABLE `meal_photos` (
	`meal_id` integer PRIMARY KEY NOT NULL,
	`patient_id` integer NOT NULL,
	`photo` blob NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meal_scans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`photo` blob NOT NULL,
	`estimate_json` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `meal_photos_patient_id_idx` ON `meal_photos` (`patient_id`);--> statement-breakpoint
CREATE INDEX `meal_scans_patient_id_idx` ON `meal_scans` (`patient_id`);