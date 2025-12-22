/**
 * Apply Wallet Production System Database Migration
 * 
 * This script applies the wallet production system migration directly to the database.
 * It creates the following tables:
 * - coldWallets: Cold storage wallet addresses
 * - sweepTransactions: Fund movement tracking
 * - walletThresholds: Balance limits and alert configuration
 */

import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "../.env") });

const migrationSQL = `
-- Cold Wallets Table (95% of funds in offline storage)
CREATE TABLE IF NOT EXISTS coldWallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL,
  asset VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL UNIQUE,
  balance VARCHAR(50) DEFAULT '0',
  lastVerifiedAt TIMESTAMP NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_network (network),
  INDEX idx_asset (asset)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sweep Transactions Table (track all fund movements)
CREATE TABLE IF NOT EXISTS sweepTransactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('deposit_to_hot', 'hot_to_cold', 'cold_to_hot') NOT NULL,
  network VARCHAR(50) NOT NULL,
  asset VARCHAR(20) NOT NULL,
  amount VARCHAR(50) NOT NULL,
  fromAddress VARCHAR(255),
  toAddress VARCHAR(255),
  txHash VARCHAR(255),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_network (network),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Thresholds Table (balance limits and alerts)
CREATE TABLE IF NOT EXISTS walletThresholds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL UNIQUE,
  asset VARCHAR(20) NOT NULL,
  minBalance VARCHAR(50) NOT NULL COMMENT 'Trigger refill alert',
  maxBalance VARCHAR(50) NOT NULL COMMENT 'Trigger sweep to cold',
  targetBalance VARCHAR(50) NOT NULL COMMENT 'Ideal hot wallet balance',
  alertEmail VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network (network)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default thresholds for main networks
INSERT INTO walletThresholds (network, asset, minBalance, maxBalance, targetBalance, alertEmail)
VALUES
  ('BTC', 'BTC', '0.1', '2.0', '1.0', NULL),
  ('ETH', 'ETH', '1.0', '20.0', '10.0', NULL),
  ('BNB', 'BNB', '5.0', '100.0', '50.0', NULL),
  ('SOL', 'SOL', '10.0', '200.0', '100.0', NULL),
  ('MATIC', 'MATIC', '100.0', '2000.0', '1000.0', NULL),
  ('TRX', 'TRX', '1000.0', '20000.0', '10000.0', NULL)
ON DUPLICATE KEY UPDATE
  minBalance = VALUES(minBalance),
  maxBalance = VALUES(maxBalance),
  targetBalance = VALUES(targetBalance);
`;

async function applyMigration() {
  let connection;
  
  try {
    console.log("🔗 Connecting to database...");
    
    connection = await createConnection({
      uri: process.env.DATABASE_URL,
    });
    
    console.log("✅ Connected to database");
    console.log("📝 Applying wallet production system migration...\n");
    
    // Execute CREATE TABLE statements
    console.log("Creating tables...");
    
    // Create coldWallets table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coldWallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        network VARCHAR(50) NOT NULL,
        asset VARCHAR(20) NOT NULL,
        address VARCHAR(255) NOT NULL UNIQUE,
        balance VARCHAR(50) DEFAULT '0',
        lastVerifiedAt TIMESTAMP NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_network (network),
        INDEX idx_asset (asset)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("  ✓ Created/verified table: coldWallets");
    
    // Create sweepTransactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sweepTransactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('deposit_to_hot', 'hot_to_cold', 'cold_to_hot') NOT NULL,
        network VARCHAR(50) NOT NULL,
        asset VARCHAR(20) NOT NULL,
        amount VARCHAR(50) NOT NULL,
        fromAddress VARCHAR(255),
        toAddress VARCHAR(255),
        txHash VARCHAR(255),
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        errorMessage TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_network (network),
        INDEX idx_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("  ✓ Created/verified table: sweepTransactions");
    
    // Create walletThresholds table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS walletThresholds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        network VARCHAR(50) NOT NULL UNIQUE,
        asset VARCHAR(20) NOT NULL,
        minBalance VARCHAR(50) NOT NULL COMMENT 'Trigger refill alert',
        maxBalance VARCHAR(50) NOT NULL COMMENT 'Trigger sweep to cold',
        targetBalance VARCHAR(50) NOT NULL COMMENT 'Ideal hot wallet balance',
        alertEmail VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_network (network)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("  ✓ Created/verified table: walletThresholds");
    
    // Insert default thresholds
    console.log("\nPopulating default thresholds...");
    const thresholds = [
      { network: 'BTC', asset: 'BTC', min: '0.1', max: '2.0', target: '1.0' },
      { network: 'ETH', asset: 'ETH', min: '1.0', max: '20.0', target: '10.0' },
      { network: 'BNB', asset: 'BNB', min: '5.0', max: '100.0', target: '50.0' },
      { network: 'SOL', asset: 'SOL', min: '10.0', max: '200.0', target: '100.0' },
      { network: 'MATIC', asset: 'MATIC', min: '100.0', max: '2000.0', target: '1000.0' },
      { network: 'TRX', asset: 'TRX', min: '1000.0', max: '20000.0', target: '10000.0' },
    ];
    
    for (const t of thresholds) {
      await connection.execute(
        `INSERT INTO walletThresholds (network, asset, minBalance, maxBalance, targetBalance)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           minBalance = VALUES(minBalance),
           maxBalance = VALUES(maxBalance),
           targetBalance = VALUES(targetBalance)`,
        [t.network, t.asset, t.min, t.max, t.target]
      );
      console.log(`  ✓ Configured threshold: ${t.network}`);
    }
    
    console.log("\n✅ Migration completed successfully!");
    console.log("\n📊 Verifying tables...");
    
    // Verify tables exist
    const [coldWalletsResult] = await connection.execute("SELECT COUNT(*) as count FROM coldWallets");
    const [sweepTxResult] = await connection.execute("SELECT COUNT(*) as count FROM sweepTransactions");
    const [thresholdsResult] = await connection.execute("SELECT COUNT(*) as count FROM walletThresholds");
    
    console.log(`  • coldWallets: ${coldWalletsResult[0].count} records`);
    console.log(`  • sweepTransactions: ${sweepTxResult[0].count} records`);
    console.log(`  • walletThresholds: ${thresholdsResult[0].count} records`);
    
    console.log("\n🎉 Wallet production system is ready!");
    console.log("\n📋 Next steps:");
    console.log("  1. Add cold wallet addresses via admin panel");
    console.log("  2. Configure alert emails in wallet thresholds");
    console.log("  3. Start automatic sweep monitoring cron job");
    
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Database connection closed");
    }
  }
}

// Run migration
applyMigration();
