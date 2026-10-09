ALTER TABLE `contacts` ADD `telegram_chat_id` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `link_code` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `link_code_expires_at` text;--> statement-breakpoint
ALTER TABLE `share_settings` ADD `weight` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `share_settings` ADD `drinks` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `share_settings` ADD `symptoms` integer DEFAULT false NOT NULL;