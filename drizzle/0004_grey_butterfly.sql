CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'github' NOT NULL,
	`limit` integer NOT NULL,
	`remaining` integer NOT NULL,
	`used` integer NOT NULL,
	`reset` integer NOT NULL,
	`retry_after` integer,
	`status` text DEFAULT 'ok' NOT NULL,
	`last_checked` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_user_provider` ON `rate_limits` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `idx_rate_limits_status` ON `rate_limits` (`status`);