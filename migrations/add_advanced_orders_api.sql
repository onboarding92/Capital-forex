-- Add Stop Loss and Take Profit fields to orders table
ALTER TABLE orders ADD COLUMN stopLoss DECIMAL(20, 8) NULL;
ALTER TABLE orders ADD COLUMN takeProfit DECIMAL(20, 8) NULL;

-- Create API Keys table
CREATE TABLE IF NOT EXISTS apiKeys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  `key` VARCHAR(64) NOT NULL UNIQUE,
  secret VARCHAR(128) NOT NULL,
  permissions TEXT NOT NULL,
  rateLimit INT NOT NULL DEFAULT 100,
  ipWhitelist TEXT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lastUsedAt TIMESTAMP NULL,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create API Request Logs table
CREATE TABLE IF NOT EXISTS apiRequestLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apiKeyId INT NOT NULL,
  userId INT NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  statusCode INT NOT NULL,
  responseTime INT NOT NULL,
  ip VARCHAR(45) NOT NULL,
  userAgent TEXT NULL,
  requestBody TEXT NULL,
  error TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apiKeys_userId ON apiKeys(userId);
CREATE INDEX IF NOT EXISTS idx_apiKeys_key ON apiKeys(`key`);
CREATE INDEX IF NOT EXISTS idx_apiRequestLogs_apiKeyId ON apiRequestLogs(apiKeyId);
CREATE INDEX IF NOT EXISTS idx_apiRequestLogs_createdAt ON apiRequestLogs(createdAt);
