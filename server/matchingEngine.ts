/**
 * Matching Engine for BitChange Pro
 * 
 * Implements automatic order matching using price-time priority algorithm:
 * 1. Orders are matched at the best available price
 * 2. Orders at the same price are matched in chronological order (FIFO)
 * 3. Partial fills are supported
 * 4. All trades are logged with full audit trail
 */

import { getDb } from "./db";
import { orders, trades, wallets, notifications } from "../drizzle/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { updatePriceCache } from "./advancedMatchingEngine";

export interface MatchResult {
  matched: boolean;
  trades: Array<{
    buyOrderId: number;
    sellOrderId: number;
    price: number;
    quantity: number;
    total: number;
  }>;
  partialFill?: {
    orderId: number;
    remainingQuantity: number;
  };
}

/**
 * Match a new order against existing orders in the order book
 * 
 * Algorithm:
 * 1. Find all matching orders on the opposite side
 * 2. Sort by price (best price first) and then by time (oldest first)
 * 3. Match orders until the new order is fully filled or no more matches
 * 4. Update order statuses and wallet balances
 * 5. Create trade records
 */
export async function matchOrder(orderId: number): Promise<MatchResult> {
  const result: MatchResult = {
    matched: false,
    trades: [],
  };

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the order to match
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== "pending") {
    return result;
  }

  const isBuyOrder = order.type === "buy";
  const oppositeType = isBuyOrder ? "sell" : "buy";

  // Find matching orders on the opposite side
  // Buy orders match with sell orders at or below the buy price
  // Sell orders match with buy orders at or above the sell price
  const matchingOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.pair, order.pair),
        eq(orders.type, oppositeType),
        eq(orders.status, "pending"),
        isBuyOrder
          ? sql`${orders.price} <= ${order.price}` // Buy: match sells at or below buy price
          : sql`${orders.price} >= ${order.price}` // Sell: match buys at or above sell price
      )
    )
    .orderBy(
      isBuyOrder ? asc(orders.price) : desc(orders.price), // Best price first
      asc(orders.createdAt) // Oldest first (FIFO)
    );

  if (matchingOrders.length === 0) {
    return result;
  }

  let remainingQuantity = order.quantity - order.filledQuantity;

  // Match orders
  for (const matchingOrder of matchingOrders) {
    if (remainingQuantity <= 0) break;

    const matchingRemainingQty = matchingOrder.quantity - matchingOrder.filledQuantity;
    const matchQuantity = Math.min(remainingQuantity, matchingRemainingQty);

    // Use the price of the existing order (maker price)
    const tradePrice = matchingOrder.price;
    const tradeTotal = matchQuantity * tradePrice;

    // Create trade record
    const [trade] = await db.insert(trades).values({
      buyOrderId: isBuyOrder ? order.id : matchingOrder.id,
      sellOrderId: isBuyOrder ? matchingOrder.id : order.id,
      pair: order.pair,
      price: tradePrice,
      quantity: matchQuantity,
      total: tradeTotal,
      buyerUserId: isBuyOrder ? order.userId : matchingOrder.userId,
      sellerUserId: isBuyOrder ? matchingOrder.userId : order.userId,
      executedAt: new Date(),
    });

    // Update order filled quantities
    await db
      .update(orders)
      .set({
        filledQuantity: order.filledQuantity + matchQuantity,
        status:
          order.filledQuantity + matchQuantity >= order.quantity
            ? "completed"
            : "partial",
      })
      .where(eq(orders.id, order.id));

    await db
      .update(orders)
      .set({
        filledQuantity: matchingOrder.filledQuantity + matchQuantity,
        status:
          matchingOrder.filledQuantity + matchQuantity >= matchingOrder.quantity
            ? "completed"
            : "partial",
      })
      .where(eq(orders.id, matchingOrder.id));

    // Update wallet balances
    const [baseCurrency, quoteCurrency] = order.pair.split("/");

    if (isBuyOrder) {
      // Buyer receives base currency, seller receives quote currency
      // Buyer's quote currency already deducted when order was placed
      await db
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${matchQuantity}`,
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.currency, baseCurrency)
          )
        );

      // Seller receives quote currency
      await db
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${tradeTotal}`,
        })
        .where(
          and(
            eq(wallets.userId, matchingOrder.userId),
            eq(wallets.currency, quoteCurrency)
          )
        );

      // Seller's base currency already deducted when order was placed
    } else {
      // Seller receives quote currency, buyer receives base currency
      // Seller's base currency already deducted when order was placed
      await db
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${tradeTotal}`,
        })
        .where(
          and(
            eq(wallets.userId, order.userId),
            eq(wallets.currency, quoteCurrency)
          )
        );

      // Buyer receives base currency
      await db
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${matchQuantity}`,
        })
        .where(
          and(
            eq(wallets.userId, matchingOrder.userId),
            eq(wallets.currency, baseCurrency)
          )
        );

      // Buyer's quote currency already deducted when order was placed
    }

    result.trades.push({
      buyOrderId: isBuyOrder ? order.id : matchingOrder.id,
      sellOrderId: isBuyOrder ? matchingOrder.id : order.id,
      price: tradePrice,
      quantity: matchQuantity,
      total: tradeTotal,
    });

    // Send notifications to both users
    try {
      await db.insert(notifications).values([
        {
          userId: order.userId,
          title: "Order Matched",
          message: `Your ${order.type} order for ${matchQuantity} ${baseCurrency} at $${tradePrice} has been matched!`,
          isRead: false,
          createdAt: new Date(),
        },
        {
          userId: matchingOrder.userId,
          title: "Order Matched",
          message: `Your ${matchingOrder.type} order for ${matchQuantity} ${baseCurrency} at $${tradePrice} has been matched!`,
          isRead: false,
          createdAt: new Date(),
        },
      ]);
    } catch (notifError) {
      console.error("Failed to send order match notifications:", notifError);
    }

    // Update price cache for SL/TP monitoring
    updatePriceCache(order.pair, tradePrice);

    remainingQuantity -= matchQuantity;
    result.matched = true;
  }

  // If order is partially filled, record remaining quantity
  if (remainingQuantity > 0) {
    result.partialFill = {
      orderId: order.id,
      remainingQuantity,
    };
  }

  return result;
}

/**
 * Run matching engine for all pending orders
 * This should be called periodically (e.g., every few seconds)
 */
export async function runMatchingEngine(): Promise<{
  processedOrders: number;
  totalTrades: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pendingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "pending"))
    .orderBy(asc(orders.createdAt));

  let processedOrders = 0;
  let totalTrades = 0;

  for (const order of pendingOrders) {
    const result = await matchOrder(order.id);
    if (result.matched) {
      processedOrders++;
      totalTrades += result.trades.length;
    }
  }

  return {
    processedOrders,
    totalTrades,
  };
}

/**
 * Get matching engine statistics
 */
export async function getMatchingEngineStats() {
  const db = await getDb();
  if (!db) return { pendingOrders: 0, totalTrades: 0, last24hTrades: 0 };

  const [pendingOrdersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  const [totalTradesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades);

  const [last24hTrades] = await db
    .select({ count: sql<number>`count(*)` })
    .from(trades)
    .where(sql`${trades.executedAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`);

  return {
    pendingOrders: pendingOrdersCount?.count || 0,
    totalTrades: totalTradesCount?.count || 0,
    last24hTrades: last24hTrades?.count || 0,
  };
}
