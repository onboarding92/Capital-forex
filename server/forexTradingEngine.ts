/**
 * Forex Trading Engine - Instant Execution
 * 
 * Key differences from crypto matching engine:
 * - No order book matching
 * - Instant execution at market price + spread
 * - Leverage-based margin calculation
 * - Real-time P&L calculation
 */

import { getDb } from "./db.js";
import { forexPositions, forexPairs, tradingAccounts, trades, orders } from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

interface ExecuteOrderParams {
  userId: number;
  accountId: number;
  symbol: string;
  side: "buy" | "sell";
  volume: number; // Lot size (0.01 = micro lot, 1.0 = standard lot)
  stopLoss?: number;
  takeProfit?: number;
}

interface MarketPrice {
  bid: number;
  ask: number;
  spread: number;
}

/**
 * Get current market price with spread
 * In production, this would fetch from a real-time price feed API
 */
export async function getMarketPrice(symbol: string): Promise<MarketPrice> {
  const db = getDb();
  
  // Get pair configuration
  const pair = await db.select().from(forexPairs).where(eq(forexPairs.symbol, symbol)).limit(1);
  
  if (!pair || pair.length === 0) {
    throw new Error(`Forex pair ${symbol} not found`);
  }

  const spreadPips = Number(pair[0].spread);
  
  // TODO: In production, fetch real-time price from API (e.g., Alpha Vantage, Twelve Data)
  // For now, using mock prices
  const mockPrices: Record<string, number> = {
    "EUR/USD": 1.0850,
    "GBP/USD": 1.2650,
    "USD/JPY": 149.50,
    "USD/CHF": 0.8850,
    "AUD/USD": 0.6550,
    "USD/CAD": 1.3650,
    "NZD/USD": 0.6050,
  };

  const midPrice = mockPrices[symbol] || 1.0000;
  
  // Calculate pip value based on currency pair
  const pipValue = symbol.includes("JPY") ? 0.01 : 0.0001;
  const spreadValue = spreadPips * pipValue;
  
  return {
    bid: midPrice - spreadValue / 2,
    ask: midPrice + spreadValue / 2,
    spread: spreadPips,
  };
}

/**
 * Calculate required margin for a position
 * Formula: (Volume * Contract Size * Price) / Leverage
 * Standard lot = 100,000 units
 */
export function calculateMargin(volume: number, price: number, leverage: number): number {
  const contractSize = 100000; // Standard lot size
  const notionalValue = volume * contractSize * price;
  const margin = notionalValue / leverage;
  return Math.round(margin * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate profit/loss for a position
 * Formula: (Close Price - Open Price) * Volume * Contract Size * Direction
 * Direction: +1 for buy, -1 for sell
 */
export function calculateProfit(
  side: "buy" | "sell",
  openPrice: number,
  currentPrice: number,
  volume: number,
  symbol: string
): number {
  const contractSize = 100000;
  const direction = side === "buy" ? 1 : -1;
  
  // For JPY pairs, pip value is different
  const isJPY = symbol.includes("JPY");
  const priceDiff = (currentPrice - openPrice) * direction;
  
  let profit: number;
  if (isJPY) {
    // For JPY pairs: profit = pips * volume * 1000
    profit = priceDiff * volume * 1000;
  } else {
    // For other pairs: profit = pips * volume * 100000
    profit = priceDiff * volume * contractSize;
  }
  
  return Math.round(profit * 100) / 100;
}

/**
 * Execute market order with instant execution
 */
export async function executeOrder(params: ExecuteOrderParams): Promise<number> {
  const db = getDb();
  const { userId, accountId, symbol, side, volume, stopLoss, takeProfit } = params;

  // 1. Get trading account
  const accounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, accountId));
  if (!accounts || accounts.length === 0) {
    throw new Error("Trading account not found");
  }
  const account = accounts[0];

  // 2. Get market price
  const marketPrice = await getMarketPrice(symbol);
  const executionPrice = side === "buy" ? marketPrice.ask : marketPrice.bid;

  // 3. Calculate required margin
  const requiredMargin = calculateMargin(volume, executionPrice, account.leverage);

  // 4. Check if account has enough free margin
  const freeMargin = Number(account.freeMargin);
  if (freeMargin < requiredMargin) {
    throw new Error(`Insufficient margin. Required: $${requiredMargin}, Available: $${freeMargin}`);
  }

  // 5. Create order record
  const orderResult = await db.insert(orders).values({
    userId,
    accountId,
    symbol,
    side,
    type: "market",
    volume: volume.toString(),
    requestedPrice: executionPrice.toString(),
    executedPrice: executionPrice.toString(),
    stopLoss: stopLoss?.toString(),
    takeProfit: takeProfit?.toString(),
    status: "executed",
    executedAt: new Date(),
  });

  const orderId = Number(orderResult[0].insertId);

  // 6. Create position
  const positionResult = await db.insert(forexPositions).values({
    userId,
    accountId,
    symbol,
    side,
    volume: volume.toString(),
    openPrice: executionPrice.toString(),
    currentPrice: executionPrice.toString(),
    stopLoss: stopLoss?.toString(),
    takeProfit: takeProfit?.toString(),
    margin: requiredMargin.toString(),
    leverage: account.leverage,
    profit: "0",
    swap: "0",
    commission: "0",
    status: "open",
  });

  const positionId = Number(positionResult[0].insertId);

  // 7. Update order with position ID
  await db.update(orders).set({ positionId }).where(eq(orders.id, orderId));

  // 8. Create trade record
  await db.insert(trades).values({
    userId,
    accountId,
    orderId,
    positionId,
    symbol,
    side,
    volume: volume.toString(),
    price: executionPrice.toString(),
    commission: "0",
    swap: "0",
  });

  // 9. Update account margin
  const newMargin = Number(account.margin) + requiredMargin;
  const newFreeMargin = Number(account.balance) - newMargin;
  const newMarginLevel = newMargin > 0 ? (Number(account.equity) / newMargin) * 100 : 0;

  await db.update(tradingAccounts).set({
    margin: newMargin.toString(),
    freeMargin: newFreeMargin.toString(),
    marginLevel: newMarginLevel.toString(),
  }).where(eq(tradingAccounts.id, accountId));

  return positionId;
}

