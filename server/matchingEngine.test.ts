import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { matchOrder } from "./tradingEngine";
import { orders, wallets, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Matching Engine", () => {
  let db: any;
  let sellerId: number;
  let buyerId: number;

  beforeEach(async () => {
    db = await getDb();
    
    // Create test users
    const [seller] = await db.insert(users).values({
      email: `seller_${Date.now()}@test.com`,
      password: "hashed",
      name: "Test Seller",
      role: "user",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const [buyer] = await db.insert(users).values({
      email: `buyer_${Date.now()}@test.com`,
      password: "hashed",
      name: "Test Buyer",
      role: "user",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    sellerId = seller.insertId;
    buyerId = buyer.insertId;
    
    // Create wallets with balance
    await db.insert(wallets).values([
      { userId: sellerId, asset: "BTC", balance: "1.0", locked: "0" },
      { userId: sellerId, asset: "USDT", balance: "0", locked: "0" },
      { userId: buyerId, asset: "BTC", balance: "0", locked: "0" },
      { userId: buyerId, asset: "USDT", balance: "20000.0", locked: "0" },
    ]);
  });

  it("should match buy and sell orders at same price", async () => {
    // Insert sell order
    const [sellOrder] = await db.insert(orders).values({
      userId: sellerId,
      pair: "BTC/USDT",
      side: "sell",
      type: "limit",
      price: "85000.00",
      amount: "0.2",
      filled: "0",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert buy order
    const [buyOrder] = await db.insert(orders).values({
      userId: buyerId,
      pair: "BTC/USDT",
      side: "buy",
      type: "limit",
      price: "85000.00",
      amount: "0.2",
      filled: "0",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Trigger matching engine
    const trades = await matchOrder(db, buyOrder.insertId);

    // Verify trades were created
    expect(trades).toBeDefined();
    expect(trades.length).toBeGreaterThan(0);
    
    // Verify order status updated
    const [updatedSellOrder] = await db.select().from(orders).where(eq(orders.id, sellOrder.insertId));
    const [updatedBuyOrder] = await db.select().from(orders).where(eq(orders.id, buyOrder.insertId));
    
    expect(updatedSellOrder.status).toBe("filled");
    expect(updatedBuyOrder.status).toBe("filled");
    
    // Verify balances updated
    const sellerWallets = await db.select().from(wallets).where(eq(wallets.userId, sellerId));
    const buyerWallets = await db.select().from(wallets).where(eq(wallets.userId, buyerId));
    
    const sellerBTC = sellerWallets.find((w: any) => w.asset === "BTC");
    const sellerUSDT = sellerWallets.find((w: any) => w.asset === "USDT");
    const buyerBTC = buyerWallets.find((w: any) => w.asset === "BTC");
    const buyerUSDT = buyerWallets.find((w: any) => w.asset === "USDT");
    
    expect(parseFloat(sellerBTC.balance)).toBe(0.8); // 1.0 - 0.2
    expect(parseFloat(sellerUSDT.balance)).toBeGreaterThan(16900); // 0.2 * 85000 * 0.999 (fee)
    expect(parseFloat(buyerBTC.balance)).toBeCloseTo(0.2, 4); // Got 0.2 BTC
    expect(parseFloat(buyerUSDT.balance)).toBeLessThan(3000); // 20000 - (0.2 * 85000)
  });
});
