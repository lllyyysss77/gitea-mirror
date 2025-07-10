CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_user_id` text,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_account_id` ON `accounts` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_provider` ON `accounts` (`provider_id`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `configs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`github_config` text NOT NULL,
	`gitea_config` text NOT NULL,
	`include` text DEFAULT '["*"]' NOT NULL,
	`exclude` text DEFAULT '[]' NOT NULL,
	`schedule_config` text NOT NULL,
	`cleanup_config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`payload` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_events_user_channel` ON `events` (`user_id`,`channel`);--> statement-breakpoint
CREATE INDEX `idx_events_created_at` ON `events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_events_read` ON `events` (`read`);--> statement-breakpoint
CREATE TABLE `mirror_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`repository_id` text,
	`repository_name` text,
	`organization_id` text,
	`organization_name` text,
	`details` text,
	`status` text DEFAULT 'imported' NOT NULL,
	`message` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`job_type` text DEFAULT 'mirror' NOT NULL,
	`batch_id` text,
	`total_items` integer,
	`completed_items` integer DEFAULT 0,
	`item_ids` text,
	`completed_item_ids` text DEFAULT '[]',
	`in_progress` integer DEFAULT false NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`last_checkpoint` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mirror_jobs_user_id` ON `mirror_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mirror_jobs_batch_id` ON `mirror_jobs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_mirror_jobs_in_progress` ON `mirror_jobs` (`in_progress`);--> statement-breakpoint
CREATE INDEX `idx_mirror_jobs_job_type` ON `mirror_jobs` (`job_type`);--> statement-breakpoint
CREATE INDEX `idx_mirror_jobs_timestamp` ON `mirror_jobs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text NOT NULL,
	`membership_role` text DEFAULT 'member' NOT NULL,
	`is_included` integer DEFAULT true NOT NULL,
	`destination_org` text,
	`status` text DEFAULT 'imported' NOT NULL,
	`last_mirrored` integer,
	`error_message` text,
	`repository_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_organizations_user_id` ON `organizations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_config_id` ON `organizations` (`config_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_status` ON `organizations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_organizations_is_included` ON `organizations` (`is_included`);--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config_id` text NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`url` text NOT NULL,
	`clone_url` text NOT NULL,
	`owner` text NOT NULL,
	`organization` text,
	`mirrored_location` text DEFAULT '',
	`is_private` integer DEFAULT false NOT NULL,
	`is_fork` integer DEFAULT false NOT NULL,
	`forked_from` text,
	`has_issues` integer DEFAULT false NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`has_lfs` integer DEFAULT false NOT NULL,
	`has_submodules` integer DEFAULT false NOT NULL,
	`language` text,
	`description` text,
	`default_branch` text NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`status` text DEFAULT 'imported' NOT NULL,
	`last_mirrored` integer,
	`error_message` text,
	`destination_org` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_repositories_user_id` ON `repositories` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_repositories_config_id` ON `repositories` (`config_id`);--> statement-breakpoint
CREATE INDEX `idx_repositories_status` ON `repositories` (`status`);--> statement-breakpoint
CREATE INDEX `idx_repositories_owner` ON `repositories` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_repositories_organization` ON `repositories` (`organization`);--> statement-breakpoint
CREATE INDEX `idx_repositories_is_fork` ON `repositories` (`is_fork`);--> statement-breakpoint
CREATE INDEX `idx_repositories_is_starred` ON `repositories` (`is_starred`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_token` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`username` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`identifier` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_verification_tokens_token` ON `verification_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_verification_tokens_identifier` ON `verification_tokens` (`identifier`);