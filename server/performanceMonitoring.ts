import { getDb } from "./db";
import { logger } from "./logger";
import fs from "fs";
import path from "path";

/**
 * Track bundle size from build output
 */
export async function trackBundleSize(): Promise<void> {
  try {
    const distPath = path.join(process.cwd(), "client/dist");
    
    if (!fs.existsSync(distPath)) {
      logger.warn("Build directory not found, skipping bundle size tracking");
      return;
    }

    const files = fs.readdirSync(distPath, { recursive: true, withFileTypes: true });
    let totalSize = 0;
    const jsFiles: { name: string; size: number }[] = [];

    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(distPath, file.name);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        if (file.name.endsWith(".js")) {
          jsFiles.push({ name: file.name, size: stats.size });
        }
      }
    }

    const db = await getDb();
    if (db) {
      const { systemMetrics } = await import("../drizzle/schema");
      
      await db.insert(systemMetrics).values({
        metricType: "bundle_size",
        value: totalSize.toString(),
        unit: "bytes",
        metadata: JSON.stringify({
          totalSize,
          jsFiles: jsFiles.sort((a, b) => b.size - a.size).slice(0, 10), // Top 10 largest JS files
        }),
      });

      logger.info(`Bundle size tracked: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to track bundle size");
  }
}

/**
 * Track Redis cache performance
 */
export async function trackRedisCachePerformance(
  operation: "hit" | "miss" | "set" | "delete",
  key: string,
  duration?: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { systemMetrics } = await import("../drizzle/schema");
    
    await db.insert(systemMetrics).values({
      metricType: "redis_cache",
      value: (duration || 0).toString(),
      unit: "ms",
      metadata: JSON.stringify({
        operation,
        key,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to track Redis cache performance");
  }
}

/**
 * Get Redis cache statistics
 */
export async function getRedisCacheStats(hours: number = 24): Promise<{
  hitRate: number;
  totalOperations: number;
  avgDuration: number;
}> {
  const db = await getDb();
  if (!db) {
    return { hitRate: 0, totalOperations: 0, avgDuration: 0 };
  }

  try {
    const { systemMetrics } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const metrics = await db
      .select()
      .from(systemMetrics)
      .where(sql`${systemMetrics.metricType} = 'redis_cache' AND ${systemMetrics.createdAt} >= ${startTime}`);

    let hits = 0;
    let misses = 0;
    let totalDuration = 0;

    for (const metric of metrics) {
      const metadata = JSON.parse(metric.metadata || "{}");
      if (metadata.operation === "hit") hits++;
      if (metadata.operation === "miss") misses++;
      totalDuration += parseFloat(metric.value);
    }

    const totalOperations = hits + misses;
    const hitRate = totalOperations > 0 ? (hits / totalOperations) * 100 : 0;
    const avgDuration = metrics.length > 0 ? totalDuration / metrics.length : 0;

    return {
      hitRate,
      totalOperations,
      avgDuration,
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to get Redis cache stats");
    return { hitRate: 0, totalOperations: 0, avgDuration: 0 };
  }
}

/**
 * Track WebSocket connection
 */
export async function trackWebSocketConnection(
  action: "connect" | "disconnect" | "error",
  userId?: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { systemMetrics } = await import("../drizzle/schema");
    
    await db.insert(systemMetrics).values({
      metricType: "websocket",
      value: (action === "connect" ? 1 : action === "disconnect" ? -1 : 0).toString(),
      unit: "connections",
      metadata: JSON.stringify({
        action,
        userId,
        timestamp: new Date().toISOString(),
        ...metadata,
      }),
    });

    logger.info({ userId, metadata }, `WebSocket ${action}`);
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to track WebSocket connection");
  }
}

/**
 * Get active WebSocket connections count
 */
export async function getActiveWebSocketConnections(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const { systemMetrics } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    
    // Get connections from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await db
      .select({
        total: sql<number>`SUM(${systemMetrics.value})`,
      })
      .from(systemMetrics)
      .where(sql`${systemMetrics.metricType} = 'websocket' AND ${systemMetrics.createdAt} >= ${oneHourAgo}`);

    return Math.max(0, result[0]?.total || 0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to get active WebSocket connections");
    return 0;
  }
}

/**
 * Track database query performance
 */
export async function trackDbQueryPerformance(
  query: string,
  duration: number,
  success: boolean
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { systemMetrics } = await import("../drizzle/schema");
    
    await db.insert(systemMetrics).values({
      metricType: "db_query",
      value: duration.toString(),
      unit: "ms",
      metadata: JSON.stringify({
        query: query.substring(0, 200), // Limit query length
        success,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Don't log DB errors when tracking DB performance to avoid recursion
    console.error("Failed to track DB query performance:", error);
  }
}

/**
 * Get database query statistics
 */
export async function getDbQueryStats(hours: number = 24): Promise<{
  avgDuration: number;
  maxDuration: number;
  totalQueries: number;
  slowQueries: number;
}> {
  const db = await getDb();
  if (!db) {
    return { avgDuration: 0, maxDuration: 0, totalQueries: 0, slowQueries: 0 };
  }

  try {
    const { systemMetrics } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await db
      .select({
        avgDuration: sql<number>`AVG(${systemMetrics.value})`,
        maxDuration: sql<number>`MAX(${systemMetrics.value})`,
        totalQueries: sql<number>`COUNT(*)`,
        slowQueries: sql<number>`SUM(CASE WHEN ${systemMetrics.value} > 500 THEN 1 ELSE 0 END)`,
      })
      .from(systemMetrics)
      .where(sql`${systemMetrics.metricType} = 'db_query' AND ${systemMetrics.createdAt} >= ${startTime}`);

    const result = stats[0] || { avgDuration: 0, maxDuration: 0, totalQueries: 0, slowQueries: 0 };
    
    return {
      avgDuration: Math.round(result.avgDuration),
      maxDuration: Math.round(result.maxDuration),
      totalQueries: result.totalQueries,
      slowQueries: result.slowQueries,
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to get DB query stats");
    return { avgDuration: 0, maxDuration: 0, totalQueries: 0, slowQueries: 0 };
  }
}
