import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, sessions, emailVerifications, passwordResets } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { inferProcedureInput } from "@trpc/server";
import type { AppRouter } from "./routers";

// Helper to create test context
const createTestContext = (user?: any, testId?: string, authToken?: string) => ({
  user: user || null,
  req: {
    headers: {},
    // Use unique IP per test to avoid rate limiting
    socket: { remoteAddress: testId ? `127.0.0.${testId.charCodeAt(0) % 255}` : "127.0.0.1" },
    cookies: authToken ? { auth_token: authToken } : {},
  } as any,
  res: {
    setHeader: () => {},
    getHeader: () => undefined,
    cookie: () => {}, // Mock cookie function
    clearCookie: () => {}, // Mock clearCookie function
  } as any,
});

describe("Auth System Tests", () => {
  let testUserId: number | null = null;
  let testEmail: string;

  beforeEach(async () => {
    // Generate unique email for each test
    testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      const db = await getDb();
      if (db) {
        await db.delete(sessions).where(eq(sessions.userId, testUserId));
        await db.delete(emailVerifications).where(eq(emailVerifications.userId, testUserId));
        await db.delete(passwordResets).where(eq(passwordResets.userId, testUserId));
        await db.delete(users).where(eq(users.id, testUserId));
      }
      testUserId = null;
    }
  });

  describe("Registration", () => {
    it("should register a new user successfully", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "reg1"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const input: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };

      const result = await caller.auth.register(input);
      
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("message");
      expect(result.message).toContain("verification code");
      
      testUserId = result.userId;

      // Verify user was created in database
      const db = await getDb();
      if (db) {
        const [user] = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
        expect(user).toBeDefined();
        expect(user.email).toBe(testEmail);
        expect(user.name).toBe("Test User");
        expect(user.emailVerified).toBeNull();
      }
    });

    it("should reject duplicate email registration", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "reg2"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const input: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };

      // First registration
      const result = await caller.auth.register(input);
      testUserId = result.userId;

      // Second registration with same email should fail
      await expect(caller.auth.register(input)).rejects.toThrow("Email already registered");
    });

    it("should reject weak passwords", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "reg3"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const input: RegisterInput = {
        email: testEmail,
        password: "weak",
        name: "Test User",
      };

      await expect(caller.auth.register(input)).rejects.toThrow();
    });
  });

  describe("Email Verification", () => {
    it("should verify email with correct code", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "ver1"));
      
      // Register user
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };
      const registerResult = await caller.auth.register(registerInput);
      testUserId = registerResult.userId;

      // Get verification code from database
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [verification] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, testUserId))
        .limit(1);
      
      expect(verification).toBeDefined();
      expect(verification.code).toHaveLength(6);

      // Verify email with code
      type VerifyInput = inferProcedureInput<AppRouter["auth"]["verifyEmail"]>;
      const verifyInput: VerifyInput = {
        userId: testUserId,
        code: verification.code,
      };
      const verifyResult = await caller.auth.verifyEmail(verifyInput);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.message).toContain("verified");

      // Check user is now verified
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      expect(user.emailVerified).not.toBeNull();
    });

    it("should reject invalid verification code", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "ver2"));
      
      // Register user
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };
      const registerResult = await caller.auth.register(registerInput);
      testUserId = registerResult.userId;

      // Try with wrong code
      type VerifyInput = inferProcedureInput<AppRouter["auth"]["verifyEmail"]>;
      const verifyInput: VerifyInput = {
        userId: testUserId,
        code: "WRONG1",
      };
      
      await expect(caller.auth.verifyEmail(verifyInput)).rejects.toThrow("Invalid or expired");
    });
  });

  describe("Login", () => {
    beforeEach(async () => {
      // Create and verify a test user before login tests
      const caller = appRouter.createCaller(createTestContext(null, "log0"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };
      const registerResult = await caller.auth.register(registerInput);
      testUserId = registerResult.userId;

      // Verify the user
      const db = await getDb();
      if (db) {
        const [verification] = await db
          .select()
          .from(emailVerifications)
          .where(eq(emailVerifications.userId, testUserId))
          .limit(1);
        
        type VerifyInput = inferProcedureInput<AppRouter["auth"]["verifyEmail"]>;
        const verifyInput: VerifyInput = {
          userId: testUserId,
          code: verification.code,
        };
        await caller.auth.verifyEmail(verifyInput);
      }
    });

    it("should login with correct credentials", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "log1"));
      
      type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
      const loginInput: LoginInput = {
        email: testEmail,
        password: "SecurePass123!",
      };
      
      const result = await caller.auth.login(loginInput);
      
      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe(testEmail);
    });

    it("should reject wrong password", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "log2"));
      
      type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
      const loginInput: LoginInput = {
        email: testEmail,
        password: "WrongPassword123!",
      };
      
      await expect(caller.auth.login(loginInput)).rejects.toThrow("Invalid email or password");
    });

    it("should reject non-existent user", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "log3"));
      
      type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
      const loginInput: LoginInput = {
        email: "nonexistent@example.com",
        password: "AnyPassword123!",
      };
      
      await expect(caller.auth.login(loginInput)).rejects.toThrow("Invalid email or password");
    });

    it("should reject unverified user login", async () => {
      // Create unverified user
      const caller = appRouter.createCaller(createTestContext(null, "log4"));
      const unverifiedEmail = `unverified-${Date.now()}@example.com`;
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: unverifiedEmail,
        password: "SecurePass123!",
        name: "Unverified User",
      };
      const registerResult = await caller.auth.register(registerInput);
      const unverifiedUserId = registerResult.userId;

      // Try to login without verification
      type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
      const loginInput: LoginInput = {
        email: unverifiedEmail,
        password: "SecurePass123!",
      };
      
      await expect(caller.auth.login(loginInput)).rejects.toThrow("Please verify your email");

      // Cleanup
      const db = await getDb();
      if (db) {
        await db.delete(emailVerifications).where(eq(emailVerifications.userId, unverifiedUserId));
        await db.delete(users).where(eq(users.id, unverifiedUserId));
      }
    });
  });

  describe("Password Reset", () => {
    beforeEach(async () => {
      // Create and verify a test user
      const caller = appRouter.createCaller(createTestContext(null, "rst0"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: testEmail,
        password: "OldPassword123!",
        name: "Test User",
      };
      const registerResult = await caller.auth.register(registerInput);
      testUserId = registerResult.userId;

      // Verify the user
      const db = await getDb();
      if (db) {
        const [verification] = await db
          .select()
          .from(emailVerifications)
          .where(eq(emailVerifications.userId, testUserId))
          .limit(1);
        
        type VerifyInput = inferProcedureInput<AppRouter["auth"]["verifyEmail"]>;
        const verifyInput: VerifyInput = {
          userId: testUserId,
          code: verification.code,
        };
        await caller.auth.verifyEmail(verifyInput);
      }
    });

    it("should request password reset successfully", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "rst1"));
      
      type ResetRequestInput = inferProcedureInput<AppRouter["auth"]["requestPasswordReset"]>;
      const input: ResetRequestInput = {
        email: testEmail,
      };
      
      const result = await caller.auth.requestPasswordReset(input);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("reset link");

      // Verify reset token was created
      const db = await getDb();
      if (db) {
        const [reset] = await db
          .select()
          .from(passwordResets)
          .where(eq(passwordResets.userId, testUserId!))
          .limit(1);
        
        expect(reset).toBeDefined();
        expect(reset.token).toBeDefined();
      }
    });

    it("should reset password with valid token", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "rst2"));
      
      // Request reset
      type ResetRequestInput = inferProcedureInput<AppRouter["auth"]["requestPasswordReset"]>;
      const requestInput: ResetRequestInput = {
        email: testEmail,
      };
      await caller.auth.requestPasswordReset(requestInput);

      // Get reset token
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.userId, testUserId!))
        .limit(1);
      
      expect(reset).toBeDefined();

      // Reset password
      type ResetPasswordInput = inferProcedureInput<AppRouter["auth"]["resetPassword"]>;
      const resetInput: ResetPasswordInput = {
        token: reset.token,
        newPassword: "NewSecurePass123!",
      };
      
      const result = await caller.auth.resetPassword(resetInput);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("reset successfully");

      // Verify can login with new password
      type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
      const loginInput: LoginInput = {
        email: testEmail,
        password: "NewSecurePass123!",
      };
      
      const loginResult = await caller.auth.login(loginInput);
      expect(loginResult.user.email).toBe(testEmail);
    });

    it("should reject invalid reset token", async () => {
      const caller = appRouter.createCaller(createTestContext(null, "rst3"));
      
      type ResetPasswordInput = inferProcedureInput<AppRouter["auth"]["resetPassword"]>;
      const resetInput: ResetPasswordInput = {
        token: "invalid-token-12345",
        newPassword: "NewSecurePass123!",
      };
      
      await expect(caller.auth.resetPassword(resetInput)).rejects.toThrow("Invalid or expired");
    });
  });

  describe("Session Management", () => {
    let userContext: any;
    let authToken: string;

    beforeEach(async () => {
      // Create, verify, and login a test user
      const caller = appRouter.createCaller(createTestContext(null, "ses0"));
      
      type RegisterInput = inferProcedureInput<AppRouter["auth"]["register"]>;
      const registerInput: RegisterInput = {
        email: testEmail,
        password: "SecurePass123!",
        name: "Test User",
      };
      const registerResult = await caller.auth.register(registerInput);
      testUserId = registerResult.userId;

      // Verify
      const db = await getDb();
      if (db) {
        const [verification] = await db
          .select()
          .from(emailVerifications)
          .where(eq(emailVerifications.userId, testUserId))
          .limit(1);
        
        type VerifyInput = inferProcedureInput<AppRouter["auth"]["verifyEmail"]>;
        const verifyInput: VerifyInput = {
          userId: testUserId,
          code: verification.code,
        };
        await caller.auth.verifyEmail(verifyInput);

        // Login
        type LoginInput = inferProcedureInput<AppRouter["auth"]["login"]>;
        const loginInput: LoginInput = {
          email: testEmail,
          password: "SecurePass123!",
        };
        const loginResult = await caller.auth.login(loginInput);
        authToken = loginResult.token;

        // Get user from database for context
        const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
        userContext = createTestContext(user, "ses", authToken);
      }
    });

    it("should list user sessions", async () => {
      const caller = appRouter.createCaller(userContext);
      
      const result = await caller.auth.listSessions();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("token");
      expect(result[0]).toHaveProperty("createdAt");
    });

    it("should revoke a session", async () => {
      const caller = appRouter.createCaller(userContext);
      
      // Get sessions
      const sessions = await caller.auth.listSessions();
      expect(sessions.length).toBeGreaterThan(0);

      // Revoke first session
      type RevokeInput = inferProcedureInput<AppRouter["auth"]["revokeSession"]>;
      const revokeInput: RevokeInput = {
        sessionId: sessions[0].id,
      };
      
      const result = await caller.auth.revokeSession(revokeInput);
      
      expect(result.success).toBe(true);

      // Verify session was removed
      const updatedSessions = await caller.auth.listSessions();
      const revokedSession = updatedSessions.find(s => s.id === sessions[0].id);
      expect(revokedSession).toBeUndefined();
    });

    it("should logout and revoke current session", async () => {
      const caller = appRouter.createCaller(userContext);
      
      const result = await caller.auth.logout();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("logged out");
    });
  });
});
