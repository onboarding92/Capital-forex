CREATE TABLE `networks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`chainId` varchar(50),
	`type` varchar(50) NOT NULL,
	`asset` varchar(20) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`depositFee` decimal(20,8) NOT NULL DEFAULT '0',
	`withdrawalFee` decimal(20,8) NOT NULL DEFAULT '0',
	`minDeposit` decimal(20,8) NOT NULL DEFAULT '0',
	`minWithdrawal` decimal(20,8) NOT NULL DEFAULT '0',
	`confirmations` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `networks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deposits` ADD `network` varchar(50);--> statement-breakpoint
ALTER TABLE `withdrawals` ADD `network` varchar(50) NOT NULL;