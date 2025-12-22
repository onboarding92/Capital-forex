/**
 * Futures Trading Router
 * 
 * Provides tRPC procedures for futures and perpetual contracts trading
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { futuresContracts, fundingHistory, positions } from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const futuresRouter = router({
  /**
   * Get all active futures contracts
   */
  getContracts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const contracts = await db
      .select()
      .from(futuresContracts)
      .where(eq(futuresContracts.isActive, true));

    return contracts;
  }),

  /**
   * Get specific contract details
   */
  getContract: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [contract] = await db
        .select()
        .from(futuresContracts)
        .where(eq(futuresContracts.symbol, input.symbol))
        .limit(1);

      if (!contract) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
      }

      return contract;
    }),

  /**
   * Get funding rate history for a contract
   */
  getFundingHistory: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        limit: z.number().min(1).max(100).default(24), // Default 24 = 3 days of 8-hour funding
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const history = await db
        .select()
        .from(fundingHistory)
        .where(eq(fundingHistory.symbol, input.symbol))
        .orderBy(desc(fundingHistory.fundingTime))
        .limit(input.limit);

      return history;
    }),

  /**
   * Get open interest for a contract
   */
  getOpenInterest: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [contract] = await db
        .select({
          symbol: futuresContracts.symbol,
          openInterest: futuresContracts.openInterest,
          volume24h: futuresContracts.volume24h,
        })
        .from(futuresContracts)
        .where(eq(futuresContracts.symbol, input.symbol))
        .limit(1);

      if (!contract) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
      }

      return contract;
    }),

  /**
   * Get user's futures positions
   */
  getMyFuturesPositions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const futuresPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.userId, ctx.user.id),
          eq(positions.contractType, "perpetual"),
          eq(positions.status, "open")
        )
      );

    return futuresPositions;
  }),

  /**
   * Calculate funding fee for a position
   */
  calculateFundingFee: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get position
      const [position] = await db
        .select()
        .from(positions)
        .where(and(eq(positions.id, input.positionId), eq(positions.userId, ctx.user.id)))
        .limit(1);

      if (!position) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Position not found" });
      }

      // Get contract
      const [contract] = await db
        .select()
        .from(futuresContracts)
        .where(eq(futuresContracts.symbol, position.symbol))
        .limit(1);

      if (!contract) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
      }

      // Calculate funding fee
      // Funding Fee = Position Value × Funding Rate
      const positionValue = parseFloat(position.size) * parseFloat(position.markPrice);
      const fundingRate = parseFloat(contract.fundingRate);
      const fundingFee = positionValue * fundingRate;

      // Long positions pay funding fee, short positions receive it
      const actualFee = position.side === "long" ? -fundingFee : fundingFee;

      return {
        positionId: input.positionId,
        symbol: position.symbol,
        fundingRate: contract.fundingRate,
        positionValue,
        fundingFee: actualFee,
        nextFundingTime: contract.nextFundingTime,
      };
    }),

  /**
   * Get contract statistics
   */
  getContractStats: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [contract] = await db
        .select()
        .from(futuresContracts)
        .where(eq(futuresContracts.symbol, input.symbol))
        .limit(1);

      if (!contract) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });
      }

      // Get recent funding history
      const recentFunding = await db
        .select()
        .from(fundingHistory)
        .where(eq(fundingHistory.symbol, input.symbol))
        .orderBy(desc(fundingHistory.fundingTime))
        .limit(8); // Last 8 funding periods

      // Calculate average funding rate
      const avgFundingRate =
        recentFunding.length > 0
          ? recentFunding.reduce((sum, f) => sum + parseFloat(f.fundingRate), 0) / recentFunding.length
          : 0;

      return {
        symbol: contract.symbol,
        markPrice: contract.markPrice,
        indexPrice: contract.indexPrice,
        lastPrice: contract.lastPrice,
        fundingRate: contract.fundingRate,
        avgFundingRate: avgFundingRate.toString(),
        nextFundingTime: contract.nextFundingTime,
        openInterest: contract.openInterest,
        volume24h: contract.volume24h,
        maxLeverage: contract.maxLeverage,
      };
    }),
});
