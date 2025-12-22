import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { transactions, users, orders } from "../drizzle/schema";

/**
 * Business Metrics Module
 * Tracks key performance indicators for the exchange
 */

export interface TransactionVolumeMetrics {
  daily: {
    totalVolume: string;
    totalTransactions: number;
    depositVolume: string;
    withdrawalVolume: string;
    tradeVolume: string;
  };
  monthly: {
    totalVolume: string;
    totalTransactions: number;
    depositVolume: string;
    withdrawalVolume: string;
    tradeVolume: string;
  };
}

export interface ConversionMetrics {
  totalUsers: number;
  activeUsers: number; // Users with at least one transaction
  kycApprovedUsers: number;
  conversionRate: number; // activeUsers / totalUsers
  kycConversionRate: number; // kycApprovedUsers / totalUsers
}

export interface RevenueMetrics {
  daily: {
    tradingFees: string;
    stakingRewards: string;
    totalRevenue: string;
  };
  monthly: {
    tradingFees: string;
    stakingRewards: string;
    totalRevenue: string;
  };
  allTime: {
    tradingFees: string;
    stakingRewards: string;
    totalRevenue: string;
  };
}

/**
 * Get transaction volume metrics
 */
export async function getTransactionVolumeMetrics(): Promise<TransactionVolumeMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      daily: { totalVolume: "0", totalTransactions: 0, depositVolume: "0", withdrawalVolume: "0", tradeVolume: "0" },
      monthly: { totalVolume: "0", totalTransactions: 0, depositVolume: "0", withdrawalVolume: "0", tradeVolume: "0" },
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Daily metrics
  const dailyStats = await db
    .select({
      totalVolume: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
      totalTransactions: sql<number>`COUNT(*)`,
      depositVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'deposit' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      withdrawalVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'withdrawal' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      tradeVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'trade' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.createdAt} >= ${oneDayAgo}`);

  // Monthly metrics
  const monthlyStats = await db
    .select({
      totalVolume: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
      totalTransactions: sql<number>`COUNT(*)`,
      depositVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'deposit' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      withdrawalVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'withdrawal' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      tradeVolume: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'trade' THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.createdAt} >= ${oneMonthAgo}`);

  return {
    daily: dailyStats[0] || { totalVolume: "0", totalTransactions: 0, depositVolume: "0", withdrawalVolume: "0", tradeVolume: "0" },
    monthly: monthlyStats[0] || { totalVolume: "0", totalTransactions: 0, depositVolume: "0", withdrawalVolume: "0", tradeVolume: "0" },
  };
}

/**
 * Get user conversion metrics
 */
export async function getConversionMetrics(): Promise<ConversionMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      kycApprovedUsers: 0,
      conversionRate: 0,
      kycConversionRate: 0,
    };
  }

  // Total users
  const totalUsersResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users);
  const totalUsers = totalUsersResult[0]?.count || 0;

  // Active users (users with at least one transaction)
  const activeUsersResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${transactions.userId})` })
    .from(transactions);
  const activeUsers = activeUsersResult[0]?.count || 0;

  // KYC approved users
  const kycApprovedResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(sql`${users.kycStatus} = 'approved'`);
  const kycApprovedUsers = kycApprovedResult[0]?.count || 0;

  return {
    totalUsers,
    activeUsers,
    kycApprovedUsers,
    conversionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
    kycConversionRate: totalUsers > 0 ? (kycApprovedUsers / totalUsers) * 100 : 0,
  };
}

/**
 * Get revenue metrics
 * Trading fees: 0.1% of filled order volume
 * Staking rewards: Sum of staking_reward transactions
 */
export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      daily: { tradingFees: "0", stakingRewards: "0", totalRevenue: "0" },
      monthly: { tradingFees: "0", stakingRewards: "0", totalRevenue: "0" },
      allTime: { tradingFees: "0", stakingRewards: "0", totalRevenue: "0" },
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Daily revenue - Trading fees (0.1% of volume)
  const dailyTradingVolume = await db
    .select({
      volume: sql<string>`COALESCE(SUM(${orders.filled} * ${orders.price}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.status} = 'filled' AND ${orders.createdAt} >= ${oneDayAgo}`);

  const dailyStakingRewards = await db
    .select({
      rewards: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.type} = 'staking_reward' AND ${transactions.createdAt} >= ${oneDayAgo}`);

  const dailyTradingFees = (parseFloat(dailyTradingVolume[0]?.volume || "0") * 0.001).toFixed(8);
  const dailyStaking = dailyStakingRewards[0]?.rewards || "0";

  // Monthly revenue
  const monthlyTradingVolume = await db
    .select({
      volume: sql<string>`COALESCE(SUM(${orders.filled} * ${orders.price}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.status} = 'filled' AND ${orders.createdAt} >= ${oneMonthAgo}`);

  const monthlyStakingRewards = await db
    .select({
      rewards: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.type} = 'staking_reward' AND ${transactions.createdAt} >= ${oneMonthAgo}`);

  const monthlyTradingFees = (parseFloat(monthlyTradingVolume[0]?.volume || "0") * 0.001).toFixed(8);
  const monthlyStaking = monthlyStakingRewards[0]?.rewards || "0";

  // All-time revenue
  const allTimeTradingVolume = await db
    .select({
      volume: sql<string>`COALESCE(SUM(${orders.filled} * ${orders.price}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.status} = 'filled'`);

  const allTimeStakingRewards = await db
    .select({
      rewards: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.type} = 'staking_reward'`);

  const allTimeTradingFees = (parseFloat(allTimeTradingVolume[0]?.volume || "0") * 0.001).toFixed(8);
  const allTimeStaking = allTimeStakingRewards[0]?.rewards || "0";

  const calculateTotal = (fees: string, rewards: string) => {
    return (parseFloat(fees) + parseFloat(rewards)).toFixed(8);
  };

  return {
    daily: {
      tradingFees: dailyTradingFees,
      stakingRewards: dailyStaking,
      totalRevenue: calculateTotal(dailyTradingFees, dailyStaking),
    },
    monthly: {
      tradingFees: monthlyTradingFees,
      stakingRewards: monthlyStaking,
      totalRevenue: calculateTotal(monthlyTradingFees, monthlyStaking),
    },
    allTime: {
      tradingFees: allTimeTradingFees,
      stakingRewards: allTimeStaking,
      totalRevenue: calculateTotal(allTimeTradingFees, allTimeStaking),
    },
  };
}
