/**
 * Seed Staking Pools
 * 
 * Populates the database with real staking pools for:
 * - BTC (flexible & locked)
 * - ETH (flexible & locked)
 * - USDT (flexible & locked)
 * - BNB (locked)
 * - SOL (flexible)
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { stakingPools } from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function seedStakingPools() {
  console.log("🌱 Seeding staking pools...");

  // Create database connection
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Define staking pools with competitive APYs
  const pools = [
    // BTC Pools
    {
      asset: "BTC",
      type: "flexible",
      apy: "3.50",
      minAmount: "0.001",
      lockPeriod: 0,
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "BTC",
      type: "locked",
      apy: "5.80",
      minAmount: "0.001",
      lockPeriod: 30, // 30 days
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "BTC",
      type: "locked",
      apy: "7.20",
      minAmount: "0.001",
      lockPeriod: 90, // 90 days
      totalStaked: "0",
      isActive: true,
    },

    // ETH Pools
    {
      asset: "ETH",
      type: "flexible",
      apy: "4.20",
      minAmount: "0.01",
      lockPeriod: 0,
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "ETH",
      type: "locked",
      apy: "6.50",
      minAmount: "0.01",
      lockPeriod: 30,
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "ETH",
      type: "locked",
      apy: "8.80",
      minAmount: "0.01",
      lockPeriod: 90,
      totalStaked: "0",
      isActive: true,
    },

    // USDT Pools
    {
      asset: "USDT",
      type: "flexible",
      apy: "5.00",
      minAmount: "10",
      lockPeriod: 0,
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "USDT",
      type: "locked",
      apy: "8.50",
      minAmount: "10",
      lockPeriod: 30,
      totalStaked: "0",
      isActive: true,
    },
    {
      asset: "USDT",
      type: "locked",
      apy: "12.00",
      minAmount: "10",
      lockPeriod: 90,
      totalStaked: "0",
      isActive: true,
    },

    // BNB Pool
    {
      asset: "BNB",
      type: "locked",
      apy: "10.50",
      minAmount: "0.1",
      lockPeriod: 60,
      totalStaked: "0",
      isActive: true,
    },

    // SOL Pool
    {
      asset: "SOL",
      type: "flexible",
      apy: "6.80",
      minAmount: "1",
      lockPeriod: 0,
      totalStaked: "0",
      isActive: true,
    },
  ];

  try {
    // Insert pools
    for (const pool of pools) {
      await db.insert(stakingPools).values(pool);
      console.log(`✅ Added ${pool.asset} ${pool.type} pool (${pool.apy}% APY, ${pool.lockPeriod} days)`);
    }

    console.log(`\n✅ Successfully seeded ${pools.length} staking pools!`);
    console.log("\nPool Summary:");
    console.log("- BTC: 3 pools (flexible 3.5%, 30d 5.8%, 90d 7.2%)");
    console.log("- ETH: 3 pools (flexible 4.2%, 30d 6.5%, 90d 8.8%)");
    console.log("- USDT: 3 pools (flexible 5%, 30d 8.5%, 90d 12%)");
    console.log("- BNB: 1 pool (60d 10.5%)");
    console.log("- SOL: 1 pool (flexible 6.8%)");

  } catch (error) {
    console.error("❌ Error seeding staking pools:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run seed
seedStakingPools();
