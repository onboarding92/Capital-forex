/**
 * Copy Trading Router
 * 
 * Provides tRPC procedures for copy trading functionality:
 * - Follow/unfollow traders
 * - View trader profiles and statistics
 * - Manage copy trading settings
 * - Track copy trading performance
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { traderProfiles, copyTradingFollows, copyTradingExecutions, orders, trades, users } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const copyTradingRouter = router({
  /**
   * Get list of top traders ranked by performance
   */
  getTopTraders: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        sortBy: z.enum(["winRate", "totalPnL", "avgRoi", "totalFollowers"]).default("totalPnL"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const orderByMap = {
        winRate: desc(traderProfiles.winRate),
        totalPnL: desc(traderProfiles.totalPnL),
        avgRoi: desc(traderProfiles.avgRoi),
        totalFollowers: desc(traderProfiles.totalFollowers),
      };

      const traders = await db
        .select({
          userId: traderProfiles.userId,
          username: users.username,
          email: users.email,
          totalFollowers: traderProfiles.totalFollowers,
          totalTrades: traderProfiles.totalTrades,
          winRate: traderProfiles.winRate,
          totalPnL: traderProfiles.totalPnL,
          avgRoi: traderProfiles.avgRoi,
          maxDrawdown: traderProfiles.maxDrawdown,
          sharpeRatio: traderProfiles.sharpeRatio,
          riskScore: traderProfiles.riskScore,
          tradingVolume30d: traderProfiles.tradingVolume30d,
          bio: traderProfiles.bio,
        })
        .from(traderProfiles)
        .innerJoin(users, eq(traderProfiles.userId, users.id))
        .where(eq(traderProfiles.isPublic, true))
        .orderBy(orderByMap[input.sortBy])
        .limit(input.limit);

      return traders;
    }),

  /**
   * Get trader profile details
   */
  getTraderProfile: protectedProcedure
    .input(z.object({ traderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [profile] = await db
        .select({
          userId: traderProfiles.userId,
          username: users.username,
          email: users.email,
          totalFollowers: traderProfiles.totalFollowers,
          totalTrades: traderProfiles.totalTrades,
          winningTrades: traderProfiles.winningTrades,
          losingTrades: traderProfiles.losingTrades,
          winRate: traderProfiles.winRate,
          totalPnL: traderProfiles.totalPnL,
          avgRoi: traderProfiles.avgRoi,
          maxDrawdown: traderProfiles.maxDrawdown,
          sharpeRatio: traderProfiles.sharpeRatio,
          riskScore: traderProfiles.riskScore,
          tradingVolume30d: traderProfiles.tradingVolume30d,
          bio: traderProfiles.bio,
          createdAt: traderProfiles.createdAt,
        })
        .from(traderProfiles)
        .innerJoin(users, eq(traderProfiles.userId, users.id))
        .where(eq(traderProfiles.userId, input.traderId))
        .limit(1);

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trader not found" });
      }

      return profile;
    }),

  /**
   * Follow a trader
   */
  followTrader: protectedProcedure
    .input(
      z.object({
        traderId: z.number(),
        allocatedAmount: z.number().min(10),
        maxRiskPerTrade: z.number().min(0.1).max(10).default(2),
        copyRatio: z.number().min(1).max(100).default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Cannot follow yourself
      if (ctx.user.id === input.traderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
      }

      // Check if trader exists and is public
      const [trader] = await db
        .select()
        .from(traderProfiles)
        .where(and(eq(traderProfiles.userId, input.traderId), eq(traderProfiles.isPublic, true)))
        .limit(1);

      if (!trader) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trader not found or not public" });
      }

      // Check if already following
      const [existing] = await db
        .select()
        .from(copyTradingFollows)
        .where(
          and(
            eq(copyTradingFollows.followerId, ctx.user.id),
            eq(copyTradingFollows.traderId, input.traderId),
            eq(copyTradingFollows.status, "active")
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already following this trader" });
      }

      // Create follow relationship
      await db.insert(copyTradingFollows).values({
        followerId: ctx.user.id,
        traderId: input.traderId,
        allocatedAmount: input.allocatedAmount.toString(),
        maxRiskPerTrade: input.maxRiskPerTrade.toString(),
        copyRatio: input.copyRatio.toString(),
        status: "active",
      });

      // Update trader's follower count
      await db
        .update(traderProfiles)
        .set({
          totalFollowers: sql`${traderProfiles.totalFollowers} + 1`,
        })
        .where(eq(traderProfiles.userId, input.traderId));

      return { success: true, message: "Successfully following trader" };
    }),

  /**
   * Unfollow a trader
   */
  unfollowTrader: protectedProcedure
    .input(z.object({ followId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify follow belongs to user
      const [follow] = await db
        .select()
        .from(copyTradingFollows)
        .where(and(eq(copyTradingFollows.id, input.followId), eq(copyTradingFollows.followerId, ctx.user.id)))
        .limit(1);

      if (!follow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Follow relationship not found" });
      }

      // Update status to stopped
      await db
        .update(copyTradingFollows)
        .set({
          status: "stopped",
          stoppedAt: new Date(),
        })
        .where(eq(copyTradingFollows.id, input.followId));

      // Decrease trader's follower count
      await db
        .update(traderProfiles)
        .set({
          totalFollowers: sql`GREATEST(0, ${traderProfiles.totalFollowers} - 1)`,
        })
        .where(eq(traderProfiles.userId, follow.traderId));

      return { success: true, message: "Successfully unfollowed trader" };
    }),

  /**
   * Get user's followed traders
   */
  getMyFollowedTraders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const follows = await db
      .select({
        id: copyTradingFollows.id,
        traderId: copyTradingFollows.traderId,
        traderUsername: users.username,
        allocatedAmount: copyTradingFollows.allocatedAmount,
        maxRiskPerTrade: copyTradingFollows.maxRiskPerTrade,
        copyRatio: copyTradingFollows.copyRatio,
        status: copyTradingFollows.status,
        totalCopiedTrades: copyTradingFollows.totalCopiedTrades,
        totalPnL: copyTradingFollows.totalPnL,
        startedAt: copyTradingFollows.startedAt,
        stoppedAt: copyTradingFollows.stoppedAt,
      })
      .from(copyTradingFollows)
      .innerJoin(users, eq(copyTradingFollows.traderId, users.id))
      .where(eq(copyTradingFollows.followerId, ctx.user.id))
      .orderBy(desc(copyTradingFollows.startedAt));

    return follows;
  }),

  /**
   * Get copy trading execution history
   */
  getCopyTradingHistory: protectedProcedure
    .input(
      z.object({
        followId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(copyTradingExecutions.followerId, ctx.user.id)];
      if (input.followId) {
        conditions.push(eq(copyTradingExecutions.followId, input.followId));
      }

      const executions = await db
        .select()
        .from(copyTradingExecutions)
        .where(and(...conditions))
        .orderBy(desc(copyTradingExecutions.createdAt))
        .limit(input.limit);

      return executions;
    }),

  /**
   * Update copy trading settings
   */
  updateCopySettings: protectedProcedure
    .input(
      z.object({
        followId: z.number(),
        allocatedAmount: z.number().min(10).optional(),
        maxRiskPerTrade: z.number().min(0.1).max(10).optional(),
        copyRatio: z.number().min(1).max(100).optional(),
        status: z.enum(["active", "paused"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify follow belongs to user
      const [follow] = await db
        .select()
        .from(copyTradingFollows)
        .where(and(eq(copyTradingFollows.id, input.followId), eq(copyTradingFollows.followerId, ctx.user.id)))
        .limit(1);

      if (!follow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Follow relationship not found" });
      }

      const updates: any = {};
      if (input.allocatedAmount !== undefined) updates.allocatedAmount = input.allocatedAmount.toString();
      if (input.maxRiskPerTrade !== undefined) updates.maxRiskPerTrade = input.maxRiskPerTrade.toString();
      if (input.copyRatio !== undefined) updates.copyRatio = input.copyRatio.toString();
      if (input.status !== undefined) updates.status = input.status;

      await db.update(copyTradingFollows).set(updates).where(eq(copyTradingFollows.id, input.followId));

      return { success: true, message: "Copy trading settings updated" };
    }),

  /**
   * Enable/disable public profile for copy trading
   */
  updatePublicProfile: protectedProcedure
    .input(
      z.object({
        isPublic: z.boolean(),
        bio: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if profile exists
      const [existing] = await db
        .select()
        .from(traderProfiles)
        .where(eq(traderProfiles.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        // Update existing profile
        await db
          .update(traderProfiles)
          .set({
            isPublic: input.isPublic,
            bio: input.bio || existing.bio,
          })
          .where(eq(traderProfiles.userId, ctx.user.id));
      } else {
        // Create new profile
        await db.insert(traderProfiles).values({
          userId: ctx.user.id,
          isPublic: input.isPublic,
          bio: input.bio || null,
        });
      }

      return { success: true, message: "Profile updated successfully" };
    }),
});
