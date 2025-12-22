#!/usr/bin/env node
/**
 * Apply Advanced Orders & API Keys Migration
 * 
 * Adds stopLoss and takeProfit fields to orders table
 * Creates apiKeys and apiRequestLogs tables
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  
  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  const connection = await createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log('✅ Connected to database');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', 'add_advanced_orders_api.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        const preview = statement.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✅ ${preview}...`);
      } catch (error) {
        // Ignore "Duplicate column" and "Table already exists" errors
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
          const preview = statement.substring(0, 60).replace(/\n/g, ' ');
          console.log(`⚠️  ${preview}... (already exists, skipped)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify tables exist
    console.log('\n🔍 Verifying migration...');
    
    const [orders] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME IN ('stopLoss', 'takeProfit')"
    );
    console.log(`✅ orders table: ${orders[0].count}/2 new columns`);

    const [apiKeys] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'apiKeys'"
    );
    console.log(`✅ apiKeys table: ${apiKeys[0].count === 1 ? 'exists' : 'missing'}`);

    const [apiRequestLogs] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'apiRequestLogs'"
    );
    console.log(`✅ apiRequestLogs table: ${apiRequestLogs[0].count === 1 ? 'exists' : 'missing'}`);

    console.log('\n🎉 All database changes applied successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

applyMigration();
