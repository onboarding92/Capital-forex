-- Add KYC document file path fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kycIdFrontPath TEXT COMMENT 'Local file path for ID front photo',
ADD COLUMN IF NOT EXISTS kycIdBackPath TEXT COMMENT 'Local file path for ID back photo',
ADD COLUMN IF NOT EXISTS kycSelfiePath TEXT COMMENT 'Local file path for selfie with ID';
