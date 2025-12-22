/**
 * Trading Engine - Order Matching System
 * 
 * Implements a price-time priority matching algorithm for spot trading.
 * 
 * Features:
 * - Market orders (execute immediately at best available price)
 * - Limit orders (execute at specified price or better)
 * - Partial fills (order can be filled in multiple trades)
 * - Order book management (bids and asks sorted by price-time)
 * - Automatic balance updates after trade execution
 * - Trading fee calculation (maker/taker fees)
 * 
 * Matching Algorithm:
 * 1. Price priority: Better prices match first
 * 2. Time priority: Earlier orders match first at same price
 * 3. Pro-rata for same price-time (not implemented yet)
 */

import { getDb } from "./db";
import { orders, trades, wallets, users } from "../drizzle/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

// Trading fees (0.1% maker, 0.2% taker)
const MAKER_FEE = 0.001; // 0.1%
const TAKER_FEE = 0.002; // 0.2%

export interface Order {
  id: number;
  userId: number;
  pair: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price: string;
  amount: string;
  filled: string;
  status: "open" | "partially_filled" | "filled" | "cancelled";
  createdAt: Date;
}

export interface Trade {
  id: number;
  buyOrderId: number;
  sellOrderId: number;
  buyerId: number;
  sellerId: number;
  pair: string;
  price: string;
  amount: string;
  createdAt: Date;
}

export interface OrderBook {
  pair: string;
  bids: Array<{ price: string; amount: string; total: string }>;
  asks: Array<{ price: string; amount: string; total: string }>;
}

/**
 * Place a new order and attempt to match it
 */
