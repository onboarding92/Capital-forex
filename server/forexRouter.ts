import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { economicEvents, tradingSignals, marketAnalysis, priceAlerts } from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const forexRouter = router({
  // ========================================
  // ECONOMIC CALENDAR
  // ========================================
  
  getEconomicEvents: publicProcedure
    .input(z.object({
      impact: z.enum(["high", "medium", "low"]).optional(),
      currency: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let conditions = [
        gte(economicEvents.eventTime, input.startDate || now),
        lte(economicEvents.eventTime, input.endDate || sevenDaysLater),
      ];

      if (input.impact) {
        conditions.push(eq(economicEvents.impact, input.impact));
      }

      if (input.currency) {
        conditions.push(eq(economicEvents.currency, input.currency));
      }

      const events = await db
        .select()
        .from(economicEvents)
        .where(and(...conditions))
        .orderBy(economicEvents.eventTime)
        .limit(100);

      return events;
    }),

  // ========================================
  // TRADING SIGNALS
  // ========================================

  getTradingSignals: publicProcedure
    .input(z.object({
      pair: z.string().optional(),
      status: z.enum(["active", "closed", "expired"]).optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let conditions = [];

      if (input.pair) {
        conditions.push(eq(tradingSignals.pair, input.pair));
      }

      if (input.status) {
        conditions.push(eq(tradingSignals.status, input.status));
      } else {
        // Default to active signals
        conditions.push(eq(tradingSignals.status, "active"));
      }

      const signals = await db
        .select()
        .from(tradingSignals)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(tradingSignals.createdAt))
        .limit(input.limit);

      return signals;
    }),

  getSignalById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [signal] = await db
        .select()
        .from(tradingSignals)
        .where(eq(tradingSignals.id, input.id))
        .limit(1);

      if (!signal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Signal not found" });
      }

      return signal;
    }),

  getSignalPerformance: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get performance stats for closed signals
      const stats = await db
        .select({
          totalSignals: sql<number>`COUNT(*)`,
          profitableSignals: sql<number>`SUM(CASE WHEN result = 'profit' THEN 1 ELSE 0 END)`,
          losingSignals: sql<number>`SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END)`,
          totalPips: sql<number>`SUM(CASE WHEN pips IS NOT NULL THEN pips ELSE 0 END)`,
          avgPips: sql<number>`AVG(CASE WHEN pips IS NOT NULL THEN pips ELSE 0 END)`,
        })
        .from(tradingSignals)
        .where(eq(tradingSignals.status, "closed"));

      const [result] = stats;
      
      return {
        totalSignals: Number(result?.totalSignals || 0),
        profitableSignals: Number(result?.profitableSignals || 0),
        losingSignals: Number(result?.losingSignals || 0),
        totalPips: Number(result?.totalPips || 0),
        avgPips: Number(result?.avgPips || 0),
        winRate: result && result.totalSignals > 0 
          ? ((Number(result.profitableSignals) / Number(result.totalSignals)) * 100).toFixed(1)
          : "0.0",
      };
    }),

  // ========================================
  // MARKET ANALYSIS
  // ========================================

  getMarketAnalysis: publicProcedure
    .input(z.object({
      pair: z.string(),
      timeframe: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let conditions = [eq(marketAnalysis.pair, input.pair)];

      if (input.timeframe) {
        conditions.push(eq(marketAnalysis.timeframe, input.timeframe));
      }

      const analysis = await db
        .select()
        .from(marketAnalysis)
        .where(and(...conditions))
        .orderBy(desc(marketAnalysis.createdAt))
        .limit(10);

      return analysis;
    }),

  getAllMarketAnalysis: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get latest analysis for each pair
      const analysis = await db
        .select()
        .from(marketAnalysis)
        .orderBy(desc(marketAnalysis.createdAt))
        .limit(50);

      return analysis;
    }),

  // ========================================
  // PRICE ALERTS
  // ========================================

  createPriceAlert: protectedProcedure
    .input(z.object({
      pair: z.string(),
      targetPrice: z.string(),
      condition: z.enum(["above", "below"]),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [alert] = await db.insert(priceAlerts).values({
        userId: ctx.user.id,
        pair: input.pair,
        targetPrice: input.targetPrice,
        condition: input.condition,
        expiresAt: input.expiresAt,
      });

      return { success: true, alertId: alert.insertId };
    }),

  getMyPriceAlerts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const alerts = await db
        .select()
        .from(priceAlerts)
        .where(and(
          eq(priceAlerts.userId, ctx.user.id),
          eq(priceAlerts.triggered, false)
        ))
        .orderBy(desc(priceAlerts.createdAt));

      return alerts;
    }),

  deletePriceAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify ownership
      const [alert] = await db
        .select()
        .from(priceAlerts)
        .where(eq(priceAlerts.id, input.id))
        .limit(1);

      if (!alert || alert.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await db.delete(priceAlerts).where(eq(priceAlerts.id, input.id));

      return { success: true };
    }),
});
