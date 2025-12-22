CREATE TABLE `blockchainTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`txHash` varchar(255) NOT NULL,
	`network` varchar(50) NOT NULL,
	`asset` varchar(20) NOT NULL,
	`fromAddress` varchar(255),
	`toAddress` varchar(255) NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`fee` decimal(20,8) NOT NULL DEFAULT '0',
	`confirmations` int NOT NULL DEFAULT 0,
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
	`type` enum('deposit','withdrawal') NOT NULL,
	`userId` int,
	`depositAddressId` int,
	`withdrawalId` int,
	`blockNumber` int,
	`blockTimestamp` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blockchainTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `blockchainTransactions_txHash_unique` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE TABLE `depositAddresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`network` varchar(50) NOT NULL,
	`asset` varchar(20) NOT NULL,
	`address` varchar(255) NOT NULL,
	`derivationIndex` int,
	`masterWalletId` int,
	`isUsed` boolean NOT NULL DEFAULT false,
	`lastDepositAt` timestamp,
	`totalDeposited` decimal(20,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `depositAddresses_id` PRIMARY KEY(`id`),
	CONSTRAINT `depositAddresses_address_unique` UNIQUE(`address`)
);
--> statement-breakpoint
CREATE TABLE `masterWallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`network` varchar(50) NOT NULL,
	`asset` varchar(20) NOT NULL,
	`address` varchar(255) NOT NULL,
	`encryptedPrivateKey` text NOT NULL,
	`encryptedMnemonic` text,
	`derivationPath` varchar(100),
	`balance` decimal(20,8) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `masterWallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `masterWallets_network_unique` UNIQUE(`network`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `kycStatus` enum('pending','submitted','approved','rejected','expired') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `kycSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `kycApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `kycRejectedReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `kycExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorBackupCodes` text;