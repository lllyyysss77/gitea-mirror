CREATE TABLE `oauth_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`access_token_expires_at` integer NOT NULL,
	`refresh_token_expires_at` integer,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_access_tokens_access_token` ON `oauth_access_tokens` (`access_token`);--> statement-breakpoint
CREATE INDEX `idx_oauth_access_tokens_user_id` ON `oauth_access_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_access_tokens_client_id` ON `oauth_access_tokens` (`client_id`);--> statement-breakpoint
CREATE TABLE `oauth_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text NOT NULL,
	`name` text NOT NULL,
	`redirect_urls` text NOT NULL,
	`metadata` text,
	`type` text NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_applications_client_id_unique` ON `oauth_applications` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_applications_client_id` ON `oauth_applications` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_applications_user_id` ON `oauth_applications` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`scopes` text NOT NULL,
	`consent_given` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_consent_user_id` ON `oauth_consent` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_consent_client_id` ON `oauth_consent` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_consent_user_client` ON `oauth_consent` (`user_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `sso_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`domain` text NOT NULL,
	`oidc_config` text NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`organization_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sso_providers_provider_id_unique` ON `sso_providers` (`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_sso_providers_provider_id` ON `sso_providers` (`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_sso_providers_domain` ON `sso_providers` (`domain`);--> statement-breakpoint
CREATE INDEX `idx_sso_providers_issuer` ON `sso_providers` (`issuer`);