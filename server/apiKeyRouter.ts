/**
 * API Key Management Router
 * 
 * Provides tRPC procedures for managing Trading Bot API keys:
 * - Generate new API keys
 * - List user's API keys
 * - Revoke API keys
 * - View API usage statistics
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { apiKeys, apiRequestLogs } from "../drizzle/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";

export const apiKeyRouter = router({
  /**
   * Generate a new API key
   */
  generate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        permissions: z.array(z.enum(["trading", "read", "withdraw"])),
        rateLimit: z.number().min(10).max(1000).default(100),
        ipWhitelist: z.array(z.string()).optional(),
        expiresInDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Generate random API key and secret
      const apiKey = `btc_${crypto.randomBytes(24).toString("hex")}`;
      const apiSecret = crypto.randomBytes(32).toString("hex");
      const hashedSecret = crypto.createHash("sha256").update(apiSecret).digest("hex");

      // Calculate expiration date
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Insert API key
      await db.insert(apiKeys).values({
        userId: ctx.user.id,
        name: input.name,
        key: apiKey,
        secret: hashedSecret,
        permissions: JSON.stringify(input.permissions),
        rateLimit: input.rateLimit,
        ipWhitelist: input.ipWhitelist ? JSON.stringify(input.ipWhitelist) : null,
        enabled: true,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        apiKey,
        apiSecret, // Only returned once!
        message: "API key generated successfully. Save the secret - it won't be shown again!",
      };
    }),

  /**
   * List user's API keys
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        key: apiKeys.key,
        permissions: apiKeys.permissions,
        rateLimit: apiKeys.rateLimit,
        ipWhitelist: apiKeys.ipWhitelist,
        enabled: apiKeys.enabled,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, ctx.user.id))
      .orderBy(desc(apiKeys.createdAt));

    return keys.map((k) => ({
      ...k,
      permissions: JSON.parse(k.permissions),
      ipWhitelist: k.ipWhitelist ? JSON.parse(k.ipWhitelist) : null,
    }));
  }),

  /**
   * Revoke (disable) an API key
   */
  revoke: protectedProcedure
    .input(z.object({ keyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Verify key belongs to user
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, ctx.user.id)))
        .limit(1);

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Disable the key
      await db
        .update(apiKeys)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(apiKeys.id, input.keyId));

      return { success: true, message: "API key revoked successfully" };
    }),

  /**
   * Delete an API key permanently
   */
  delete: protectedProcedure
    .input(z.object({ keyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Verify key belongs to user
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, ctx.user.id)))
        .limit(1);

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Delete the key
      await db.delete(apiKeys).where(eq(apiKeys.id, input.keyId));

      return { success: true, message: "API key deleted successfully" };
    }),

  /**
   * Get API usage statistics for a key
   */
  getUsageStats: protectedProcedure
    .input(
      z.object({
        keyId: z.number(),
        days: z.number().min(1).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Verify key belongs to user
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, ctx.user.id)))
        .limit(1);

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      // Get request count and average response time
      const [stats] = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          avgResponseTime: sql<number>`AVG(${apiRequestLogs.responseTime})`,
          errorCount: sql<number>`SUM(CASE WHEN ${apiRequestLogs.statusCode} >= 400 THEN 1 ELSE 0 END)`,
        })
        .from(apiRequestLogs)
        .where(
          and(
            eq(apiRequestLogs.apiKeyId, input.keyId),
            gte(apiRequestLogs.createdAt, startDate)
          )
        );

      // Get recent requests
      const recentRequests = await db
        .select({
          endpoint: apiRequestLogs.endpoint,
          method: apiRequestLogs.method,
          statusCode: apiRequestLogs.statusCode,
          responseTime: apiRequestLogs.responseTime,
          createdAt: apiRequestLogs.createdAt,
        })
        .from(apiRequestLogs)
        .where(
          and(
            eq(apiRequestLogs.apiKeyId, input.keyId),
            gte(apiRequestLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(apiRequestLogs.createdAt))
        .limit(100);

      return {
        totalRequests: stats?.totalRequests || 0,
        avgResponseTime: stats?.avgResponseTime || 0,
        errorCount: stats?.errorCount || 0,
        successRate:
          stats?.totalRequests
            ? ((stats.totalRequests - (stats.errorCount || 0)) / stats.totalRequests) * 100
            : 100,
        recentRequests,
      };
    }),
});
