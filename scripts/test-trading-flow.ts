/**
 * Comprehensive Trading Flow Test
 * 
 * Tests the entire trading flow from registration to order execution
 */

import { getDb } from "../server/db";
import { users, wallets, orders, trades } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { placeOrder, cancelOrder } from "../server/tradingEngine";

async function testTradingFlow() {
  console.log("🧪 Starting Comprehensive Trading Flow Test\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  try {
    // Step 1: Create test users
    console.log("📝 Step 1: Creating test users...");
    
    const testUsers = [
      {
        email: "trader1@test.com",
        name: "Trader One",
        password: await bcrypt.hash("Test123!", 10),
        role: "user" as const,
        emailVerified: true,
        loginMethod: "email" as const,
      },
      {
        email: "trader2@test.com",
        name: "Trader Two",
        password: await bcrypt.hash("Test123!", 10),
        role: "user" as const,
        emailVerified: true,
        loginMethod: "email" as const,
      },
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      // Check if user exists
      const [existing] = await db.select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existing) {
        console.log(`  ✓ User ${userData.email} already exists (ID: ${existing.id})`);
        createdUsers.push(existing);
      } else {
        const [newUser] = await db.insert(users).values(userData);
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, newUser.insertId as number))
          .limit(1);
        console.log(`  ✓ Created user ${userData.email} (ID: ${user.id})`);
        createdUsers.push(user);
      }
    }

    // Step 2: Add mock balances
    console.log("\n💰 Step 2: Adding mock balances...");
    
    for (const user of createdUsers) {
      // Check if wallets exist
      const existingWallets = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, user.id));

      if (existingWallets.length === 0) {
        // Create wallets
        await db.insert(wallets).values([
          { userId: user.id, asset: "USDT", balance: "10000", locked: "0" },
          { userId: user.id, asset: "BTC", balance: "1", locked: "0" },
        ]);
        console.log(`  ✓ Created wallets for ${user.email}`);
      } else {
        // Update balances
        await db.update(wallets)
          .set({ balance: "10000", locked: "0" })
          .where(and(eq(wallets.userId, user.id), eq(wallets.asset, "USDT")));
        
        await db.update(wallets)
          .set({ balance: "1", locked: "0" })
          .where(and(eq(wallets.userId, user.id), eq(wallets.asset, "BTC")));
        
        console.log(`  ✓ Updated balances for ${user.email}`);
      }
    }

    // Step 3: Test order placement
    console.log("\n📊 Step 3: Testing order placement...");
    
    // Trader 1 places a SELL order (selling BTC for USDT)
    console.log("  → Trader 1 placing SELL order: 0.1 BTC @ $50,000");
    const sellOrder = await placeOrder({
      userId: createdUsers[0].id,
      pair: "BTC/USDT",
      type: "limit",
      side: "sell",
      amount: "0.1",
      price: "50000",
    });
    console.log(`  ✓ Sell order placed (ID: ${sellOrder.orderId})`);

    // Trader 2 places a BUY order (buying BTC with USDT)
    console.log("  → Trader 2 placing BUY order: 0.05 BTC @ $50,000");
    const buyOrder = await placeOrder({
      userId: createdUsers[1].id,
      pair: "BTC/USDT",
      type: "limit",
      side: "buy",
      amount: "0.05",
      price: "50000",
    });
    console.log(`  ✓ Buy order placed (ID: ${buyOrder.orderId})`);

    // Step 4: Check if orders matched
    console.log("\n🔄 Step 4: Checking order matching...");
    
    const allTrades = await db.select()
      .from(trades)
      .where(eq(trades.pair, "BTC/USDT"));
    
    if (allTrades.length > 0) {
      console.log(`  ✓ Found ${allTrades.length} trade(s):`);
      for (const trade of allTrades) {
        console.log(`    - Trade ID ${trade.id}: ${trade.amount} BTC @ $${trade.price}`);
        console.log(`      Maker: User ${trade.makerId}, Taker: User ${trade.takerId}`);
        console.log(`      Fees: Maker ${trade.makerFee}, Taker ${trade.takerFee}`);
      }
    } else {
      console.log("  ⚠️  No trades executed (orders might not have matched)");
    }

    // Step 5: Check order status
    console.log("\n📋 Step 5: Checking order status...");
    
    const allOrders = await db.select()
      .from(orders)
      .where(eq(orders.pair, "BTC/USDT"));
    
    console.log(`  Found ${allOrders.length} order(s):`);
    for (const order of allOrders) {
      console.log(`    - Order ID ${order.id}: ${order.side.toUpperCase()} ${order.amount} BTC @ $${order.price}`);
      console.log(`      Status: ${order.status}, Filled: ${order.filled}/${order.amount}`);
    }

    // Step 6: Check final balances
    console.log("\n💵 Step 6: Checking final balances...");
    
    for (const user of createdUsers) {
      const userWallets = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, user.id));
      
      console.log(`  ${user.email}:`);
      for (const wallet of userWallets) {
        console.log(`    - ${wallet.asset}: ${wallet.balance} (locked: ${wallet.locked})`);
      }
    }

    // Step 7: Test order cancellation
    console.log("\n❌ Step 7: Testing order cancellation...");
    
    const openOrders = allOrders.filter(o => o.status === "open");
    if (openOrders.length > 0) {
      const orderToCancel = openOrders[0];
      console.log(`  → Cancelling order ID ${orderToCancel.id}`);
      await cancelOrder(orderToCancel.userId, orderToCancel.id);
      console.log(`  ✓ Order cancelled`);
    } else {
      console.log("  ℹ️  No open orders to cancel");
    }

    console.log("\n✅ Trading Flow Test Completed Successfully!\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  }
}

// Run the test
testTradingFlow()
  .then(() => {
    console.log("Test script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test script failed:", error);
    process.exit(1);
  });
