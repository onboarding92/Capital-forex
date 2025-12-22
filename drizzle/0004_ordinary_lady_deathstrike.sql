CREATE TABLE `walletAddresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(20) NOT NULL,
	`address` varchar(255) NOT NULL,
	`network` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `walletAddresses_id` PRIMARY KEY(`id`)
);
