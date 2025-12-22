-- Add referral fields to users table
ALTER TABLE users 
ADD COLUMN referralCode VARCHAR(20) UNIQUE,
ADD COLUMN referredBy INT NULL;

-- Generate unique referral codes for existing users
UPDATE users 
SET referralCode = CONCAT('REF', LPAD(id, 6, '0'), SUBSTRING(MD5(CONCAT(id, email)), 1, 4))
WHERE referralCode IS NULL;