export async function placeOrder(params: {
  userId: number;
  pair: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price?: string;
  amount: string;
}): Promise<{ success: boolean; orderId?: number; trades?: Trade[]; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database connection failed" };

  const { userId, pair, side, type, price, amount } = params;

  try {
    // Parse trading pair (e.g., "BTC/USDT" -> base: BTC, quote: USDT)
    const [baseAsset, quoteAsset] = pair.split("/");
    if (!baseAsset || !quoteAsset) {
      return { success: false, error: "Invalid trading pair format. Use BASE/QUOTE (e.g., BTC/USDT)" };
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    // Validate price for limit orders
    let priceNum = 0;
    if (type === "limit") {
      if (!price) {
        return { success: false, error: "Price required for limit orders" };
      }
      priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return { success: false, error: "Invalid price" };
      }
    }

    // Check user balance
    const assetToCheck = side === "buy" ? quoteAsset : baseAsset;
    const [wallet] = await db.select()
      .from(wallets)
      .where(and(
        eq(wallets.userId, userId),
        eq(wallets.asset, assetToCheck)
      ))
      .limit(1);

    if (!wallet) {
      return { success: false, error: `No ${assetToCheck} wallet found` };
    }

    // Calculate required balance
    let requiredBalance = 0;
    if (side === "buy") {
      // Buying: need quote asset (e.g., USDT to buy BTC)
      if (type === "market") {
        // For market orders, estimate required balance (use current best ask price * 1.1 for safety)
        const bestAsk = await getBestAskPrice(db, pair);
        if (!bestAsk) {
          return { success: false, error: "No liquidity available for market buy order" };
        }
        requiredBalance = parseFloat(bestAsk) * amountNum * 1.1; // 10% buffer
      } else {
        requiredBalance = priceNum * amountNum;
      }
      requiredBalance *= (1 + TAKER_FEE); // Add taker fee
    } else {
      // Selling: need base asset (e.g., BTC to sell for USDT)
      requiredBalance = amountNum;
    }

    const availableBalance = parseFloat(wallet.balance);
    if (availableBalance < requiredBalance) {
      return {
        success: false,
        error: `Insufficient ${assetToCheck} balance. Required: ${requiredBalance.toFixed(8)}, Available: ${availableBalance.toFixed(8)}`,
      };
    }

    // Create order
    console.log(`[PLACE_ORDER] Creating order:`, { userId, pair, side, type, price, amount });
    const [newOrder] = await db.insert(orders).values({
      userId,
      pair,
      side,
      type,
      price: type === "limit" ? price! : "0", // Market orders have price 0 initially
      amount,
      filled: "0",
      status: "open",
    }).$returningId();

    const orderId = newOrder.id;
    console.log(`[PLACE_ORDER] Order created with ID: ${orderId}`);

    // Lock balance (deduct from available balance)
    if (side === "buy") {
      await db.update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${requiredBalance}`,
          locked: sql`${wallets.locked} + ${requiredBalance}`,
        })
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.asset, assetToCheck)
        ));
    } else {
      await db.update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amountNum}`,
          locked: sql`${wallets.locked} + ${amountNum}`,
        })
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.asset, assetToCheck)
        ));
    }

    // Attempt to match order
    console.log(`[PLACE_ORDER] Calling matchOrder for order ${orderId}`);
    const executedTrades = await matchOrder(db, orderId);
    console.log(`[PLACE_ORDER] matchOrder returned ${executedTrades.length} trades`);

    console.log(`[PLACE_ORDER] Order placement complete. Success: true, Trades: ${executedTrades.length}`);
    return {
      success: true,
      orderId,
      trades: executedTrades,
    };
  } catch (error: any) {
    console.error("Error placing order:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Match an order against the order book
 */
export async function matchOrder(db: any, orderId: number): Promise<Trade[]> {
  console.log(`[MATCHING] ========== Starting match for order ${orderId} ==========`);
  const executedTrades: Trade[] = [];

  try {
    // Get the order
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    console.log(`[MATCHING] Order details:`, {
      id: order?.id,
      userId: order?.userId,
      pair: order?.pair,
      side: order?.side,
      type: order?.type,
      price: order?.price,
      amount: order?.amount,
      filled: order?.filled,
      status: order?.status,
    });

    if (!order || order.status === "filled" || order.status === "cancelled") {
      console.log(`[MATCHING] Order not eligible for matching (status: ${order?.status || 'not found'})`);
      return executedTrades;
    }

    const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled);
    console.log(`[MATCHING] Remaining amount to fill: ${remainingAmount}`);
    if (remainingAmount <= 0) {
      console.log(`[MATCHING] No remaining amount, exiting`);
      return executedTrades;
    }

    // Get opposite side orders (sorted by price-time priority)
    const oppositeSide = order.side === "buy" ? "sell" : "buy";
    console.log(`[MATCHING] Looking for opposite side orders: ${oppositeSide}`);
    const oppositeOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.pair, order.pair),
        eq(orders.side, oppositeSide),
        or(
          eq(orders.status, "open"),
          eq(orders.status, "partially_filled")
        )
      ))
      .orderBy(
        order.side === "buy" ? asc(orders.price) : desc(orders.price), // Best price first
        asc(orders.createdAt) // Time priority
      );

    console.log(`[MATCHING] Found ${oppositeOrders.length} opposite orders`);
    if (oppositeOrders.length > 0) {
      console.log(`[MATCHING] Opposite orders:`, oppositeOrders.map((o: any) => ({
        id: o.id,
        userId: o.userId,
        price: o.price,
        amount: o.amount,
        filled: o.filled,
        status: o.status,
      })));
    }

    for (const oppositeOrder of oppositeOrders) {
      const currentRemaining = parseFloat(order.amount) - parseFloat(order.filled);
      if (currentRemaining <= 0) break;

      // Check if prices match
      const orderPrice = parseFloat(order.price);
      const oppositePrice = parseFloat(oppositeOrder.price);

      console.log(`[MATCHING] Checking opposite order ${oppositeOrder.id}:`);
      console.log(`[MATCHING]   Order price: ${orderPrice} (type: ${typeof orderPrice})`);
      console.log(`[MATCHING]   Opposite price: ${oppositePrice} (type: ${typeof oppositePrice})`);
      console.log(`[MATCHING]   Order side: ${order.side}, type: ${order.type}`);

      let canMatch = false;
      if (order.type === "market") {
        canMatch = true; // Market orders match at any price
        console.log(`[MATCHING]   Market order - can match: true`);
      } else if (order.side === "buy" && orderPrice >= oppositePrice) {
        canMatch = true; // Buy limit order matches if price >= ask price
        console.log(`[MATCHING]   Buy order: ${orderPrice} >= ${oppositePrice} = true`);
      } else if (order.side === "sell" && orderPrice <= oppositePrice) {
        canMatch = true; // Sell limit order matches if price <= bid price
        console.log(`[MATCHING]   Sell order: ${orderPrice} <= ${oppositePrice} = true`);
      } else {
        console.log(`[MATCHING]   Price mismatch - cannot match`);
      }

      if (!canMatch) {
        console.log(`[MATCHING]   Skipping this order (canMatch = false)`);
        continue;
      }

      // Calculate trade amount
      const oppositeRemaining = parseFloat(oppositeOrder.amount) - parseFloat(oppositeOrder.filled);
      const tradeAmount = Math.min(currentRemaining, oppositeRemaining);
      const tradePrice = oppositePrice; // Taker pays maker's price

      console.log(`[MATCHING]   ✅ MATCH FOUND! Executing trade:`);
      console.log(`[MATCHING]     Trade amount: ${tradeAmount}`);
      console.log(`[MATCHING]     Trade price: ${tradePrice}`);
      console.log(`[MATCHING]     Buyer: ${order.side === "buy" ? order.userId : oppositeOrder.userId}`);
      console.log(`[MATCHING]     Seller: ${order.side === "sell" ? order.userId : oppositeOrder.userId}`);

      // Execute trade
      await executeTrade(db, {
        buyOrderId: order.side === "buy" ? order.id : oppositeOrder.id,
        sellOrderId: order.side === "sell" ? order.id : oppositeOrder.id,
        buyerId: order.side === "buy" ? order.userId : oppositeOrder.userId,
        sellerId: order.side === "sell" ? order.userId : oppositeOrder.userId,
        pair: order.pair,
        price: tradePrice.toString(),
        amount: tradeAmount.toString(),
      });

      // Update order filled amounts
      await db.update(orders)
        .set({
          filled: sql`${orders.filled} + ${tradeAmount}`,
          status: sql`CASE 
            WHEN ${orders.filled} + ${tradeAmount} >= ${orders.amount} THEN 'filled'
            ELSE 'partially_filled'
          END`,
        })
        .where(eq(orders.id, order.id));

      await db.update(orders)
        .set({
          filled: sql`${orders.filled} + ${tradeAmount}`,
          status: sql`CASE 
            WHEN ${orders.filled} + ${tradeAmount} >= ${orders.amount} THEN 'filled'
            ELSE 'partially_filled'
          END`,
        })
        .where(eq(orders.id, oppositeOrder.id));

      // Record trade
      const [trade] = await db.insert(trades).values({
        buyOrderId: order.side === "buy" ? order.id : oppositeOrder.id,
        sellOrderId: order.side === "sell" ? order.id : oppositeOrder.id,
        buyerId: order.side === "buy" ? order.userId : oppositeOrder.userId,
        sellerId: order.side === "sell" ? order.userId : oppositeOrder.userId,
        pair: order.pair,
        price: tradePrice.toString(),
        amount: tradeAmount.toString(),
      }).$returningId();

      executedTrades.push({
        id: trade.id,
        buyOrderId: order.side === "buy" ? order.id : oppositeOrder.id,
        sellOrderId: order.side === "sell" ? order.id : oppositeOrder.id,
        buyerId: order.side === "buy" ? order.userId : oppositeOrder.userId,
        sellerId: order.side === "sell" ? order.userId : oppositeOrder.userId,
        pair: order.pair,
        price: tradePrice.toString(),
        amount: tradeAmount.toString(),
        createdAt: new Date(),
      });
    }

    // If market order not fully filled, cancel remaining
    if (order.type === "market") {
      const finalFilled = parseFloat(order.filled) + executedTrades.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      if (finalFilled < parseFloat(order.amount)) {
        await db.update(orders)
          .set({ status: "cancelled" })
          .where(eq(orders.id, orderId));
      }
    }

    return executedTrades;
  } catch (error) {
    console.error("Error matching order:", error);
    return executedTrades;
  }
}

