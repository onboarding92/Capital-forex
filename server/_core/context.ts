import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
// import { sdk } from "./sdk"; // OAuth disabled - not needed
import { getSession } from "../sessionManager";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"] & { cookies?: Record<string, string> };
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Priority 1: Check email/password session (app_session_id cookie)
  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie || "");
    const authToken = cookies[COOKIE_NAME];
    
    if (authToken) {
      const session = await getSession(authToken);
      if (session) {
        // Get user from database using session userId
        const db = await getDb();
        if (db) {
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);
          
          if (userResult.length > 0) {
            user = userResult[0];
            console.log("[Auth] Authenticated via email/password session:", user.email);
          }
        }
      }
    }
  } catch (error) {
    console.warn("[Auth] Email/password session check failed:", error);
  }

  // OAuth authentication disabled - using email/password only
  if (!user) {
    console.log("[Auth] No valid session found");
  }

  // Parse cookies manually and add to req object
  const cookies = parseCookieHeader(opts.req.headers.cookie || "");
  
  return {
    req: { ...opts.req, cookies },
    res: opts.res,
    user,
  };
}
