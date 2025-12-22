-- Migration to sync database with TypeScript schema (v2)
-- Created: 2024-12-19
-- Purpose: Remove OAuth columns and add missing KYC/referral columns

-- Step 1: Remove OAuth legacy columns
ALTER TABLE `users` DROP COLUMN IF EXISTS `openId`;
ALTER TABLE `users` DROP COLUMN IF EXISTS `loginMethod`;

-- Step 2: Add missing KYC columns
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `kycIdFrontPath` TEXT AFTER `kycExpiresAt`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `kycIdBackPath` TEXT AFTER `kycIdFrontPath`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `kycSelfiePath` TEXT AFTER `kycIdBackPath`;

-- Step 3: Add missing referral columns (without UNIQUE constraint first)
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referralCode` VARCHAR(20) AFTER `ipWhitelist`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referredBy` INT AFTER `referralCode`;

-- Step 4: Add UNIQUE constraint to referralCode (if column exists and index doesn't)
-- This will be done separately after checking

-- Step 5: Update antiPhishingCode column length if needed
ALTER TABLE `users` MODIFY COLUMN `antiPhishingCode` VARCHAR(50);

-- Step 6: Update twoFactorSecret column length if needed
ALTER TABLE `users` MODIFY COLUMN `twoFactorSecret` VARCHAR(255);
