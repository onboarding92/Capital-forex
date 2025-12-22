import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leaderboard, achievements, socialFeed, profitSharing } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const leaderboardRouter = router({
  // Get global leaderboard
  getLeaderboard: publicProcedure
    .input(
      z.object({
        sortBy: z.enum(["totalPnL", "winRate", "points", "followers"]).default("totalPnL"),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const sortColumn = {
        totalPnL: leaderboard.totalPnL,
        winRate: leaderboard.winRate,
        points: leaderboard.points,
        followers: leaderboard.followers,
      }[input.sortBy];

      const rankings = await db
        .select()
        .from(leaderboard)
        .orderBy(desc(sortColumn))
        .limit(input.limit);

      return rankings.map((entry: any) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      }));
    }),

  // Get all achievements
  getAchievements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const allAchievements = await db.select().from(achievements);

    return allAchievements.map((achievement: any) => ({
      ...achievement,
      createdAt: achievement.createdAt.toISOString(),
    }));
  }),

  // Get user leaderboard entry
  getUserLeaderboardEntry: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const userId = ctx.user.id;

    const userEntry = await db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.userId, userId))
      .limit(1);

    if (userEntry.length === 0) {
      return null;
    }

    return {
      ...userEntry[0],
      createdAt: userEntry[0].createdAt.toISOString(),
      updatedAt: userEntry[0].updatedAt.toISOString(),
    };
  }),

  // Get social feed
  getSocialFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const posts = await db
        .select()
        .from(socialFeed)
        .orderBy(desc(socialFeed.createdAt))
        .limit(input.limit);

      return posts.map((post: any) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      }));
    }),

  // Create post
  createPost: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
        type: z.enum(["post", "trade_share", "achievement", "milestone"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const userId = ctx.user.id;

      await db.insert(socialFeed).values({
        userId,
        content: input.content,
        type: input.type,
        likes: 0,
        comments: 0,
        shares: 0,
      });

      return {
        success: true,
        message: "Post created successfully",
      };
    }),

  // Like post
  likePost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(socialFeed)
        .set({ likes: sql`${socialFeed.likes} + 1` })
        .where(eq(socialFeed.id, input.postId));

      return {
        success: true,
        message: "Post liked",
      };
    }),

  // Comment on post
  commentPost: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        comment: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(socialFeed)
        .set({ comments: sql`${socialFeed.comments} + 1` })
        .where(eq(socialFeed.id, input.postId));

      return {
        success: true,
        message: "Comment added",
      };
    }),

  // Get profit sharing history
  getProfitSharingHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const userId = ctx.user.id;

    // Get profit sharing as trader
    const asTrader = await db
      .select()
      .from(profitSharing)
      .where(eq(profitSharing.traderId, userId))
      .orderBy(desc(profitSharing.timestamp))
      .limit(50);

    // Get profit sharing as follower
    const asFollower = await db
      .select()
      .from(profitSharing)
      .where(eq(profitSharing.followerId, userId))
      .orderBy(desc(profitSharing.timestamp))
      .limit(50);

    return {
      asTrader: asTrader.map((entry: any) => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      })),
      asFollower: asFollower.map((entry: any) => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }),
});
