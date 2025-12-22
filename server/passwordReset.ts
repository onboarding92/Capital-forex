import crypto from "crypto";
import { getDb } from "./db";
import { passwordResets, users, passwordHistory } from "../drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendPasswordResetEmail } from "./email";
import { hashPassword } from "./authHelpers";

/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Find user by email
  const userResult = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userResult.length === 0) {
    // Don't reveal if email exists
    return true;
  }

  const user = userResult[0];
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Store reset token
  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    used: false,
    expiresAt,
  });

  // Send email with reset link
  const resetLink = `${process.env.VITE_APP_URL || 'https://bitchangemoney.xyz'}/reset-password?token=${token}`;
  await sendPasswordResetEmail({
    to: user.email!,
    resetLink,
    expiresAt: expiresAt.toLocaleString(),
  });

  return true;
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Find valid, unused token
  const result = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        eq(passwordResets.used, false),
        gt(passwordResets.expiresAt, sql`NOW()`)
      )
    )
    .orderBy(passwordResets.createdAt)
    .limit(1);

  if (result.length === 0) return false;

  const reset = result[0];

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Save old password to history
  const userResult = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, reset.userId))
    .limit(1);

  if (userResult.length > 0 && userResult[0].password) {
    await db.insert(passwordHistory).values({
      userId: reset.userId,
      passwordHash: userResult[0].password,
    });
  }

  // Update user password
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, reset.userId));

  // Mark token as used
  await db
    .update(passwordResets)
    .set({ used: true })
    .where(eq(passwordResets.id, reset.id));

  return true;
}

/**
 * Verify reset token is valid
 */
export async function verifyResetToken(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        eq(passwordResets.used, false),
        gt(passwordResets.expiresAt, sql`NOW()`)
      )
    )
    .limit(1);

  return result.length > 0;
}
