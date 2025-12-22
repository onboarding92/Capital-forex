/**
 * Matching Engine Background Job
 * 
 * Runs the matching engine continuously to process pending orders
 * Executes every 2 seconds to ensure fast order matching
 */

import { runMatchingEngine, getMatchingEngineStats } from "./matchingEngine";
import { checkAdvancedOrders } from "./advancedMatchingEngine";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

const MATCHING_INTERVAL_MS = 2000; // Run every 2 seconds

/**
 * Start the matching engine background job
 */
export function startMatchingEngine() {
  if (isRunning) {
    console.log("[Matching Engine] Already running");
    return;
  }

  console.log("[Matching Engine] Starting...");
  isRunning = true;

  // Run immediately on start
  runMatchingCycle();

  // Then run on interval
  intervalId = setInterval(runMatchingCycle, MATCHING_INTERVAL_MS);

  console.log(`[Matching Engine] Started (interval: ${MATCHING_INTERVAL_MS}ms)`);
}

/**
 * Stop the matching engine background job
 */
export function stopMatchingEngine() {
  if (!isRunning) {
    console.log("[Matching Engine] Not running");
    return;
  }

  console.log("[Matching Engine] Stopping...");

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log("[Matching Engine] Stopped");
}

/**
 * Run a single matching cycle
 */
async function runMatchingCycle() {
  try {
    const startTime = Date.now();
    
    // Run normal matching engine
    const result = await runMatchingEngine();
    
    // Check Stop Loss and Take Profit orders
    await checkAdvancedOrders();
    
    const duration = Date.now() - startTime;

    if (result.processedOrders > 0 || result.totalTrades > 0) {
      console.log(
        `[Matching Engine] Processed ${result.processedOrders} orders, ` +
        `created ${result.totalTrades} trades (${duration}ms)`
      );
    }
  } catch (error) {
    console.error("[Matching Engine] Error during matching cycle:", error);
  }
}

/**
 * Get matching engine status
 */
export async function getMatchingEngineStatus() {
  const stats = await getMatchingEngineStats();

  return {
    isRunning,
    interval: MATCHING_INTERVAL_MS,
    stats,
  };
}
