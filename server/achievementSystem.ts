/**
 * Achievement System
 * 
 * Automatically unlocks achievements based on user milestones
 */

import { getDb } from "./db";
import { achievements, orders, userAchievements, leaderboard } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  checkCondition: (userId: number) => Promise<boolean>;
}

// Define all achievements
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    type: "first_trade",
    title: "First Trade",
    description: "Complete your first trade on BitChange",
    icon: "🎯",
    points: 100,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
      return userOrders.length >= 1;
    },
  },
  {
    type: "trading_novice",
    title: "Trading Novice",
    description: "Complete 10 trades",
    icon: "📈",
    points: 250,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
      return userOrders.length >= 10;
    },
  },
  {
    type: "trading_veteran",
    title: "Trading Veteran",
    description: "Complete 100 trades",
    icon: "🏆",
    points: 1000,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
      return userOrders.length >= 100;
    },
  },
  {
    type: "trading_master",
    title: "Trading Master",
    description: "Complete 1000 trades",
    icon: "👑",
    points: 5000,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
      return userOrders.length >= 1000;
    },
  },
  {
    type: "volume_trader",
    title: "Volume Trader",
    description: "Trade over 10,000 USDT volume",
    icon: "💎",
    points: 750,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "filled")));
      
      const totalVolume = userOrders.reduce(
        (sum, order) => sum + parseFloat(order.filledAmount || "0") * parseFloat(order.price || "0"),
        0
      );
      return totalVolume >= 10000;
    },
  },
  {
    type: "whale_trader",
    title: "Whale Trader",
    description: "Trade over 100,000 USDT volume",
    icon: "🐋",
    points: 3000,
    checkCondition: async (userId) => {
      const db = await getDb();
      if (!db) return false;
      const userOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "filled")));
      
      const totalVolume = userOrders.reduce(
        (sum, order) => sum + parseFloat(order.filledAmount || "0") * parseFloat(order.price || "0"),
        0
      );
      return totalVolume >= 100000;
    },
  },
];

/**
 * Check and unlock achievements for a user
 * Call this after significant user actions (trade, stake, etc.)
 */
export async function checkAndUnlockAchievements(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get user's already unlocked achievements
  const unlockedAchievements = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const unlockedTypes = new Set(unlockedAchievements.map((a) => a.achievementType));

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (unlockedTypes.has(achievement.type)) continue;

    // Check condition
    const isUnlocked = await achievement.checkCondition(userId);

    if (isUnlocked) {
      // Unlock achievement
      await db.insert(achievements).values({
        userId,
        achievementType: achievement.type,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        metadata: JSON.stringify({ unlockedAt: new Date().toISOString() }),
      });

      // Update leaderboard points
      const userLeaderboard = await db
        .select()
        .from(leaderboard)
        .where(eq(leaderboard.userId, userId))
        .limit(1);

      if (userLeaderboard.length > 0) {
        const currentPoints = userLeaderboard[0].points || 0;
        await db
          .update(leaderboard)
          .set({ points: currentPoints + achievement.points })
          .where(eq(leaderboard.userId, userId));
      }

      console.log(`🎉 Achievement unlocked for user ${userId}: ${achievement.title} (+${achievement.points} points)`);
    }
  }
}

/**
 * Get all available achievements (for display)
 */
export function getAllAchievements(): AchievementDefinition[] {
  return ACHIEVEMENTS;
}

/**
 * Get user's achievement progress
 */
export async function getUserAchievementProgress(userId: number) {
  const db = await getDb();
  if (!db) return { unlocked: [], locked: [] };

  const unlockedAchievements = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const unlockedTypes = new Set(unlockedAchievements.map((a) => a.achievementType));

  const locked = ACHIEVEMENTS.filter((a) => !unlockedTypes.has(a.type));
  const unlocked = unlockedAchievements.map((a) => ({
    type: a.achievementType,
    title: a.title,
    description: a.description,
    icon: a.icon,
    points: a.points,
    earnedAt: a.earnedAt,
  }));

  return { unlocked, locked };
}
