import crypto from "crypto";
import { getDb } from "./db";
import { emailVerifications, users } from "../drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendVerificationEmail } from "./email";

/**
 * Generate and store email verification code
 */
export async function generateEmailCode(userId: number, email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate 6-character code
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(emailVerifications).values({
    userId,
    code,
    expiresAt,
  });

  // Send email
  await sendVerificationEmail(email, code);

  return code;
}

/**
 * Verify email code and mark user as verified
 */
export async function verifyEmailCode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Find valid code
  const result = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.userId, userId),
        eq(emailVerifications.code, code),
        gt(emailVerifications.expiresAt, sql`NOW()`)
      )
    )
    .orderBy(emailVerifications.createdAt)
    .limit(1);

  if (result.length === 0) return false;

  // Mark user as verified
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, userId));

  // Delete all verification codes for this user
  await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId));

  return true;
}

/**
 * Check if user has verified email
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) return false;

  return result[0].emailVerified !== null;
}
