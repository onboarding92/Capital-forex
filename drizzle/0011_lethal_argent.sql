CREATE TABLE `deviceFingerprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fingerprint` varchar(255) NOT NULL,
	`userAgent` text,
	`ip` varchar(45),
	`trusted` boolean NOT NULL DEFAULT false,
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deviceFingerprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `securityAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`details` text,
	`ip` varchar(45),
	`userAgent` text,
	`success` boolean NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `securityAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalDelays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`withdrawalId` int NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`usdValue` decimal(20,2) NOT NULL,
	`delayUntil` timestamp NOT NULL,
	`reason` text,
	`cancelled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `withdrawalDelays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawalWhitelist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(20) NOT NULL,
	`address` varchar(255) NOT NULL,
	`network` varchar(50) NOT NULL,
	`label` varchar(100),
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `withdrawalWhitelist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `antiPhishingCode` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `ipWhitelist` text;