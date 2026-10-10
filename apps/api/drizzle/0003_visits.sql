CREATE TABLE `visits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`title` text NOT NULL,
	`doctor` text,
	`place` text,
	`bring` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `visits_patient_id_idx` ON `visits` (`patient_id`);