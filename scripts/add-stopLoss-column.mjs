#!/usr/bin/env node
import { createConnection } from 'mysql2/promise';

async function addColumn() {
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
    console.log('Adding stopLoss column...');
    await conn.execute('ALTER TABLE orders ADD COLUMN stopLoss DECIMAL(20, 8) NULL');
    console.log('✅ stopLoss column added');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  stopLoss column already exists');
    } else {
      throw error;
    }
  }

  try {
    console.log('Creating apiKeys table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS apiKeys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        \`key\` VARCHAR(64) NOT NULL UNIQUE,
        secret VARCHAR(128) NOT NULL,
        permissions TEXT NOT NULL,
        rateLimit INT NOT NULL DEFAULT 100,
        ipWhitelist TEXT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        lastUsedAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ apiKeys table created');
  } catch (error) {
    console.error('Error creating apiKeys:', error.message);
  }

  try {
    console.log('Creating apiRequestLogs table...');
    await conn.execute(`
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
      )
    `);
    console.log('✅ apiRequestLogs table created');
  } catch (error) {
    console.error('Error creating apiRequestLogs:', error.message);
  }

  await conn.end();
  console.log('\n🎉 Migration completed!');
}

addColumn();
