/**
 * Funding Rate Calculation Job
 * 
 * Calculates and applies funding rates for perpetual contracts every 8 hours
 * Funding rate mechanism keeps perpetual contract price close to spot price
 */

import { getDb } from "./db";
import { futuresContracts, fundingHistory, positions } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendUserNotification } from "./websocketBroadcaster";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the funding rate calculation job
 */
export function startFundingRateJob() {
  if (isRunning) {
    console.log("[Funding Rate] Already running");
    return;
  }

  console.log("[Funding Rate] Starting...");
  isRunning = true;

  // Check immediately
  checkFundingRates();

  // Then check every minute for contracts that need funding
  intervalId = setInterval(() => {
    checkFundingRates();
  }, 60000); // 1 minute

  console.log("[Funding Rate] Started (check interval: 60s)");
}

/**
 * Stop the funding rate job
 */
export function stopFundingRateJob() {
  if (!isRunning) {
    console.log("[Funding Rate] Not running");
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log("[Funding Rate] Stopped");
}

/**
 * Check if any contracts need funding rate application
 */
async function checkFundingRates() {
  const db = await getDb();
  if (!db) {
    console.error("[Funding Rate] Database not available");
    return;
  }

  try {
    const now = new Date();

    // Get contracts where nextFundingTime has passed
    const contracts = await db
      .select()
      .from(futuresContracts)
      .where(and(eq(futuresContracts.isActive, true), sql`${futuresContracts.nextFundingTime} <= ${now}`));

    if (contracts.length === 0) {
      return;
    }

    console.log(`[Funding Rate] Processing funding for ${contracts.length} contracts`);

    for (const contract of contracts) {
      try {
        await processFunding(contract);
      } catch (error) {
        console.error(`[Funding Rate] Error processing funding for ${contract.symbol}:`, error);
      }
    }
  } catch (error) {
    console.error("[Funding Rate] Error checking funding rates:", error);
  }
}

/**
 * Process funding for a single contract
 */
async function processFunding(contract: any) {
  const db = await getDb();
  if (!db) return;

  console.log(`[Funding Rate] Processing funding for ${contract.symbol}`);

  // Calculate new funding rate based on mark price vs index price
  // Funding Rate = (Mark Price - Index Price) / Index Price
  const markPrice = parseFloat(contract.markPrice);
  const indexPrice = parseFloat(contract.indexPrice);
  const priceDiff = markPrice - indexPrice;
  const newFundingRate = priceDiff / indexPrice;

  // Clamp funding rate to reasonable range (-0.05% to +0.05% per 8 hours)
  const clampedFundingRate = Math.max(-0.0005, Math.min(0.0005, newFundingRate));

  console.log(
    `[Funding Rate] ${contract.symbol}: Mark=${markPrice}, Index=${indexPrice}, Rate=${(clampedFundingRate * 100).toFixed(4)}%`
  );

  // Get all open positions for this contract
  const openPositions = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.symbol, contract.symbol),
        eq(positions.contractType, "perpetual"),
        eq(positions.status, "open")
      )
    );

  let totalFunding = 0;

  // Apply funding to each position
  for (const position of openPositions) {
    const positionValue = parseFloat(position.size) * markPrice;
    const fundingFee = positionValue * clampedFundingRate;

    // Long positions pay funding (negative), short positions receive (positive)
    const actualFee = position.side === "long" ? -fundingFee : fundingFee;

    // Update position funding fee
    await db
      .update(positions)
      .set({
        fundingFee: sql`${positions.fundingFee} + ${actualFee}`,
        unrealizedPnL: sql`${positions.unrealizedPnL} + ${actualFee}`,
      })
      .where(eq(positions.id, position.id));

    totalFunding += Math.abs(fundingFee);

    // Notify user if funding fee is significant (> $1)
    if (Math.abs(actualFee) > 1) {
      sendUserNotification({
        userId: position.userId,
        type: "trade",
        title: "Funding Fee Applied",
        message: `Funding fee ${actualFee >= 0 ? "+" : ""}${actualFee.toFixed(2)} USDT applied to your ${position.side} position on ${contract.symbol}`,
        data: {
          positionId: position.id,
          symbol: contract.symbol,
          fundingFee: actualFee,
          fundingRate: clampedFundingRate,
        },
      });
    }
  }

  // Record funding history
  await db.insert(fundingHistory).values({
    contractId: contract.id,
    symbol: contract.symbol,
    fundingRate: clampedFundingRate.toString(),
    fundingTime: new Date(),
    totalFunding: totalFunding.toString(),
  });

  // Update contract with new funding rate and next funding time
  const nextFundingTime = new Date(Date.now() + contract.fundingInterval * 1000);

  await db
    .update(futuresContracts)
    .set({
      fundingRate: clampedFundingRate.toString(),
      nextFundingTime,
    })
    .where(eq(futuresContracts.id, contract.id));

  console.log(
    `[Funding Rate] ${contract.symbol}: Applied funding to ${openPositions.length} positions. Total: ${totalFunding.toFixed(2)} USDT. Next funding: ${nextFundingTime.toISOString()}`
  );
}

/**
 * Update mark price for a contract
 * Mark price is used for liquidations and funding rate calculations
 */
export async function updateMarkPrice(symbol: string, newMarkPrice: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(futuresContracts)
    .set({
      markPrice: newMarkPrice.toString(),
      lastPrice: newMarkPrice.toString(),
    })
    .where(eq(futuresContracts.symbol, symbol));

  console.log(`[Funding Rate] Updated mark price for ${symbol}: ${newMarkPrice}`);
}

/**
 * Update index price for a contract
 * Index price is the spot price from external exchanges
 */
export async function updateIndexPrice(symbol: string, newIndexPrice: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(futuresContracts)
    .set({
      indexPrice: newIndexPrice.toString(),
    })
    .where(eq(futuresContracts.symbol, symbol));

  console.log(`[Funding Rate] Updated index price for ${symbol}: ${newIndexPrice}`);
}

/**
 * Get funding rate job status
 */
export function getFundingRateStatus() {
  return {
    isRunning,
    checkInterval: 60000,
  };
}
