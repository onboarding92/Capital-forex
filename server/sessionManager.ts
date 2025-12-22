import crypto from "crypto";
import { getDb } from "./db";
import { sessions } from "../drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";

export type SessionData = {
  userId: number;
  email: string;
  role: "user" | "admin";
};

/**
 * Create a new session and return the token
 */
export async function createSession(
  data: SessionData,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessions).values({
    userId: data.userId,
    token,
    email: data.email,
    role: data.role,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt,
  });

  return token;
}

/**
 * Get session data by token
 */
export async function getSession(token: string): Promise<SessionData | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, sql`NOW()`)))
    .limit(1);

  if (result.length === 0) return null;

  const session = result[0];
  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
  };
}

/**
 * Revoke a session by token
 */
export async function revokeSession(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(sessions).where(eq(sessions.token, token));
  return true;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(
  userId: number,
  keepToken?: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  if (keepToken) {
    await db
      .delete(sessions)
      .where(
        and(eq(sessions.userId, userId), eq(sessions.token, keepToken))
      );
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  return 1;
}

/**
 * List all active sessions for a user
 */
export async function listUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, sql`NOW()`)))
    .orderBy(sessions.createdAt);

  return result;
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  await db.delete(sessions).where(gt(sql`NOW()`, sessions.expiresAt));
  
  return 1;
}