/**
 * Close position and realize profit/loss
 */
export async function closePosition(positionId: number): Promise<void> {
  const db = getDb();

  // 1. Get position
  const positions = await db.select().from(forexPositions).where(eq(forexPositions.id, positionId));
  if (!positions || positions.length === 0) {
    throw new Error("Position not found");
  }
  const position = positions[0];

  if (position.status !== "open") {
    throw new Error("Position is not open");
  }

  // 2. Get current market price
  const marketPrice = await getMarketPrice(position.symbol);
  const closePrice = position.side === "buy" ? marketPrice.bid : marketPrice.ask;

  // 3. Calculate final profit
  const profit = calculateProfit(
    position.side,
    Number(position.openPrice),
    closePrice,
    Number(position.volume),
    position.symbol
  );

  const totalProfit = profit + Number(position.swap) - Number(position.commission);

  // 4. Update position
  await db.update(forexPositions).set({
    status: "closed",
    closedAt: new Date(),
    closedPrice: closePrice.toString(),
    closedProfit: totalProfit.toString(),
    currentPrice: closePrice.toString(),
    profit: profit.toString(),
  }).where(eq(forexPositions.id, positionId));

  // 5. Create closing trade record
  await db.insert(trades).values({
    userId: position.userId,
    accountId: position.accountId,
    orderId: 0, // Closing trade has no order
    positionId,
    symbol: position.symbol,
    side: position.side === "buy" ? "sell" : "buy", // Opposite side
    volume: position.volume,
    price: closePrice.toString(),
    commission: position.commission,
    swap: position.swap,
    profit: totalProfit.toString(),
  });

  // 6. Update account balance and margin
  const accounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, position.accountId));
  if (accounts && accounts.length > 0) {
    const account = accounts[0];
    const newBalance = Number(account.balance) + totalProfit;
    const newMargin = Number(account.margin) - Number(position.margin);
    const newEquity = newBalance; // Recalculate equity
    const newFreeMargin = newBalance - newMargin;
    const newMarginLevel = newMargin > 0 ? (newEquity / newMargin) * 100 : 0;

    await db.update(tradingAccounts).set({
      balance: newBalance.toString(),
      equity: newEquity.toString(),
      margin: newMargin.toString(),
      freeMargin: newFreeMargin.toString(),
      marginLevel: newMarginLevel.toString(),
    }).where(eq(tradingAccounts.id, position.accountId));
  }
}

/**
 * Update all open positions with current market prices
 * This should run periodically (e.g., every 5 seconds)
 */
export async function updateOpenPositions(): Promise<void> {
  const db = getDb();

  // Get all open positions
  const openPositions = await db.select().from(forexPositions).where(eq(forexPositions.status, "open"));

  for (const position of openPositions) {
    try {
      // Get current market price
      const marketPrice = await getMarketPrice(position.symbol);
      const currentPrice = position.side === "buy" ? marketPrice.bid : marketPrice.ask;

      // Calculate current profit
      const profit = calculateProfit(
        position.side,
        Number(position.openPrice),
        currentPrice,
        Number(position.volume),
        position.symbol
      );

      // Update position
      await db.update(forexPositions).set({
        currentPrice: currentPrice.toString(),
        profit: profit.toString(),
      }).where(eq(forexPositions.id, position.id));

      // Check stop loss and take profit
      if (position.stopLoss) {
        const stopLoss = Number(position.stopLoss);
        if (
          (position.side === "buy" && currentPrice <= stopLoss) ||
          (position.side === "sell" && currentPrice >= stopLoss)
        ) {
          await closePosition(position.id);
          console.log(`[Forex Engine] Stop loss triggered for position ${position.id}`);
        }
      }

      if (position.takeProfit) {
        const takeProfit = Number(position.takeProfit);
        if (
          (position.side === "buy" && currentPrice >= takeProfit) ||
          (position.side === "sell" && currentPrice <= takeProfit)
        ) {
          await closePosition(position.id);
          console.log(`[Forex Engine] Take profit triggered for position ${position.id}`);
        }
      }

      // Update account equity
      const accounts = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, position.accountId));
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        
        // Recalculate equity for this account (balance + unrealized P&L)
        const accountPositions = await db.select().from(forexPositions).where(
          and(
            eq(forexPositions.accountId, position.accountId),
            eq(forexPositions.status, "open")
          )
        );

        const totalUnrealizedPL = accountPositions.reduce((sum, pos) => sum + Number(pos.profit), 0);
        const newEquity = Number(account.balance) + totalUnrealizedPL;
        const margin = Number(account.margin);
        const newMarginLevel = margin > 0 ? (newEquity / margin) * 100 : 0;

        await db.update(tradingAccounts).set({
          equity: newEquity.toString(),
          marginLevel: newMarginLevel.toString(),
        }).where(eq(tradingAccounts.id, position.accountId));
      }
    } catch (error) {
      console.error(`[Forex Engine] Error updating position ${position.id}:`, error);
    }
  }
}
