ALTER TABLE `kycDocuments` ADD `firstName` varchar(100);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `lastName` varchar(100);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `dateOfBirth` varchar(10);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `address` text;--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `country` varchar(100);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `postalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `selfieUrl` text;--> statement-breakpoint
ALTER TABLE `kycDocuments` ADD `proofOfAddressUrl` text;