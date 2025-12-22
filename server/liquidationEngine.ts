/**
 * Liquidation Engine
 * 
 * Monitors open positions and automatically liquidates positions
 * that reach their liquidation price
 */

import { getDb } from "./db";
import { positions, liquidationQueue, marginAccounts, insuranceFund } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendUserNotification } from "./websocketBroadcaster";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the liquidation engine
 */
export function startLiquidationEngine() {
  if (isRunning) {
    console.log("[Liquidation Engine] Already running");
    return;
  }

  console.log("[Liquidation Engine] Starting...");
  isRunning = true;

  // Run immediately
  checkLiquidations();

  // Then run every 5 seconds
  intervalId = setInterval(() => {
    checkLiquidations();
  }, 5000);

  console.log("[Liquidation Engine] Started (check interval: 5s)");
}

/**
 * Stop the liquidation engine
 */
export function stopLiquidationEngine() {
  if (!isRunning) {
    console.log("[Liquidation Engine] Not running");
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  isRunning = false;
  console.log("[Liquidation Engine] Stopped");
}

/**
 * Check all open positions for liquidation
 */
async function checkLiquidations() {
  const db = await getDb();
  if (!db) {
    console.error("[Liquidation Engine] Database not available");
    return;
  }

  try {
    // Get all open positions
    const openPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, "open"));

    if (openPositions.length === 0) {
      return;
    }

    console.log(`[Liquidation Engine] Checking ${openPositions.length} open positions`);

    for (const position of openPositions) {
      try {
        await checkPositionLiquidation(position);
      } catch (error) {
        console.error(`[Liquidation Engine] Error checking position ${position.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Liquidation Engine] Error checking liquidations:", error);
  }
}

/**
 * Check if a single position should be liquidated
 */
async function checkPositionLiquidation(position: any) {
  const db = await getDb();
  if (!db) return;

  // Get current mark price (simplified - in production use real mark price)
  const currentPrice = 49000; // TODO: Get from price feed

  const liquidationPrice = parseFloat(position.liquidationPrice);
  const shouldLiquidate =
    (position.side === "long" && currentPrice <= liquidationPrice) ||
    (position.side === "short" && currentPrice >= liquidationPrice);

  if (!shouldLiquidate) {
    return;
  }

  console.log(`[Liquidation Engine] Liquidating position ${position.id} for user ${position.userId}`);

  // Add to liquidation queue
  await db.insert(liquidationQueue).values({
    positionId: position.id,
    userId: position.userId,
    symbol: position.symbol,
    side: position.side,
    size: position.size,
    entryPrice: position.entryPrice,
    liquidationPrice: position.liquidationPrice,
    currentPrice: currentPrice.toString(),
    leverage: position.leverage,
    status: "queued",
  });

  // Execute liquidation
  await executeLiquidation(position, currentPrice);
}

/**
 * Execute liquidation for a position
 */
async function executeLiquidation(position: any, liquidationPrice: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Update liquidation queue status
    await db
      .update(liquidationQueue)
      .set({ status: "processing", processedAt: new Date() })
      .where(eq(liquidationQueue.positionId, position.id));

    // Calculate loss
    const entryPrice = parseFloat(position.entryPrice);
    const size = parseFloat(position.size);
    const margin = parseFloat(position.margin);

    // Loss is typically the entire margin in liquidation
    const loss = margin;

    // Update position status
    await db
      .update(positions)
      .set({
        status: "liquidated",
        markPrice: liquidationPrice.toString(),
        realizedPnL: (-loss).toString(),
        closedAt: new Date(),
      })
      .where(eq(positions.id, position.id));

    // Update margin account (release locked margin, but it's lost)
    const quoteAsset = position.symbol.split("/")[1];
    const [marginAccount] = await db
      .select()
      .from(marginAccounts)
      .where(and(eq(marginAccounts.userId, position.userId), eq(marginAccounts.currency, quoteAsset)))
      .limit(1);

    if (marginAccount) {
      await db
        .update(marginAccounts)
        .set({
          locked: sql`GREATEST(0, ${marginAccounts.locked} - ${margin})`,
          balance: sql`GREATEST(0, ${marginAccounts.balance} - ${loss})`,
        })
        .where(eq(marginAccounts.id, marginAccount.id));

      // Calculate new margin level
      const newBalance = Math.max(0, parseFloat(marginAccount.balance) - loss);
      const newLocked = Math.max(0, parseFloat(marginAccount.locked) - margin);
      const marginLevel = newLocked > 0 ? (newBalance / newLocked) * 100 : 0;

      await db
        .update(marginAccounts)
        .set({ marginLevel: marginLevel.toString() })
        .where(eq(marginAccounts.id, marginAccount.id));
    }

    // Add loss to insurance fund
    const [fund] = await db
      .select()
      .from(insuranceFund)
      .where(eq(insuranceFund.currency, quoteAsset))
      .limit(1);

    if (fund) {
      await db
        .update(insuranceFund)
        .set({
          balance: sql`${insuranceFund.balance} + ${loss}`,
          totalContributions: sql`${insuranceFund.totalContributions} + ${loss}`,
        })
        .where(eq(insuranceFund.id, fund.id));
    }

    // Update liquidation queue
    await db
      .update(liquidationQueue)
      .set({ status: "completed" })
      .where(eq(liquidationQueue.positionId, position.id));

    // Send notification to user
    sendUserNotification({
      userId: position.userId,
      type: "trade",
      title: "Position Liquidated",
      message: `Your ${position.side} position for ${position.symbol} was liquidated at ${liquidationPrice.toFixed(2)}. Loss: ${loss.toFixed(2)} ${quoteAsset}`,
      data: {
        positionId: position.id,
        symbol: position.symbol,
        side: position.side,
        liquidationPrice,
        loss,
      },
    });

    console.log(`[Liquidation Engine] Successfully liquidated position ${position.id}`);
  } catch (error) {
    console.error(`[Liquidation Engine] Failed to liquidate position ${position.id}:`, error);

    // Update liquidation queue status
    await db
      .update(liquidationQueue)
      .set({ status: "failed" })
      .where(eq(liquidationQueue.positionId, position.id));
  }
}

/**
 * Check margin level and send margin call warnings
 */
export async function checkMarginCalls() {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all margin accounts with open positions
    const accounts = await db.select().from(marginAccounts);

    for (const account of accounts) {
      const marginLevel = parseFloat(account.marginLevel);

      // Send margin call if margin level is below 120%
      if (marginLevel > 0 && marginLevel < 120) {
        sendUserNotification({
          userId: account.userId,
          type: "security",
          title: "Margin Call Warning",
          message: `Your margin level is ${marginLevel.toFixed(2)}%. Add more funds to avoid liquidation.`,
          data: {
            marginLevel,
            currency: account.currency,
            balance: account.balance,
          },
        });

        console.log(`[Liquidation Engine] Margin call sent to user ${account.userId}, level: ${marginLevel.toFixed(2)}%`);
      }
    }
  } catch (error) {
    console.error("[Liquidation Engine] Error checking margin calls:", error);
  }
}

/**
 * Get liquidation engine status
 */
export function getLiquidationEngineStatus() {
  return {
    isRunning,
    checkInterval: 5000,
  };
}
