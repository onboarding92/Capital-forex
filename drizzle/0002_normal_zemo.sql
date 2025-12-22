ALTER TABLE `supportTickets` MODIFY COLUMN `status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` timestamp;