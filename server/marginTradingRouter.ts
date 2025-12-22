/**
 * Margin Trading Router
 * 
 * Provides tRPC procedures for margin trading with leverage up to 100x
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { marginAccounts, positions, wallets, futuresContracts } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendUserNotification } from "./websocketBroadcaster";

export const marginTradingRouter = router({
  /**
   * Get or create margin account for user
   */
  getMarginAccount: protectedProcedure
    .input(z.object({ currency: z.string().default("USDT") }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let [account] = await db
        .select()
        .from(marginAccounts)
        .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, input.currency)))
        .limit(1);

      if (!account) {
        // Create new margin account
        await db.insert(marginAccounts).values({
          userId: ctx.user.id,
          currency: input.currency,
          balance: "0",
          available: "0",
          locked: "0",
          leverage: 1,
          marginLevel: "0",
          totalDebt: "0",
        });

        [account] = await db
          .select()
          .from(marginAccounts)
          .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, input.currency)))
          .limit(1);
      }

      return account;
    }),

  /**
   * Transfer funds from spot wallet to margin account
   */
  transferToMargin: protectedProcedure
    .input(
      z.object({
        currency: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check spot wallet balance
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.userId, ctx.user.id), eq(wallets.asset, input.currency)))
        .limit(1);

      if (!wallet || parseFloat(wallet.balance) < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance in spot wallet" });
      }

      // Deduct from spot wallet
      await db
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${input.amount}`,
        })
        .where(and(eq(wallets.userId, ctx.user.id), eq(wallets.asset, input.currency)));

      // Add to margin account
      const [marginAccount] = await db
        .select()
        .from(marginAccounts)
        .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, input.currency)))
        .limit(1);

      if (marginAccount) {
        await db
          .update(marginAccounts)
          .set({
            balance: sql`${marginAccounts.balance} + ${input.amount}`,
            available: sql`${marginAccounts.available} + ${input.amount}`,
          })
          .where(eq(marginAccounts.id, marginAccount.id));
      } else {
        await db.insert(marginAccounts).values({
          userId: ctx.user.id,
          currency: input.currency,
          balance: input.amount.toString(),
          available: input.amount.toString(),
          locked: "0",
          leverage: 1,
          marginLevel: "0",
          totalDebt: "0",
        });
      }

      return { success: true, message: `Transferred ${input.amount} ${input.currency} to margin account` };
    }),

  /**
   * Set leverage for margin account
   */
  setLeverage: protectedProcedure
    .input(
      z.object({
        currency: z.string(),
        leverage: z.number().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [account] = await db
        .select()
        .from(marginAccounts)
        .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, input.currency)))
        .limit(1);

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Margin account not found" });
      }

      // Check if user has open positions
      const openPositions = await db
        .select()
        .from(positions)
        .where(and(eq(positions.userId, ctx.user.id), eq(positions.status, "open")))
        .limit(1);

      if (openPositions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change leverage with open positions. Close all positions first.",
        });
      }

      await db
        .update(marginAccounts)
        .set({ leverage: input.leverage })
        .where(eq(marginAccounts.id, account.id));

      return { success: true, leverage: input.leverage };
    }),

  /**
   * Open a leveraged position
   */
  openPosition: protectedProcedure
    .input(
      z.object({
        symbol: z.string(), // e.g., "BTC/USDT"
        side: z.enum(["long", "short"]),
        size: z.number().positive(),
        marginMode: z.enum(["isolated", "cross"]).default("isolated"),
        stopLoss: z.number().optional(),
        takeProfit: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get margin account
      const quoteAsset = input.symbol.split("/")[1];
      const [marginAccount] = await db
        .select()
        .from(marginAccounts)
        .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, quoteAsset)))
        .limit(1);

      if (!marginAccount) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Margin account not found. Transfer funds first." });
      }

      // Get current price (simplified - in production use mark price from futures contract)
      const currentPrice = 50000; // TODO: Get from price feed

      // Calculate required margin
      const positionValue = input.size * currentPrice;
      const requiredMargin = positionValue / marginAccount.leverage;

      if (parseFloat(marginAccount.available) < requiredMargin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient margin. Required: ${requiredMargin.toFixed(2)} ${quoteAsset}, Available: ${marginAccount.available} ${quoteAsset}`,
        });
      }

      // Calculate liquidation price
      const maintenanceMarginRate = 0.005; // 0.5%
      const liquidationPrice =
        input.side === "long"
          ? currentPrice * (1 - 1 / marginAccount.leverage + maintenanceMarginRate)
          : currentPrice * (1 + 1 / marginAccount.leverage - maintenanceMarginRate);

      // Create position
      const [position] = await db
        .insert(positions)
        .values({
          userId: ctx.user.id,
          symbol: input.symbol,
          contractType: "perpetual",
          side: input.side,
          size: input.size.toString(),
          entryPrice: currentPrice.toString(),
          markPrice: currentPrice.toString(),
          liquidationPrice: liquidationPrice.toString(),
          leverage: marginAccount.leverage,
          marginMode: input.marginMode,
          margin: requiredMargin.toString(),
          unrealizedPnL: "0",
          realizedPnL: "0",
          fundingFee: "0",
          status: "open",
        })
        .$returningId();

      // Lock margin in account
      await db
        .update(marginAccounts)
        .set({
          available: sql`${marginAccounts.available} - ${requiredMargin}`,
          locked: sql`${marginAccounts.locked} + ${requiredMargin}`,
        })
        .where(eq(marginAccounts.id, marginAccount.id));

      // Send notification
      sendUserNotification({
        userId: ctx.user.id,
        type: "trade",
        title: "Position Opened",
        message: `Opened ${input.side} position for ${input.size} ${input.symbol} at ${currentPrice} with ${marginAccount.leverage}x leverage`,
        data: {
          positionId: position.id,
          symbol: input.symbol,
          side: input.side,
          size: input.size,
          entryPrice: currentPrice,
          leverage: marginAccount.leverage,
        },
      });

      return {
        success: true,
        position: {
          id: position.id,
          symbol: input.symbol,
          side: input.side,
          size: input.size,
          entryPrice: currentPrice,
          liquidationPrice,
          leverage: marginAccount.leverage,
          margin: requiredMargin,
        },
      };
    }),

  /**
   * Close a position
   */
  closePosition: protectedProcedure
    .input(z.object({ positionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
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

      if (position.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Position is not open" });
      }

      // Get current price
      const currentPrice = 51000; // TODO: Get from price feed

      // Calculate PnL
      const entryPrice = parseFloat(position.entryPrice);
      const size = parseFloat(position.size);
      const pnl =
        position.side === "long" ? (currentPrice - entryPrice) * size : (entryPrice - currentPrice) * size;

      // Update position
      await db
        .update(positions)
        .set({
          status: "closed",
          markPrice: currentPrice.toString(),
          realizedPnL: pnl.toString(),
          closedAt: new Date(),
        })
        .where(eq(positions.id, input.positionId));

      // Release margin and apply PnL
      const quoteAsset = position.symbol.split("/")[1];
      const margin = parseFloat(position.margin);
      const finalAmount = margin + pnl;

      const [marginAccount] = await db
        .select()
        .from(marginAccounts)
        .where(and(eq(marginAccounts.userId, ctx.user.id), eq(marginAccounts.currency, quoteAsset)))
        .limit(1);

      if (marginAccount) {
        await db
          .update(marginAccounts)
          .set({
            available: sql`${marginAccounts.available} + ${finalAmount}`,
            locked: sql`${marginAccounts.locked} - ${margin}`,
            balance: sql`${marginAccounts.balance} + ${pnl}`,
          })
          .where(eq(marginAccounts.id, marginAccount.id));
      }

      // Send notification
      sendUserNotification({
        userId: ctx.user.id,
        type: "trade",
        title: "Position Closed",
        message: `Closed ${position.side} position for ${position.symbol}. PnL: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${quoteAsset}`,
        data: {
          positionId: input.positionId,
          symbol: position.symbol,
          side: position.side,
          pnl,
        },
      });

      return {
        success: true,
        pnl,
        closedPrice: currentPrice,
      };
    }),

  /**
   * Get user's open positions
   */
  getOpenPositions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.userId, ctx.user.id), eq(positions.status, "open")));

    return openPositions;
  }),

  /**
   * Get position history
   */
  getPositionHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const history = await db
        .select()
        .from(positions)
        .where(eq(positions.userId, ctx.user.id))
        .limit(input.limit);

      return history;
    }),
});
