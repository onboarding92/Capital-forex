/**
 * Margin Call & Liquidation Engine
 * 
 * Monitors margin levels and automatically closes positions when:
 * - Margin Call: Margin level < 120%
 * - Stop Out (Liquidation): Margin level < 50%
 */

import { getDb } from "./db.js";
import { tradingAccounts, forexPositions, marginCalls, notifications } from "../drizzle/schema.js";
import { eq, and, lt } from "drizzle-orm";
import { closePosition } from "./forexTradingEngine.js";

const MARGIN_CALL_LEVEL = 120; // 120%
const STOP_OUT_LEVEL = 50; // 50%

/**
 * Check all trading accounts for margin issues
 * Should run every 5-10 seconds
 */
export async function checkMarginLevels(): Promise<void> {
  const db = getDb();

  try {
    // Get all active accounts with open positions
    const accounts = await db.select().from(tradingAccounts);

    for (const account of accounts) {
      const marginLevel = Number(account.marginLevel);
      const margin = Number(account.margin);

      // Skip accounts with no open positions
      if (margin === 0) continue;

      // Check for Stop Out (Liquidation)
      if (marginLevel < STOP_OUT_LEVEL) {
        await handleStopOut(account.id, account.userId, marginLevel);
        continue;
      }

      // Check for Margin Call
      if (marginLevel < MARGIN_CALL_LEVEL) {
        await handleMarginCall(account.id, account.userId, marginLevel);
      }
    }
  } catch (error) {
    console.error("[Margin Engine] Error checking margin levels:", error);
  }
}

/**
 * Handle margin call - Send warning notification
 */
async function handleMarginCall(accountId: number, userId: number, marginLevel: number): Promise<void> {
  const db = getDb();

  try {
    // Check if there's already an unresolved margin call
    const existingCalls = await db.select().from(marginCalls).where(
      and(
        eq(marginCalls.accountId, accountId),
        eq(marginCalls.resolved, false)
      )
    );

    if (existingCalls && existingCalls.length > 0) {
      // Already notified, skip
      return;
    }

    // Get account details
    const accounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, accountId));
    if (!accounts || accounts.length === 0) return;

    const account = accounts[0];

    // Create margin call record
    await db.insert(marginCalls).values({
      userId,
      accountId,
      marginLevel: marginLevel.toString(),
      equity: account.equity,
      margin: account.margin,
      resolved: false,
    });

    // Send notification
    await db.insert(notifications).values({
      userId,
      type: "margin_call",
      title: "⚠️ Margin Call Warning",
      message: `Your margin level is ${marginLevel.toFixed(2)}%. Please deposit funds or close positions to avoid liquidation. Stop out level: ${STOP_OUT_LEVEL}%`,
      read: false,
    });

    console.log(`[Margin Engine] Margin call issued for account ${accountId} (${marginLevel.toFixed(2)}%)`);
  } catch (error) {
    console.error("[Margin Engine] Error handling margin call:", error);
  }
}

/**
 * Handle stop out - Automatically close positions
 */
async function handleStopOut(accountId: number, userId: number, marginLevel: number): Promise<void> {
  const db = getDb();

  try {
    console.log(`[Margin Engine] Stop out triggered for account ${accountId} (${marginLevel.toFixed(2)}%)`);

    // Get all open positions for this account
    const openPositions = await db.select().from(forexPositions).where(
      and(
        eq(forexPositions.accountId, accountId),
        eq(forexPositions.status, "open")
      )
    );

    if (!openPositions || openPositions.length === 0) {
      console.log(`[Margin Engine] No open positions found for account ${accountId}`);
      return;
    }

    // Sort positions by loss (close most losing positions first)
    const sortedPositions = openPositions.sort((a, b) => Number(a.profit) - Number(b.profit));

    let closedCount = 0;

    // Close positions one by one until margin level is acceptable
    for (const position of sortedPositions) {
      try {
        // Mark position as liquidated
        await db.update(forexPositions).set({
          status: "liquidated",
        }).where(eq(forexPositions.id, position.id));

        // Close the position
        await closePosition(position.id);
        closedCount++;

        console.log(`[Margin Engine] Liquidated position ${position.id} (${position.symbol} ${position.side} ${position.volume})`);

        // Check if margin level is now acceptable
        const updatedAccounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, accountId));
        if (updatedAccounts && updatedAccounts.length > 0) {
          const updatedMarginLevel = Number(updatedAccounts[0].marginLevel);
          
          if (updatedMarginLevel >= MARGIN_CALL_LEVEL || Number(updatedAccounts[0].margin) === 0) {
            // Margin level restored
            break;
          }
        }
      } catch (error) {
        console.error(`[Margin Engine] Error closing position ${position.id}:`, error);
      }
    }

    // Send liquidation notification
    await db.insert(notifications).values({
      userId,
      type: "liquidation",
      title: "🚨 Account Liquidated",
      message: `Your margin level dropped to ${marginLevel.toFixed(2)}%. ${closedCount} position(s) were automatically closed to protect your account.`,
      read: false,
    });

    // Resolve any pending margin calls
    await db.update(marginCalls).set({
      resolved: true,
      resolvedAt: new Date(),
    }).where(
      and(
        eq(marginCalls.accountId, accountId),
        eq(marginCalls.resolved, false)
      )
    );

    console.log(`[Margin Engine] Stop out completed for account ${accountId}. Closed ${closedCount} positions.`);
  } catch (error) {
    console.error("[Margin Engine] Error handling stop out:", error);
  }
}

/**
 * Calculate negative balance protection
 * If account balance goes negative after liquidation, reset to 0
 */
export async function applyNegativeBalanceProtection(accountId: number): Promise<void> {
  const db = getDb();

  try {
    const accounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, accountId));
    if (!accounts || accounts.length === 0) return;

    const account = accounts[0];
    const balance = Number(account.balance);

    if (balance < 0) {
      // Reset balance to 0 (negative balance protection)
      await db.update(tradingAccounts).set({
        balance: "0",
        equity: "0",
        margin: "0",
        freeMargin: "0",
        marginLevel: "0",
      }).where(eq(tradingAccounts.id, accountId));

      // Notify user
      await db.insert(notifications).values({
        userId: account.userId,
        type: "system",
        title: "Negative Balance Protection Applied",
        message: `Your account balance was reset to $0 due to negative balance protection. Original balance: $${balance.toFixed(2)}`,
        read: false,
      });

      console.log(`[Margin Engine] Negative balance protection applied for account ${accountId}. Reset from $${balance.toFixed(2)} to $0`);
    }
  } catch (error) {
    console.error("[Margin Engine] Error applying negative balance protection:", error);
  }
}

/**
 * Start margin monitoring job
 * Runs every 10 seconds
 */
export function startMarginMonitoring(): NodeJS.Timeout {
  console.log("[Margin Engine] Starting margin monitoring (interval: 10s)");
  
  return setInterval(async () => {
    await checkMarginLevels();
  }, 10000); // 10 seconds
}
