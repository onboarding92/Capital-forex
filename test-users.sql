-- Test Users for BitChange Pro
-- Run this SQL on your database to create test users

-- Normal User
-- Email: user@bitchange.test
-- Password: User123!
INSERT INTO users (name, email, role, password, emailVerified, kycStatus, accountStatus, createdAt, updatedAt, lastSignedIn) 
VALUES ('Test User', 'user@bitchange.test', 'user', '$2b$10$o0seFQiCwbqn3vs.9G957eSrlcaM2Tv9nMrhJs7cPwnufFexT2or6', NOW(), 'pending', 'active', NOW(), NOW(), NOW());

-- Update Admin User password
-- Email: admin@bitchangemoney.xyz
-- Password: Admin123!
UPDATE users SET password = '$2b$10$5WaySf/OLxQjkTtuBtw8iOtPM4aI97LW779xXFs6WaCdhLH2LtDMi' WHERE email = 'admin@bitchangemoney.xyz';

-- Create initial wallets for test user (will be auto-created on first login, but you can pre-create them)
-- Note: Replace {USER_ID} with the actual user ID after inserting the user
-- INSERT INTO wallets (userId, asset, balance, locked, createdAt, updatedAt) VALUES
-- ({USER_ID}, 'BTC', '0', '0', NOW(), NOW()),
-- ({USER_ID}, 'ETH', '0', '0', NOW(), NOW()),
-- ({USER_ID}, 'USDT', '10000', '0', NOW(), NOW());
