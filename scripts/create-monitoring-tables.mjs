#!/usr/bin/env node

/**
 * Create Missing Monitoring Tables
 * Creates apiLogs and exchangeApiLogs tables for API monitoring
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const sql = `
-- API Logs Table
CREATE TABLE IF NOT EXISTS apiLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  url VARCHAR(500) NOT NULL,
  statusCode INT NOT NULL,
  duration INT NOT NULL COMMENT 'milliseconds',
  userId INT DEFAULT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  userAgent TEXT DEFAULT NULL,
  error TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt),
  INDEX idx_statusCode (statusCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exchange API Logs Table
CREATE TABLE IF NOT EXISTS exchangeApiLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exchange VARCHAR(50) NOT NULL COMMENT 'binance, kraken, etc.',
  method VARCHAR(100) NOT NULL COMMENT 'fetchTicker, createOrder, etc.',
  success BOOLEAN NOT NULL,
  duration INT NOT NULL COMMENT 'milliseconds',
  rateLimitRemaining INT DEFAULT NULL,
  error TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_exchange (exchange),
  INDEX idx_createdAt (createdAt),
  INDEX idx_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  console.log('🚀 Creating missing monitoring tables...\n');
  
  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      if (tableName) {
        console.log(`Creating table: ${tableName}...`);
        await connection.query(statement);
        console.log(`✅ Table ${tableName} created successfully\n`);
      }
    }
    
    // Verify tables exist
    console.log('Verifying tables...');
    const [apiLogsRows] = await connection.query('SELECT COUNT(*) as count FROM apiLogs');
    const [exchangeApiLogsRows] = await connection.query('SELECT COUNT(*) as count FROM exchangeApiLogs');
    
    console.log(`✅ apiLogs table: ${apiLogsRows[0].count} records`);
    console.log(`✅ exchangeApiLogs table: ${exchangeApiLogsRows[0].count} records`);
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
