/**
 * Two-Factor Authentication (2FA) Utilities
 * 
 * Implements TOTP (Time-based One-Time Password) using Google Authenticator compatible tokens.
 */

import speakeasy from "speakeasy";
import crypto from "crypto";

/**
 * Generate 2FA secret for a user
 */
export function generate2FASecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    name: `BitChange Pro (${userEmail})`,
    issuer: "BitChange Pro",
    length: 32,
  });
  
  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url || "",
  };
}

/**
 * Verify TOTP token
 */
export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before/after for clock drift
  });
}

/**
 * Generate backup codes (10 codes, 8 characters each)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Verify backup code against hashed codes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const hashedInput = hashBackupCode(code);
  return hashedCodes.includes(hashedInput);
}

/**
 * Remove used backup code from list
 */
export function removeBackupCode(code: string, hashedCodes: string[]): string[] {
  const hashedInput = hashBackupCode(code);
  return hashedCodes.filter(c => c !== hashedInput);
}
