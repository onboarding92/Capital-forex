import { getDb } from "./db";
import { loginHistory, users } from "../drizzle/schema";
import { eq, or, and, sql } from "drizzle-orm";

export type LoginHistoryRow = {
  id: number;
  userId: number | null;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  success: boolean;
  metadata: string | null;
  createdAt: Date;
};

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(params: {
  userId?: number | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  method?: string | null;
  success: boolean;
  metadata?: Record<string, any>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { userId, email, ipAddress, userAgent, method, success, metadata } = params;

  let metadataJson: string | null = null;
  if (metadata) {
    try {
      metadataJson = JSON.stringify(metadata);
    } catch {
      metadataJson = null;
    }
  }

  await db.insert(loginHistory).values({
    userId: userId ?? null,
    email: email ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    method: method ?? null,
    success,
    metadata: metadataJson,
  });
}

/**
 * List login history for a user
 */
export async function listLoginHistoryForUser(
  userId: number,
  limit = 100
): Promise<LoginHistoryRow[]> {
  const db = await getDb();
  if (!db) return [];

  // Get user email
  const userResult = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) return [];

  const userEmail = userResult[0].email;

  // Get login history for this user (by userId or email)
  const result = await db
    .select()
    .from(loginHistory)
    .where(
      or(
        eq(loginHistory.userId, userId),
        and(
          eq(loginHistory.userId, sql`NULL`),
          eq(loginHistory.email, userEmail || "")
        )
      )
    )
    .orderBy(loginHistory.createdAt)
    .limit(limit);

  return result as LoginHistoryRow[];
}

/**
 * Get recent failed login attempts for an email
 */
export async function getRecentFailedAttempts(
  email: string,
  minutes: number = 15
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const since = new Date(Date.now() - minutes * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(loginHistory)
    .where(
      and(
        eq(loginHistory.email, email),
        eq(loginHistory.success, false),
        sql`${loginHistory.createdAt} > ${since}`
      )
    );

  return result[0]?.count || 0;
}
