#!/usr/bin/env node
import { createConnection } from 'mysql2/promise';

async function addCopyTradingTables() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {rejectUnauthorized: false},
  });

  try {
    console.log('Creating Copy Trading tables...\n');

    // Trader Profiles
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS traderProfiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL UNIQUE,
        totalFollowers INT NOT NULL DEFAULT 0,
        totalTrades INT NOT NULL DEFAULT 0,
        winningTrades INT NOT NULL DEFAULT 0,
        losingTrades INT NOT NULL DEFAULT 0,
        winRate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        totalPnL DECIMAL(20, 8) NOT NULL DEFAULT 0,
        avgRoi DECIMAL(10, 2) NOT NULL DEFAULT 0,
        maxDrawdown DECIMAL(10, 2) NOT NULL DEFAULT 0,
        sharpeRatio DECIMAL(10, 4) NOT NULL DEFAULT 0,
        riskScore INT NOT NULL DEFAULT 5,
        tradingVolume30d DECIMAL(20, 2) NOT NULL DEFAULT 0,
        isPublic BOOLEAN NOT NULL DEFAULT FALSE,
        bio TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ traderProfiles table created');

    // Copy Trading Follows
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS copyTradingFollows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        followerId INT NOT NULL,
        traderId INT NOT NULL,
        allocatedAmount DECIMAL(20, 8) NOT NULL,
        maxRiskPerTrade DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
        copyRatio DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
        status ENUM('active', 'paused', 'stopped') NOT NULL DEFAULT 'active',
        totalCopiedTrades INT NOT NULL DEFAULT 0,
        totalPnL DECIMAL(20, 8) NOT NULL DEFAULT 0,
        startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        stoppedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_followerId (followerId),
        INDEX idx_traderId (traderId),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ copyTradingFollows table created');

    // Copy Trading Executions
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS copyTradingExecutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        followId INT NOT NULL,
        followerId INT NOT NULL,
        traderId INT NOT NULL,
        originalOrderId INT NOT NULL,
        copiedOrderId INT NOT NULL,
        pair VARCHAR(20) NOT NULL,
        side ENUM('buy', 'sell') NOT NULL,
        executionPrice DECIMAL(20, 8) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        copyRatio DECIMAL(5, 2) NOT NULL,
        status ENUM('pending', 'executed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
        executedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_followId (followId),
        INDEX idx_originalOrderId (originalOrderId),
        INDEX idx_copiedOrderId (copiedOrderId),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ copyTradingExecutions table created');

    console.log('\n🎉 Copy Trading tables created successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

addCopyTradingTables();
