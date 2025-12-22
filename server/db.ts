import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { InsertUser, users, wallets } from "../drizzle/schema";
import { ENV } from './_core/env';
import { SUPPORTED_ASSETS } from "@shared/const";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User management functions for OAuth
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] || null;
}

export async function upsertUser(data: Partial<InsertUser> & { openId: string }) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getUserByOpenId(data.openId);
  
  if (existing) {
    // Update existing user
    await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.openId, data.openId));
  } else {
    // Insert new user
    await db.insert(users).values(data as InsertUser);
  }
}

export async function initializeUserWallets(userId: number) {
  const db = await getDb();
  if (!db) return;

  const existingWallets = await db.select().from(wallets).where(eq(wallets.userId, userId));
  const existingAssets = new Set(existingWallets.map(w => w.asset));

  const newWallets = SUPPORTED_ASSETS
    .filter(asset => !existingAssets.has(asset))
    .map(asset => ({ userId, asset, balance: "0", locked: "0" }));

  if (newWallets.length > 0) {
    await db.insert(wallets).values(newWallets);
  }
}
