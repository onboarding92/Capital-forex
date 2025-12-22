import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { rewards, users, wallets, transactions } from "../drizzle/schema";

const REWARD_AMOUNT = 10; // $10 USDT reward
const REWARD_CURRENCY = "USDT";

/**
 * Check if user is eligible for first deposit reward
 * and create reward for referrer if applicable
 */
export async function processFirstDepositReward(userId: number, depositAmount: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Get user's referrer
    const user = await db.select({ referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].referredBy) {
      return; // No referrer, no reward
    }

    const referrerId = user[0].referredBy;

    // Check if this is the first completed deposit
    const depositCount = await db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "deposit"),
          eq(transactions.status, "completed")
        )
      );

    if (depositCount[0]?.count !== 1) {
      return; // Not first deposit
    }

    // Check if reward already exists
    const existingReward = await db.select()
      .from(rewards)
      .where(
        and(
          eq(rewards.userId, userId),
          eq(rewards.referrerId, referrerId),
          eq(rewards.type, "first_deposit")
        )
      )
      .limit(1);

    if (existingReward.length > 0) {
      return; // Reward already created
    }

    // Create reward
    await db.insert(rewards).values({
      userId,
      referrerId,
      amount: REWARD_AMOUNT.toString(),
      currency: REWARD_CURRENCY,
      type: "first_deposit",
      status: "pending",
    });

    // Auto-complete reward and credit referrer's wallet
    await completeReward(userId, referrerId, "first_deposit");

  } catch (error) {
    console.error("Error processing first deposit reward:", error);
  }
}

/**
 * Check if user is eligible for first trade reward
 * and create reward for referrer if applicable
 */
export async function processFirstTradeReward(userId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Get user's referrer
    const user = await db.select({ referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].referredBy) {
      return; // No referrer, no reward
    }

    const referrerId = user[0].referredBy;

    // Check if this is the first completed trade
    const tradeCount = await db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "trade"),
          eq(transactions.status, "completed")
        )
      );

    if (tradeCount[0]?.count !== 1) {
      return; // Not first trade
    }

    // Check if reward already exists
    const existingReward = await db.select()
      .from(rewards)
      .where(
        and(
          eq(rewards.userId, userId),
          eq(rewards.referrerId, referrerId),
          eq(rewards.type, "first_trade")
        )
      )
      .limit(1);

    if (existingReward.length > 0) {
      return; // Reward already created
    }

    // Create reward
    await db.insert(rewards).values({
      userId,
      referrerId,
      amount: REWARD_AMOUNT.toString(),
      currency: REWARD_CURRENCY,
      type: "first_trade",
      status: "pending",
    });

    // Auto-complete reward and credit referrer's wallet
    await completeReward(userId, referrerId, "first_trade");

  } catch (error) {
    console.error("Error processing first trade reward:", error);
  }
}

/**
 * Complete a reward by crediting the referrer's wallet
 */
async function completeReward(userId: number, referrerId: number, type: "first_deposit" | "first_trade") {
  const db = await getDb();
  if (!db) return;

  try {
    // Get or create referrer's USDT wallet
    let wallet = await db.select()
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, referrerId),
          eq(wallets.asset, REWARD_CURRENCY)
        )
      )
      .limit(1);

    if (wallet.length === 0) {
      // Create wallet
      await db.insert(wallets).values({
        userId: referrerId,
        asset: REWARD_CURRENCY,
        balance: REWARD_AMOUNT.toString(),
        locked: "0",
      });
    } else {
      // Update balance
      await db.update(wallets)
        .set({
          balance: sql`balance + ${REWARD_AMOUNT}`,
        })
        .where(
          and(
            eq(wallets.userId, referrerId),
            eq(wallets.asset, REWARD_CURRENCY)
          )
        );
    }

    // Create transaction record
    await db.insert(transactions).values({
      userId: referrerId,
      type: "promo",
      asset: REWARD_CURRENCY,
      amount: REWARD_AMOUNT.toString(),
      status: "completed",
      reference: `Referral reward: ${type} by user ${userId}`,
    });

    // Mark reward as completed
    await db.update(rewards)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(rewards.userId, userId),
          eq(rewards.referrerId, referrerId),
          eq(rewards.type, type)
        )
      );

  } catch (error) {
    console.error("Error completing reward:", error);
  }
}
