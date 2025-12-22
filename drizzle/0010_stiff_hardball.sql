ALTER TABLE `withdrawals` MODIFY COLUMN `status` enum('pending','approved','rejected','completed','processing','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `txHash` varchar(255);--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `completedAt` timestamp;