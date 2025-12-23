import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, comparePassword, generateToken } from "./authHelpers";
import { createSession, getSession, revokeSession, listUserSessions } from "./sessionManager";
import { generateEmailCode, verifyEmailCode } from "./emailVerification";
import { requestPasswordReset, resetPassword, verifyResetToken } from "./passwordReset";
import { checkLoginRateLimit, checkRegisterRateLimit, extractClientIp, recordLoginResult } from "./rateLimit";
import { recordLoginAttempt } from "./loginHistory";
import { sendWelcomeEmail, sendLoginAlertEmail } from "./email";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users, kycDocuments, supportTickets, ticketReplies, transactions, notifications, tradingAccounts, forexPairs, forexPositions, swapRates, marginCalls } from "../drizzle/schema";
import { eq, and, desc, sql, gte, or } from "drizzle-orm";
import { storagePut } from "./storage";
import { getUserPreferences, updateUserPreferences } from "./notificationPreferences";
import { apiKeyRouter } from "./apiKeyRouter";
import { forexRouter } from "./forexRouter";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  // ========================================
  // AUTHENTICATION & USER MANAGEMENT
  // ========================================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({ 
        email: z.string().email(), 
        password: z.string().min(8), 
        name: z.string().min(2) 
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const ip = extractClientIp(ctx.req);
        await checkRegisterRateLimit(ip);

        const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }

        const hashedPassword = await hashPassword(input.password);
        const isFirstUser = (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count === 0;

        const [user] = await db.insert(users).values({
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: isFirstUser ? "admin" : "user",
          emailVerified: false,
        }).$returningId();

        // Create default trading account
        await db.insert(tradingAccounts).values({
          userId: user.id,
          accountType: "standard",
          leverage: 100,
          balance: 10000, // Demo balance
          equity: 10000,
          margin: 0,
          freeMargin: 10000,
          marginLevel: 0,
        });

        await sendWelcomeEmail(input.email, input.name);

        const session = await createSession(user.id, ctx.req);
        ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=${session.token}; ${getSessionCookieOptions()}`);

        return { success: true, userId: user.id };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const ip = extractClientIp(ctx.req);
        await checkLoginRateLimit(ip, input.email);

        const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (!user) {
          await recordLoginResult(ip, input.email, false);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        const valid = await comparePassword(input.password, user.password);
        if (!valid) {
          await recordLoginResult(ip, input.email, false);
          await recordLoginAttempt(user.id, ip, false);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        await recordLoginResult(ip, input.email, true);
        await recordLoginAttempt(user.id, ip, true);

        const session = await createSession(user.id, ctx.req);
        ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=${session.token}; ${getSessionCookieOptions()}`);

        await sendLoginAlertEmail(user.email, ip);

        return { success: true, userId: user.id };
      }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies[COOKIE_NAME];
      if (token) await revokeSession(token);
      ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
      return { success: true };
    }),

    sessions: protectedProcedure.query(async ({ ctx }) => {
      return await listUserSessions(ctx.user.id);
    }),

    revokeSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sessions = await listUserSessions(ctx.user.id);
        const session = sessions.find(s => s.id === input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND" });
        await revokeSession(session.token);
        return { success: true };
      }),
  }),

  // ========================================
  // FOREX TRADING (moved to forexRouter.ts)
  // ========================================

  // ========================================
  // USER PROFILE & SETTINGS
  // ========================================
  user: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return user;
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set(input).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        const valid = await comparePassword(input.currentPassword, user.password);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password incorrect" });

        const hashedPassword = await hashPassword(input.newPassword);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, ctx.user.id));

        return { success: true };
      }),
  }),

  // ========================================
  // KYC
  // ========================================
  kyc: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const docs = await db.select().from(kycDocuments)
        .where(eq(kycDocuments.userId, ctx.user.id))
        .orderBy(desc(kycDocuments.uploadedAt));
      return docs;
    }),

    submit: protectedProcedure
      .input(z.object({
        documentType: z.enum(["passport", "id_card", "drivers_license"]),
        frontImage: z.string(),
        backImage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.insert(kycDocuments).values({
          userId: ctx.user.id,
          documentType: input.documentType,
          frontImageUrl: input.frontImage,
          backImageUrl: input.backImage,
          status: "pending",
          uploadedAt: new Date(),
        });

        return { success: true };
      }),
  }),

  // ========================================
  // SUPPORT
  // ========================================
  support: router({
    tickets: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await db.select().from(supportTickets)
        .where(eq(supportTickets.userId, ctx.user.id))
        .orderBy(desc(supportTickets.createdAt));
    }),

    createTicket: protectedProcedure
      .input(z.object({
        subject: z.string().min(5),
        message: z.string().min(10),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [ticket] = await db.insert(supportTickets).values({
          userId: ctx.user.id,
          subject: input.subject,
          priority: input.priority,
          status: "open",
          createdAt: new Date(),
        }).$returningId();

        await db.insert(ticketReplies).values({
          ticketId: ticket.id,
          userId: ctx.user.id,
          message: input.message,
          isStaff: false,
          createdAt: new Date(),
        });

        return { success: true, ticketId: ticket.id };
      }),

    messages: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [ticket] = await db.select().from(supportTickets)
          .where(eq(supportTickets.id, input.ticketId))
          .limit(1);
        
        if (!ticket || ticket.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return await db.select().from(ticketReplies)
          .where(eq(ticketReplies.ticketId, input.ticketId))
          .orderBy(ticketReplies.createdAt);
      }),
  }),

  // ========================================
  // NOTIFICATIONS
  // ========================================
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await db.select().from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(notifications)
          .set({ read: true })
          .where(and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          ));
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // ========================================
  // ADMIN
  // ========================================
  admin: router({
    users: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await db.select().from(users).orderBy(desc(users.createdAt));
    }),

    kycDocuments: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await db.select().from(kycDocuments)
        .orderBy(desc(kycDocuments.uploadedAt));
    }),

    approveKyc: adminProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(kycDocuments)
          .set({ status: "approved", reviewedAt: new Date() })
          .where(eq(kycDocuments.id, input.documentId));
        return { success: true };
      }),

    rejectKyc: adminProcedure
      .input(z.object({ documentId: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(kycDocuments)
          .set({ 
            status: "rejected", 
            rejectionReason: input.reason,
            reviewedAt: new Date() 
          })
          .where(eq(kycDocuments.id, input.documentId));
        return { success: true };
      }),
  }),

  // API Keys
  apiKeys: apiKeyRouter,
  
  // Forex Trading
  forex: forexRouter,
});

export type AppRouter = typeof appRouter;