/**
 * Execute a trade between two orders
 */
async function executeTrade(db: any, params: {
  buyOrderId: number;
  sellOrderId: number;
  buyerId: number;
  sellerId: number;
  pair: string;
  price: string;
  amount: string;
}) {
  const { buyerId, sellerId, pair, price, amount } = params;
  const [baseAsset, quoteAsset] = pair.split("/");

  const priceNum = parseFloat(price);
  const amountNum = parseFloat(amount);
  const quoteAmount = priceNum * amountNum;

  // Calculate fees
  const buyerFee = quoteAmount * TAKER_FEE; // Buyer pays fee in quote asset
  const sellerFee = amountNum * MAKER_FEE; // Seller pays fee in base asset

  // Update buyer's wallets
  // Buyer receives base asset (minus fee)
  await db.execute(sql`
    INSERT INTO ${wallets} (userId, asset, balance, locked)
    VALUES (${buyerId}, ${baseAsset}, ${amountNum}, 0)
    ON DUPLICATE KEY UPDATE
      balance = balance + ${amountNum}
  `);

  // Buyer's quote asset already locked, now unlock and deduct actual cost + fee
  await db.update(wallets)
    .set({
      locked: sql`${wallets.locked} - ${quoteAmount + buyerFee}`,
    })
    .where(and(
      eq(wallets.userId, buyerId),
      eq(wallets.asset, quoteAsset)
    ));

  // Update seller's wallets
  // Seller receives quote asset (minus fee)
  await db.execute(sql`
    INSERT INTO ${wallets} (userId, asset, balance, locked)
    VALUES (${sellerId}, ${quoteAsset}, ${quoteAmount - buyerFee}, 0)
    ON DUPLICATE KEY UPDATE
      balance = balance + ${quoteAmount - buyerFee}
  `);

  // Seller's base asset already locked, now unlock
  await db.update(wallets)
    .set({
      locked: sql`${wallets.locked} - ${amountNum}`,
    })
    .where(and(
      eq(wallets.userId, sellerId),
      eq(wallets.asset, baseAsset)
    ));
}

