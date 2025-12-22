-- Setup test traders for trading flow testing

-- 1. Verify trader1 email
UPDATE users SET emailVerified = 1 WHERE email = 'trader1@test.com';

-- 2. Create trader2 (password: Test123!Test)
INSERT INTO users (email, name, password, role, emailVerified, loginMethod)
VALUES ('trader2@test.com', 'Trader Two', '$2a$10$YourHashedPasswordHere', 'user', 1, 'email')
ON DUPLICATE KEY UPDATE emailVerified = 1;

-- 3. Get user IDs
SET @trader1_id = (SELECT id FROM users WHERE email = 'trader1@test.com');
SET @trader2_id = (SELECT id FROM users WHERE email = 'trader2@test.com');

-- 4. Create wallets if not exist
INSERT IGNORE INTO wallets (userId, asset, balance) VALUES (@trader1_id, 'USDT', 10000.00);
INSERT IGNORE INTO wallets (userId, asset, balance) VALUES (@trader1_id, 'BTC', 1.00);
INSERT IGNORE INTO wallets (userId, asset, balance) VALUES (@trader2_id, 'USDT', 10000.00);
INSERT IGNORE INTO wallets (userId, asset, balance) VALUES (@trader2_id, 'BTC', 0.00);

-- 5. Update balances
UPDATE wallets SET balance = 10000.00 WHERE userId = @trader1_id AND asset = 'USDT';
UPDATE wallets SET balance = 1.00 WHERE userId = @trader1_id AND asset = 'BTC';
UPDATE wallets SET balance = 10000.00 WHERE userId = @trader2_id AND asset = 'USDT';
UPDATE wallets SET balance = 0.00 WHERE userId = @trader2_id AND asset = 'BTC';

SELECT 'Setup complete!' as status;
SELECT id, email, name, emailVerified FROM users WHERE email IN ('trader1@test.com', 'trader2@test.com');
SELECT w.*, u.email FROM wallets w JOIN users u ON w.userId = u.id WHERE u.email IN ('trader1@test.com', 'trader2@test.com');
