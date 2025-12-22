import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { wallets, transactions, orders, stakingPositions } from "../drizzle/schema";
import { getCryptoPrice } from "./cryptoPrices";

/**
 * Portfolio Analytics Module
 * Provides portfolio performance and P&L tracking for users
 */

export interface PortfolioAsset {
  asset: string;
  balance: string;
  locked: string;
  currentPrice: number;
  value: number; // balance * currentPrice
}

export interface PortfolioSummary {
  totalValue: number;
  assets: PortfolioAsset[];
  stakingValue: number;
  availableValue: number;
  lockedValue: number;
}

export interface ProfitLoss {
  totalDeposits: string;
  totalWithdrawals: string;
  currentValue: number;
  realizedPL: string; // From completed trades
  unrealizedPL: number; // currentValue - (deposits - withdrawals)
  plPercentage: number;
}

export interface PortfolioHistory {
  date: string;
  totalValue: number;
}

/**
 * Get user portfolio summary with current values
 */
export async function getPortfolioSummary(userId: number): Promise<PortfolioSummary> {
  const db = await getDb();
  if (!db) {
    return {
      totalValue: 0,
      assets: [],
      stakingValue: 0,
      availableValue: 0,
      lockedValue: 0,
    };
  }

  // Get user wallets
  const userWallets = await db
    .select()
    .from(wallets)
    .where(sql`${wallets.userId} = ${userId}`);

  // Get current prices and calculate values
  const assets: PortfolioAsset[] = [];
  let totalValue = 0;
  let availableValue = 0;
  let lockedValue = 0;

  for (const wallet of userWallets) {
    const priceData = await getCryptoPrice(wallet.asset);
    const price = priceData?.price || 0;
    const balance = parseFloat(wallet.balance);
    const locked = parseFloat(wallet.locked);
    const value = balance * price;
    const lockedVal = locked * price;

    assets.push({
      asset: wallet.asset,
      balance: wallet.balance,
      locked: wallet.locked,
      currentPrice: price,
      value,
    });

    totalValue += value;
    availableValue += value;
    lockedValue += lockedVal;
  }

  // Get staking value
  const stakingResult = await db
    .select({
      totalStaked: sql<string>`COALESCE(SUM(${stakingPositions.amount}), 0)`,
    })
    .from(stakingPositions)
    .where(sql`${stakingPositions.userId} = ${userId} AND ${stakingPositions.status} = 'active'`);

  const stakingValue = parseFloat(stakingResult[0]?.totalStaked || "0");

  return {
    totalValue: totalValue + stakingValue,
    assets: assets.sort((a, b) => b.value - a.value),
    stakingValue,
    availableValue,
    lockedValue,
  };
}

/**
 * Get user profit/loss analysis
 */
export async function getProfitLoss(userId: number): Promise<ProfitLoss> {
  const db = await getDb();
  if (!db) {
    return {
      totalDeposits: "0",
      totalWithdrawals: "0",
      currentValue: 0,
      realizedPL: "0",
      unrealizedPL: 0,
      plPercentage: 0,
    };
  }

  // Get total deposits
  const depositsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.userId} = ${userId} AND ${transactions.type} = 'deposit'`);

  const totalDeposits = depositsResult[0]?.total || "0";

  // Get total withdrawals
  const withdrawalsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.userId} = ${userId} AND ${transactions.type} = 'withdrawal'`);

  const totalWithdrawals = withdrawalsResult[0]?.total || "0";

  // Get realized P&L from trades (simplified: sum of trade transactions)
  const tradesResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.userId} = ${userId} AND ${transactions.type} = 'trade'`);

  const realizedPL = tradesResult[0]?.total || "0";

  // Get current portfolio value
  const portfolio = await getPortfolioSummary(userId);
  const currentValue = portfolio.totalValue;

  // Calculate unrealized P&L
  const netDeposits = parseFloat(totalDeposits) - parseFloat(totalWithdrawals);
  const unrealizedPL = currentValue - netDeposits;
  const plPercentage = netDeposits > 0 ? (unrealizedPL / netDeposits) * 100 : 0;

  return {
    totalDeposits,
    totalWithdrawals,
    currentValue,
    realizedPL,
    unrealizedPL,
    plPercentage,
  };
}

/**
 * Get portfolio value history (last 30 days)
 */
export async function getPortfolioHistory(userId: number): Promise<PortfolioHistory[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Simplified: Get daily snapshots based on transaction history
  // In production, you'd store daily portfolio snapshots in a separate table
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const dailyData = await db
    .select({
      date: sql<string>`DATE(${transactions.createdAt})`,
      value: sql<string>`SUM(CASE WHEN ${transactions.type} = 'deposit' THEN ${transactions.amount} WHEN ${transactions.type} = 'withdrawal' THEN -${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(sql`${transactions.userId} = ${userId} AND ${transactions.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(sql`DATE(${transactions.createdAt})`)
    .orderBy(sql`DATE(${transactions.createdAt})`);

  // Calculate cumulative values
  let cumulativeValue = 0;
  const history: PortfolioHistory[] = dailyData.map(row => {
    cumulativeValue += parseFloat(row.value);
    return {
      date: row.date,
      totalValue: cumulativeValue,
    };
  });

  return history;
}
