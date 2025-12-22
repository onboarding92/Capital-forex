-- ============================================================================
-- BitChange Pro - Production Database Setup Script
-- Created: December 19, 2025
-- Purpose: Sync production database schema and create test users
-- ============================================================================

-- STEP 1: Remove OAuth legacy columns (if they exist)
-- ============================================================================
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'openId';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'ALTER TABLE users DROP COLUMN openId;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = 'loginMethod';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  'ALTER TABLE users DROP COLUMN loginMethod;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- STEP 2: Add missing KYC columns (if they don't exist)
-- ============================================================================
SET @columnname = 'kycIdFrontPath';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) = 0,
  'ALTER TABLE users ADD COLUMN kycIdFrontPath TEXT AFTER kycExpiresAt;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = 'kycIdBackPath';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) = 0,
  'ALTER TABLE users ADD COLUMN kycIdBackPath TEXT AFTER kycIdFrontPath;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = 'kycSelfiePath';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) = 0,
  'ALTER TABLE users ADD COLUMN kycSelfiePath TEXT AFTER kycIdBackPath;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- STEP 3: Add missing referral columns (if they don't exist)
-- ============================================================================
SET @columnname = 'referralCode';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) = 0,
  'ALTER TABLE users ADD COLUMN referralCode VARCHAR(20) AFTER ipWhitelist;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = 'referredBy';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) = 0,
  'ALTER TABLE users ADD COLUMN referredBy INT AFTER referralCode;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- STEP 4: Update column types (if needed)
-- ============================================================================
ALTER TABLE users MODIFY COLUMN antiPhishingCode VARCHAR(50);
ALTER TABLE users MODIFY COLUMN twoFactorSecret VARCHAR(255);

-- STEP 5: Create test users (delete if exist, then recreate)
-- ============================================================================
DELETE FROM users WHERE email IN ('user@bitchange.test', 'admin@bitchangemoney.xyz');

INSERT INTO users (
  name, 
  email, 
  role, 
  password, 
  emailVerified, 
  kycStatus, 
  twoFactorEnabled, 
  accountStatus,
  createdAt,
  updatedAt,
  lastSignedIn
) VALUES 
(
  'Test User',
  'user@bitchange.test',
  'user',
  '$2b$10$rZ8vK3qZ9mJ7X5wN2hL8/.YqK5yF3xJ1nQ4mW6tR7sP8uV0zB1cDm', -- User123!
  NOW(),
  'pending',
  0,
  'active',
  NOW(),
  NOW(),
  NOW()
),
(
  'Admin User',
  'admin@bitchangemoney.xyz',
  'admin',
  '$2b$10$8K7vL4rA0nM9Y6xO3iN9/.ZrL6zG4yK2oR5nX7uS8tQ9wW1aC2dEn', -- Admin123!
  NOW(),
  'approved',
  0,
  'active',
  NOW(),
  NOW(),
  NOW()
);

-- STEP 6: Verify users created successfully
-- ============================================================================
SELECT 
  id, 
  name, 
  email, 
  role, 
  kycStatus, 
  accountStatus,
  createdAt
FROM users 
WHERE email IN ('user@bitchange.test', 'admin@bitchangemoney.xyz')
ORDER BY role DESC;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Test users created:
-- 1. user@bitchange.test / User123! (role: user)
-- 2. admin@bitchangemoney.xyz / Admin123! (role: admin)
-- ============================================================================
