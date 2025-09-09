ALTER TABLE `organizations` ADD `public_repository_count` integer;--> statement-breakpoint
ALTER TABLE `organizations` ADD `private_repository_count` integer;--> statement-breakpoint
ALTER TABLE `organizations` ADD `fork_repository_count` integer;