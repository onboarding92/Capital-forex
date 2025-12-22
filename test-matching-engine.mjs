/**
 * Test script for Matching Engine
 * Creates test buy/sell orders and verifies automatic matching
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'bitchange',
  password: process.env.DATABASE_PASSWORD || 'PNskCx58YLkXc7cYAuPLbTQU',
  database: process.env.DATABASE_NAME || 'bitchange',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
};

async function createTestOrders() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    console.log('🔌 Connected to database');
    
    // Get admin user (userId = 1)
    const [users] = await connection.execute(
      'SELECT id, email FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (users.length === 0) {
      console.error('❌ No admin user found');
      return;
    }
    
    const adminUser = users[0];
    console.log(`✅ Using admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    
    // Check current wallet balances
    const [wallets] = await connection.execute(
      'SELECT currency, balance FROM wallets WHERE userId = ?',
      [adminUser.id]
    );
    
    console.log('\n💰 Current wallet balances:');
    wallets.forEach(w => {
      console.log(`  ${w.currency}: ${w.balance}`);
    });
    
    // Ensure admin has USDT and BTC
    const usdtWallet = wallets.find(w => w.currency === 'USDT');
    const btcWallet = wallets.find(w => w.currency === 'BTC');
    
    if (!usdtWallet || parseFloat(usdtWallet.balance) < 100000) {
      console.log('\n💵 Adding USDT to admin wallet...');
      await connection.execute(
        'UPDATE wallets SET balance = 100000 WHERE userId = ? AND currency = "USDT"',
        [adminUser.id]
      );
    }
    
    if (!btcWallet || parseFloat(btcWallet.balance) < 1) {
      console.log('₿ Adding BTC to admin wallet...');
      await connection.execute(
        'UPDATE wallets SET balance = 1 WHERE userId = ? AND currency = "BTC"',
        [adminUser.id]
      );
    }
    
    console.log('\n📝 Creating test orders...\n');
    
    // Create BUY order: Buy 0.01 BTC at $90,000 (total: $900 USDT)
    const [buyResult] = await connection.execute(
      `INSERT INTO orders (userId, pair, type, price, quantity, filledQuantity, status, createdAt, updatedAt)
       VALUES (?, 'BTC/USDT', 'buy', 90000, 0.01, 0, 'pending', NOW(), NOW())`,
      [adminUser.id]
    );
    
    const buyOrderId = buyResult.insertId;
    console.log(`✅ Created BUY order #${buyOrderId}: Buy 0.01 BTC at $90,000`);
    
    // Deduct USDT from wallet for buy order
    await connection.execute(
      'UPDATE wallets SET balance = balance - 900 WHERE userId = ? AND currency = "USDT"',
      [adminUser.id]
    );
    console.log('   💸 Deducted $900 USDT from wallet');
    
    // Create SELL order: Sell 0.01 BTC at $89,500 (total: $895 USDT)
    const [sellResult] = await connection.execute(
      `INSERT INTO orders (userId, pair, type, price, quantity, filledQuantity, status, createdAt, updatedAt)
       VALUES (?, 'BTC/USDT', 'sell', 89500, 0.01, 0, 'pending', NOW(), NOW())`,
      [adminUser.id]
    );
    
    const sellOrderId = sellResult.insertId;
    console.log(`✅ Created SELL order #${sellOrderId}: Sell 0.01 BTC at $89,500`);
    
    // Deduct BTC from wallet for sell order
    await connection.execute(
      'UPDATE wallets SET balance = balance - 0.01 WHERE userId = ? AND currency = "BTC"',
      [adminUser.id]
    );
    console.log('   ₿ Deducted 0.01 BTC from wallet');
    
    console.log('\n⏳ Waiting 5 seconds for matching engine to process...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if orders were matched
    const [buyOrder] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [buyOrderId]
    );
    
    const [sellOrder] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [sellOrderId]
    );
    
    console.log('📊 Order Status After Matching:');
    console.log(`  BUY Order #${buyOrderId}: ${buyOrder[0].status} (filled: ${buyOrder[0].filledQuantity}/${buyOrder[0].quantity})`);
    console.log(`  SELL Order #${sellOrderId}: ${sellOrder[0].status} (filled: ${sellOrder[0].filledQuantity}/${sellOrder[0].quantity})`);
    
    // Check for trades
    const [trades] = await connection.execute(
      'SELECT * FROM trades WHERE buyOrderId = ? OR sellOrderId = ? ORDER BY executedAt DESC',
      [buyOrderId, sellOrderId]
    );
    
    if (trades.length > 0) {
      console.log('\n✅ MATCHING ENGINE WORKED! Trades executed:');
      trades.forEach((trade, i) => {
        console.log(`\n  Trade #${i + 1}:`);
        console.log(`    Price: $${trade.price}`);
        console.log(`    Quantity: ${trade.quantity} BTC`);
        console.log(`    Total: $${trade.total} USDT`);
        console.log(`    Executed: ${trade.executedAt}`);
      });
    } else {
      console.log('\n❌ No trades found - matching engine may not be running');
    }
    
    // Check final wallet balances
    const [finalWallets] = await connection.execute(
      'SELECT currency, balance FROM wallets WHERE userId = ?',
      [adminUser.id]
    );
    
    console.log('\n💰 Final wallet balances:');
    finalWallets.forEach(w => {
      console.log(`  ${w.currency}: ${w.balance}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

createTestOrders().catch(console.error);