/**
 * Get best ask price (lowest sell price)
 */
async function getBestAskPrice(db: any, pair: string): Promise<string | null> {
  const [bestAsk] = await db.select()
    .from(orders)
    .where(and(
      eq(orders.pair, pair),
      eq(orders.side, "sell"),
      or(
        eq(orders.status, "open"),
        eq(orders.status, "partially_filled")
      )
    ))
    .orderBy(asc(orders.price))
    .limit(1);

  return bestAsk ? bestAsk.price : null;
}

/**
 * Get order book for a trading pair
 */
export async function getOrderBook(pair: string): Promise<OrderBook> {
  const db = await getDb();
  if (!db) return { pair, bids: [], asks: [] };

  try {
    // Get all open/partially filled orders
    const allOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.pair, pair),
        or(
          eq(orders.status, "open"),
          eq(orders.status, "partially_filled")
        )
      ));

    // Aggregate by price level
    const bidsMap = new Map<string, number>();
    const asksMap = new Map<string, number>();

    for (const order of allOrders) {
      const remaining = parseFloat(order.amount) - parseFloat(order.filled);
      if (remaining <= 0) continue;

      if (order.side === "buy") {
        const current = bidsMap.get(order.price) || 0;
        bidsMap.set(order.price, current + remaining);
      } else {
        const current = asksMap.get(order.price) || 0;
        asksMap.set(order.price, current + remaining);
      }
    }

    // Convert to arrays and sort
    const bids = Array.from(bidsMap.entries())
      .map(([price, amount]) => ({
        price,
        amount: amount.toFixed(8),
        total: (parseFloat(price) * amount).toFixed(8),
      }))
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price)); // Highest price first

    const asks = Array.from(asksMap.entries())
      .map(([price, amount]) => ({
        price,
        amount: amount.toFixed(8),
        total: (parseFloat(price) * amount).toFixed(8),
      }))
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // Lowest price first

    return { pair, bids, asks };
  } catch (error) {
    console.error("Error getting order book:", error);
    return { pair, bids: [], asks: [] };
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: number, userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database connection failed" };

  try {
    // Get order
    const [order] = await db.select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      ))
      .limit(1);

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "filled" || order.status === "cancelled") {
      return { success: false, error: "Order already completed or cancelled" };
    }

    // Calculate remaining amount
    const remaining = parseFloat(order.amount) - parseFloat(order.filled);
    const [baseAsset, quoteAsset] = order.pair.split("/");

    // Unlock balance
    if (order.side === "buy") {
      const lockedAmount = remaining * parseFloat(order.price) * (1 + TAKER_FEE);
      await db.update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${lockedAmount}`,
          locked: sql`${wallets.locked} - ${lockedAmount}`,
        })
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.asset, quoteAsset)
        ));
    } else {
      await db.update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${remaining}`,
          locked: sql`${wallets.locked} - ${remaining}`,
        })
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.asset, baseAsset)
        ));
    }

    // Update order status
    await db.update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, orderId));

    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Get user's open orders
 */
export async function getUserOrders(userId: number, pair?: string): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [
      eq(orders.userId, userId),
      or(
        eq(orders.status, "open"),
        eq(orders.status, "partially_filled")
      ),
    ];

    if (pair) {
      conditions.push(eq(orders.pair, pair));
    }

    return await db.select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  } catch (error) {
    console.error("Error getting user orders:", error);
    return [];
  }
}

/**
 * Get recent trades for a pair
 */
export async function getRecentTrades(pair: string, limit: number = 50): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select()
      .from(trades)
      .where(eq(trades.pair, pair))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Error getting recent trades:", error);
    return [];
  }
}
