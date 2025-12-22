-- Wallet Production System Migration
-- Created: December 21, 2025
-- Purpose: Add cold wallet management, sweep system, and balance monitoring

-- 1. Cold Wallet Configuration Table
-- Stores cold wallet addresses (NO private keys stored)
CREATE TABLE IF NOT EXISTS coldWallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL UNIQUE,
  asset VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  lastVerifiedAt TIMESTAMP NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_network (network),
  INDEX idx_asset (asset)
);

-- 2. Sweep Transactions Table
-- Tracks all fund movements between wallets
CREATE TABLE IF NOT EXISTS sweepTransactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fromAddress VARCHAR(255) NOT NULL,
  toAddress VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL,
  asset VARCHAR(20) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  txHash VARCHAR(255),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending' NOT NULL,
  type ENUM('deposit_to_hot', 'hot_to_cold', 'cold_to_hot') NOT NULL,
  errorMessage TEXT,
  retryCount INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completedAt TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_network (network),
  INDEX idx_created (createdAt)
);

-- 3. Wallet Thresholds Table
-- Defines balance limits for hot wallets
CREATE TABLE IF NOT EXISTS walletThresholds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL UNIQUE,
  asset VARCHAR(20) NOT NULL,
  minBalance DECIMAL(20, 8) NOT NULL COMMENT 'Alert when hot wallet below this',
  maxBalance DECIMAL(20, 8) NOT NULL COMMENT 'Sweep to cold when above this',
  targetBalance DECIMAL(20, 8) NOT NULL COMMENT 'Ideal operating balance',
  alertEmail VARCHAR(320),
  lastAlertSent TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_network (network)
);

-- 4. Update masterWallets table with new fields
ALTER TABLE masterWallets 
  ADD COLUMN IF NOT EXISTS walletType ENUM('hot', 'deposit_generator') DEFAULT 'hot' NOT NULL AFTER isActive,
  ADD COLUMN IF NOT EXISTS minBalance DECIMAL(20, 8) DEFAULT 0 NOT NULL AFTER walletType,
  ADD COLUMN IF NOT EXISTS maxBalance DECIMAL(20, 8) DEFAULT 0 NOT NULL AFTER minBalance;

-- 5. Insert default thresholds for existing networks
INSERT INTO walletThresholds (network, asset, minBalance, maxBalance, targetBalance, alertEmail)
VALUES
  ('BTC', 'BTC', 0.5, 5.0, 2.0, 'admin@bitchangemoney.xyz'),
  ('ETH', 'ETH', 5.0, 50.0, 20.0, 'admin@bitchangemoney.xyz'),
  ('USDT_ERC20', 'USDT', 5000, 50000, 20000, 'admin@bitchangemoney.xyz'),
  ('USDT_TRC20', 'USDT', 5000, 50000, 20000, 'admin@bitchangemoney.xyz'),
  ('USDT_BEP20', 'USDT', 5000, 50000, 20000, 'admin@bitchangemoney.xyz'),
  ('BNB', 'BNB', 10, 100, 40, 'admin@bitchangemoney.xyz'),
  ('SOL', 'SOL', 50, 500, 200, 'admin@bitchangemoney.xyz'),
  ('MATIC', 'MATIC', 500, 5000, 2000, 'admin@bitchangemoney.xyz')
ON DUPLICATE KEY UPDATE
  minBalance = VALUES(minBalance),
  maxBalance = VALUES(maxBalance),
  targetBalance = VALUES(targetBalance);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_type ON masterWallets(walletType);
CREATE INDEX IF NOT EXISTS idx_is_active ON masterWallets(isActive);

-- Verification queries
SELECT 'coldWallets table created' AS status, COUNT(*) AS count FROM coldWallets;
SELECT 'sweepTransactions table created' AS status, COUNT(*) AS count FROM sweepTransactions;
SELECT 'walletThresholds table created' AS status, COUNT(*) AS count FROM walletThresholds;
SELECT 'masterWallets updated' AS status, COUNT(*) AS count FROM masterWallets;
