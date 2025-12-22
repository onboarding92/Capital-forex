-- Add monitoring tables to database

CREATE TABLE IF NOT EXISTS `apiLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `method` VARCHAR(10) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `statusCode` INT NOT NULL,
  `duration` INT NOT NULL,
  `userId` INT,
  `ip` VARCHAR(45),
  `userAgent` TEXT,
  `error` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_createdAt` (`createdAt`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_statusCode` (`statusCode`)
);

CREATE TABLE IF NOT EXISTS `systemMetrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `metricType` ENUM('api_response_time', 'db_query_time', 'cache_hit_rate', 'active_users', 'trading_volume', 'error_rate', 'cpu_usage', 'memory_usage') NOT NULL,
  `value` DECIMAL(20, 8) NOT NULL,
  `unit` VARCHAR(20),
  `metadata` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_metricType_createdAt` (`metricType`, `createdAt`)
);

CREATE TABLE IF NOT EXISTS `errorLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `errorType` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `stack` TEXT,
  `userId` INT,
  `context` TEXT,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `resolved` BOOLEAN NOT NULL DEFAULT FALSE,
  `resolvedAt` TIMESTAMP NULL,
  `resolvedBy` INT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_severity_resolved` (`severity`, `resolved`),
  INDEX `idx_createdAt` (`createdAt`)
);

CREATE TABLE IF NOT EXISTS `exchangeApiLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exchange` VARCHAR(50) NOT NULL,
  `method` VARCHAR(100) NOT NULL,
  `success` BOOLEAN NOT NULL,
  `duration` INT NOT NULL,
  `rateLimitRemaining` INT,
  `error` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_exchange_createdAt` (`exchange`, `createdAt`),
  INDEX `idx_success` (`success`)
);

CREATE TABLE IF NOT EXISTS `alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `alertType` ENUM('high_error_rate', 'slow_response_time', 'exchange_api_failure', 'low_balance', 'suspicious_activity', 'system_down') NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `message` TEXT NOT NULL,
  `metadata` TEXT,
  `acknowledged` BOOLEAN NOT NULL DEFAULT FALSE,
  `acknowledgedBy` INT,
  `acknowledgedAt` TIMESTAMP NULL,
  `resolved` BOOLEAN NOT NULL DEFAULT FALSE,
  `resolvedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_severity_acknowledged` (`severity`, `acknowledged`),
  INDEX `idx_resolved` (`resolved`)
);
