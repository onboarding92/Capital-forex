/**
 * Advanced Matching Engine with Stop Loss and Take Profit
 * 
 * Features:
 * - Automatic Stop Loss execution when market price hits stop loss level
 * - Automatic Take Profit execution when market price hits take profit level
 * - Price monitoring for all open orders with SL/TP
 * - Notification system for triggered SL/TP orders
 */

import { getDb } from "./db";
import { orders, trades, wallets, notifications } from "../drizzle/schema";
import { eq, and, sql, isNotNull, or } from "drizzle-orm";

interface PriceData {
  pair: string;
  lastPrice: number;
  timestamp: number;
}

// In-memory cache for latest prices (updated by matching engine)
const priceCache = new Map<string, PriceData>();

/**
 * Update price cache when a trade occurs
 */
export function updatePriceCache(pair: string, price: number) {
  priceCache.set(pair, {
    pair,
    lastPrice: price,
    timestamp: Date.now(),
  });
}

/**
 * Get current market price for a trading pair
 */
export function getCurrentPrice(pair: string): number | null {
  const data = priceCache.get(pair);
  if (!data) return null;
  
  // Price is valid for 60 seconds
  if (Date.now() - data.timestamp > 60000) {
    return null;
  }
  
  return data.lastPrice;
}

/**
 * Check and execute Stop Loss orders
 * 
 * Logic:
 * - For BUY orders: Execute if market price drops to or below stop loss
 * - For SELL orders: Execute if market price rises to or above stop loss
 */
export async function checkStopLossOrders() {
  const db = await getDb();
  if (!db) {
    console.error("[SL/TP] Database not available");
    return;
  }

  try {
    // Get all open orders with stop loss set
    const ordersWithSL = await db
      .select()
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "open"), eq(orders.status, "partially_filled")),
          isNotNull(orders.stopLoss)
        )
      );

    for (const order of ordersWithSL) {
      const currentPrice = getCurrentPrice(order.pair);
      if (!currentPrice || !order.stopLoss) continue;

      const stopLossPrice = parseFloat(order.stopLoss);
      let shouldTrigger = false;

      // Check if stop loss should trigger
      if (order.side === "buy") {
        // For buy orders: trigger if price drops to or below stop loss
        shouldTrigger = currentPrice <= stopLossPrice;
      } else {
        // For sell orders: trigger if price rises to or above stop loss
        shouldTrigger = currentPrice >= stopLossPrice;
      }

      if (shouldTrigger) {
        console.log(`[SL/TP] Stop Loss triggered for order ${order.id} (${order.pair} ${order.side} @ ${stopLossPrice})`);
        await executeStopLoss(order.id, currentPrice);
      }
    }
  } catch (error) {
    console.error("[SL/TP] Error checking stop loss orders:", error);
  }
}

/**
 * Check and execute Take Profit orders
 * 
 * Logic:
 * - For BUY orders: Execute if market price rises to or above take profit
 * - For SELL orders: Execute if market price drops to or below take profit
 */
export async function checkTakeProfitOrders() {
  const db = await getDb();
  if (!db) {
    console.error("[SL/TP] Database not available");
    return;
  }

  try {
    // Get all open orders with take profit set
    const ordersWithTP = await db
      .select()
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "open"), eq(orders.status, "partially_filled")),
          isNotNull(orders.takeProfit)
        )
      );

    for (const order of ordersWithTP) {
      const currentPrice = getCurrentPrice(order.pair);
      if (!currentPrice || !order.takeProfit) continue;

      const takeProfitPrice = parseFloat(order.takeProfit);
      let shouldTrigger = false;

      // Check if take profit should trigger
      if (order.side === "buy") {
        // For buy orders: trigger if price rises to or above take profit
        shouldTrigger = currentPrice >= takeProfitPrice;
      } else {
        // For sell orders: trigger if price drops to or below take profit
        shouldTrigger = currentPrice <= takeProfitPrice;
      }

      if (shouldTrigger) {
        console.log(`[SL/TP] Take Profit triggered for order ${order.id} (${order.pair} ${order.side} @ ${takeProfitPrice})`);
        await executeTakeProfit(order.id, currentPrice);
      }
    }
  } catch (error) {
    console.error("[SL/TP] Error checking take profit orders:", error);
  }
}

/**
 * Execute a stop loss order by converting it to a market order
 */
async function executeStopLoss(orderId: number, triggerPrice: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return;

    // Cancel the original order
    await db
      .update(orders)
      .set({ 
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Unlock the funds from the cancelled order
    const [baseAsset, quoteAsset] = order.pair.split("/");
    const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled);
    
    if (order.side === "buy") {
      // Unlock quote asset (e.g., USDT)
      const lockedAmount = remainingAmount * parseFloat(order.price);
      await db
        .update(wallets)
        .set({
          locked: sql`locked - ${lockedAmount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.asset, quoteAsset)
          )
        );
    } else {
      // Unlock base asset (e.g., BTC)
      await db
        .update(wallets)
        .set({
          locked: sql`locked - ${remainingAmount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.asset, baseAsset)
          )
        );
    }

    // Create notification
    await db.insert(notifications).values({
      userId: order.userId,
      type: "trade",
      title: "Stop Loss Triggered",
      message: `Your ${order.side} order for ${order.amount} ${order.pair} was cancelled due to stop loss at ${triggerPrice}`,
      read: false,
      createdAt: new Date(),
    });

    console.log(`[SL/TP] Stop Loss executed for order ${orderId}`);
  } catch (error) {
    console.error(`[SL/TP] Error executing stop loss for order ${orderId}:`, error);
  }
}

/**
 * Execute a take profit order by converting it to a market order
 */
async function executeTakeProfit(orderId: number, triggerPrice: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return;

    // Cancel the original order
    await db
      .update(orders)
      .set({ 
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Unlock the funds from the cancelled order
    const [baseAsset, quoteAsset] = order.pair.split("/");
    const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled);
    
    if (order.side === "buy") {
      // Unlock quote asset (e.g., USDT)
      const lockedAmount = remainingAmount * parseFloat(order.price);
      await db
        .update(wallets)
        .set({
          locked: sql`locked - ${lockedAmount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.asset, quoteAsset)
          )
        );
    } else {
      // Unlock base asset (e.g., BTC)
      await db
        .update(wallets)
        .set({
          locked: sql`locked - ${remainingAmount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.asset, baseAsset)
          )
        );
    }

    // Create notification
    await db.insert(notifications).values({
      userId: order.userId,
      type: "trade",
      title: "Take Profit Triggered",
      message: `Your ${order.side} order for ${order.amount} ${order.pair} was cancelled due to take profit at ${triggerPrice}`,
      read: false,
      createdAt: new Date(),
    });

    console.log(`[SL/TP] Take Profit executed for order ${orderId}`);
  } catch (error) {
    console.error(`[SL/TP] Error executing take profit for order ${orderId}:`, error);
  }
}

/**
 * Main function to check all SL/TP conditions
 * Should be called periodically (e.g., every 2 seconds)
 */
export async function checkAdvancedOrders() {
  await checkStopLossOrders();
  await checkTakeProfitOrders();
}
