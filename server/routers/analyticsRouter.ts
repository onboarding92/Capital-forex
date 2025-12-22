import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, wallets } from "../../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export const analyticsRouter = router({
  // Get PnL tracking data (simplified with mock data)
  getPnLTracking: protectedProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        limit: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      // Return mock data for now
      const data = [];
      const now = new Date();
      
      for (let i = input.limit - 1; i >= 0; i--) {
        const date = new Date(now);
        if (input.period === "daily") {
          date.setDate(now.getDate() - i);
        } else if (input.period === "weekly") {
          date.setDate(now.getDate() - (i * 7));
        } else {
          date.setMonth(now.getMonth() - i);
        }
        
        data.push({
          date: date.toISOString().split("T")[0],
          volume: Math.random() * 10000,
          orders: Math.floor(Math.random() * 50),
        });
      }
      
      return data;
    }),

  // Get win rate trends
  getWinRateTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
        limit: z.number().default(12),
      })
    )
    .query(async ({ input }) => {
      // Return mock data
      const data = [];
      const now = new Date();
      
      for (let i = input.limit - 1; i >= 0; i--) {
        const date = new Date(now);
        if (input.period === "daily") {
          date.setDate(now.getDate() - i);
        } else if (input.period === "weekly") {
          date.setDate(now.getDate() - (i * 7));
        } else {
          date.setMonth(now.getMonth() - i);
        }
        
        data.push({
          date: date.toISOString().split("T")[0],
          winRate: 45 + Math.random() * 30, // 45-75%
          orders: Math.floor(Math.random() * 50) + 10,
        });
      }
      
      return data;
    }),

  // Get position history with filters
  getPositionHistory: protectedProcedure
    .input(
      z.object({
        pair: z.string().optional(),
        status: z.enum(["open", "filled", "cancelled", "all"]).default("all"),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const userId = ctx.user.id;

      // Simple query without complex conditions
      let query = db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const positions = await query;

      return positions.map((position: any) => ({
        ...position,
        createdAt: position.createdAt.toISOString(),
        updatedAt: position.updatedAt?.toISOString(),
      }));
    }),

  // Get portfolio performance
  getPortfolioPerformance: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const userId = ctx.user.id;

      // Get current wallet balances (simple query)
      const userWallets = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId));

      // Calculate total value
      const totalValue = userWallets.reduce(
        (sum: number, w: any) => sum + parseFloat(w.balance || "0"),
        0
      );

      // Mock PnL and ROI
      const estimatedPnL = totalValue * 0.15; // 15% profit
      const roi = 15.0;

      return {
        totalValue: totalValue.toFixed(2),
        estimatedPnL: estimatedPnL.toFixed(2),
        roi: roi.toFixed(2),
        totalOrders: 0,
        assetAllocation: userWallets.map((w: any) => ({
          asset: w.asset,
          balance: w.balance,
          percentage: totalValue > 0 ? ((parseFloat(w.balance) / totalValue) * 100).toFixed(2) : "0",
        })),
      };
    }),

  // Get trading statistics summary
  getTradingStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const userId = ctx.user.id;

    // Simple count query
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId));

    const totalOrders = allOrders.length;
    const filledOrders = allOrders.filter((o: any) => o.status === "filled");
    
    // Calculate volumes
    const buyVolume = filledOrders
      .filter((o: any) => o.side === "buy")
      .reduce((sum: number, o: any) => sum + parseFloat(o.filledAmount || "0"), 0);
    
    const sellVolume = filledOrders
      .filter((o: any) => o.side === "sell")
      .reduce((sum: number, o: any) => sum + parseFloat(o.filledAmount || "0"), 0);

    const estimatedPnL = sellVolume - buyVolume;
    const winRate = totalOrders > 0 ? ((filledOrders.length / totalOrders) * 100) : 0;

    return {
      totalOrders,
      totalTrades: filledOrders.length,
      buyVolume: buyVolume.toFixed(2),
      sellVolume: sellVolume.toFixed(2),
      estimatedPnL: estimatedPnL.toFixed(2),
      winRate: winRate.toFixed(2),
      avgOrderSize: totalOrders > 0 ? ((buyVolume + sellVolume) / totalOrders).toFixed(2) : "0",
    };
  }),
});
