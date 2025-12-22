import { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { apiLogs } from "../../drizzle/schema";
import { apiLogger } from "../logger";

export function apiLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Capture response finish event
  res.on("finish", async () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id;

    // Log to console/file
    apiLogger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId,
      ip: req.ip || req.connection?.remoteAddress,
    });

    // Log to database (async, don't block response)
    try {
      const db = await getDb();
      if (!db) return;
      
      await db.insert(apiLogs).values({
        method: req.method,
        url: req.url.substring(0, 500), // Truncate long URLs
        statusCode: res.statusCode,
        duration,
        userId,
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.headers["user-agent"]?.substring(0, 500) || null,
        error: res.statusCode >= 400 ? res.statusMessage : null,
      });
    } catch (error) {
      // Don't fail the request if logging fails
      apiLogger.error({ error, message: "Failed to log API request to database" });
    }
  });

  next();
}
