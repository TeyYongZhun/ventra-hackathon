CREATE TABLE `visit_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`question` text NOT NULL,
	`asked` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `visit_questions_patient_id_idx` ON `visit_questions` (`patient_id`);