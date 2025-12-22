#!/usr/bin/env node

/**
 * Automatic Sweep Monitoring Cron Job
 * 
 * This script runs every 10 minutes to:
 * 1. Check for new deposits and sweep to hot wallets
 * 2. Check hot wallet balances and trigger alerts
 * 3. Auto-sweep hot wallets to cold storage when above max threshold
 * 
 * Usage:
 *   node scripts/sweep-monitor-cron.mjs
 * 
 * Crontab entry (runs every 10 minutes):
 *   */10 * * * * cd /home/ubuntu/bitchange-pro && node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, "../.env") });

// Import sweep system functions
const { autoSweepDeposits } = await import("../server/sweepSystem.ts");
const { checkHotWalletBalances } = await import("../server/balanceMonitor.ts");

const LOG_PREFIX = `[${new Date().toISOString()}]`;

async function runSweepMonitoring() {
  console.log(`${LOG_PREFIX} 🔄 Starting automatic sweep monitoring...`);
  
  try {
    // Step 1: Auto-sweep deposits to hot wallets
    console.log(`${LOG_PREFIX} 📥 Checking for new deposits...`);
    const depositResults = await autoSweepDeposits();
    
    if (depositResults.length > 0) {
      console.log(`${LOG_PREFIX} ✅ Swept ${depositResults.length} deposits:`);
      for (const result of depositResults) {
        if (result.success) {
          console.log(`${LOG_PREFIX}   ✓ ${result.network}: ${result.amount} ${result.asset}`);
        } else {
          console.error(`${LOG_PREFIX}   ✗ ${result.network}: ${result.error}`);
        }
      }
    } else {
      console.log(`${LOG_PREFIX} ℹ️  No new deposits to sweep`);
    }
    
    // Step 2: Check hot wallet balances and trigger alerts
    console.log(`${LOG_PREFIX} 💰 Checking hot wallet balances...`);
    const balanceAlerts = await checkHotWalletBalances();
    
    if (balanceAlerts.length > 0) {
      console.log(`${LOG_PREFIX} ⚠️  Balance alerts triggered:`);
      for (const alert of balanceAlerts) {
        console.log(`${LOG_PREFIX}   ${alert.severity === "critical" ? "🚨" : "⚠️"} ${alert.network}: ${alert.message}`);
        
        // Auto-sweep to cold storage if balance is too high
        if (alert.action === "sweep_to_cold") {
          console.log(`${LOG_PREFIX}   🔄 Auto-sweeping ${alert.network} to cold storage...`);
          try {
            const { sweepHotToCold } = await import("../server/sweepSystem.ts");
            const sweepResult = await sweepHotToCold(alert.network, alert.recommendedAmount);
            
            if (sweepResult.success) {
              console.log(`${LOG_PREFIX}   ✅ Sweep initiated: ${alert.recommendedAmount} ${alert.asset}`);
            } else {
              console.error(`${LOG_PREFIX}   ❌ Sweep failed: ${sweepResult.error}`);
            }
          } catch (error) {
            console.error(`${LOG_PREFIX}   ❌ Sweep error: ${error.message}`);
          }
        }
        
        // Log refill alerts (requires manual action)
        if (alert.action === "refill_from_cold") {
          console.log(`${LOG_PREFIX}   📧 Refill alert email sent to admin`);
        }
      }
    } else {
      console.log(`${LOG_PREFIX} ✅ All hot wallet balances are healthy`);
    }
    
    console.log(`${LOG_PREFIX} ✅ Sweep monitoring completed successfully\n`);
    
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Sweep monitoring failed:`);
    console.error(`${LOG_PREFIX} Error: ${error.message}`);
    console.error(`${LOG_PREFIX} Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run monitoring
runSweepMonitoring()
  .then(() => {
    console.log(`${LOG_PREFIX} 👋 Sweep monitoring finished`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${LOG_PREFIX} 💥 Fatal error:`, error);
    process.exit(1);
  });
