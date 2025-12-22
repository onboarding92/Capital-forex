/**
 * Price Feed Broadcaster Job
 * 
 * Fetches real-time prices and broadcasts to WebSocket clients
 * Runs every 2 seconds for active trading pairs
 */

import { getAllCryptoPrices } from "./cryptoPrices";
import { broadcastPriceUpdate } from "./websocketBroadcaster";
import { TRADING_PAIRS } from "../shared/const";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Cache previous prices to calculate 24h change
const priceCache = new Map<string, { price: number; timestamp: number }>();

/**
 * Start the price feed broadcaster
 */
export function startPriceFeedBroadcaster() {
  if (isRunning) {
    console.log("[Price Feed] Already running");
    return;
  }

  console.log("[Price Feed] Starting broadcaster...");
  isRunning = true;

  // Run immediately
  broadcastPrices();

  // Then run every 2 seconds
  intervalId = setInterval(() => {
    broadcastPrices();
  }, 2000);

  console.log("[Price Feed] Broadcaster started (interval: 2s)");
}

/**
 * Stop the price feed broadcaster
 */
export function stopPriceFeedBroadcaster() {
  if (!isRunning) {
    console.log("[Price Feed] Not running");
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log("[Price Feed] Broadcaster stopped");
}

/**
 * Fetch and broadcast current prices
 */
async function broadcastPrices() {
  try {
    const prices = await getAllCryptoPrices();
    const now = Date.now();

    for (const pair of TRADING_PAIRS) {
      const priceData = prices.find((p) => p.pair === pair);
      if (!priceData) continue;

      const cached = priceCache.get(pair);
      const change24h = cached
        ? ((priceData.price - cached.price) / cached.price) * 100
        : 0;

      // Update cache
      priceCache.set(pair, {
        price: priceData.price,
        timestamp: now,
      });

      // Broadcast to WebSocket clients
      broadcastPriceUpdate({
        pair,
        price: priceData.price,
        change24h,
        volume24h: 0, // TODO: Calculate from trades table
        timestamp: now,
      });
    }
  } catch (error) {
    console.error("[Price Feed] Error broadcasting prices:", error);
  }
}

/**
 * Get broadcaster status
 */
export function getPriceFeedStatus() {
  return {
    isRunning,
    cachedPairs: priceCache.size,
    lastUpdate: Math.max(...Array.from(priceCache.values()).map((v) => v.timestamp)),
  };
}
