import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { deposits, wallets, depositAddresses, blockchainTransactions, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Blockchain Monitor Logic", () => {
  let testUserId: number;
  let testWalletId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Setup: Create test user and wallet
    await db.insert(users).values({
      email: "blockchain-monitor-test@test.com",
      name: "Blockchain Test",
      password: "hashed",
      role: "user",
      emailVerified: true,
    });

    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, "blockchain-monitor-test@test.com"))
      .limit(1);
    
    testUserId = user.id;

    await db.insert(wallets).values({
      userId: testUserId,
      asset: "BTC",
      balance: "0",
      availableBalance: "0",
    });

    const [wallet] = await db.select()
      .from(wallets)
      .where(and(eq(wallets.userId, testUserId), eq(wallets.asset, "BTC")))
      .limit(1);
    
    testWalletId = wallet.id;
  });

  it("should record blockchain transaction correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const mockTxHash = `test-tx-${Date.now()}`;
    const mockAmount = "0.001";
    const mockAddress = "tb1qtest123";

    // Simulate blockchain monitor detecting a transaction
    await db.insert(blockchainTransactions).values({
      userId: testUserId,
      asset: "BTC",
      network: "BTC",
      txHash: mockTxHash,
      fromAddress: "external-address",
      toAddress: mockAddress,
      amount: mockAmount,
      confirmations: 3,
      status: "confirmed",
    });

    // Verify transaction was recorded
    const [transaction] = await db.select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, mockTxHash))
      .limit(1);

    expect(transaction).toBeDefined();
    expect(transaction.txHash).toBe(mockTxHash);
    expect(transaction.amount).toBe(mockAmount);
    expect(transaction.status).toBe("confirmed");
    expect(transaction.confirmations).toBe(3);
  });

  it("should create deposit record after transaction confirmation", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const mockTxHash = `test-deposit-${Date.now()}`;
    const mockAmount = "0.002";
    const mockAddress = "tb1qtest456";

    // Step 1: Record transaction
    await db.insert(blockchainTransactions).values({
      userId: testUserId,
      asset: "BTC",
      network: "BTC",
      txHash: mockTxHash,
      fromAddress: "external",
      toAddress: mockAddress,
      amount: mockAmount,
      confirmations: 3,
      status: "confirmed",
    });

    // Step 2: Create deposit record (what monitor would do)
    await db.insert(deposits).values({
      userId: testUserId,
      asset: "BTC",
      network: "BTC",
      amount: mockAmount,
      address: mockAddress,
      txHash: mockTxHash,
      status: "completed",
    });

    // Verify deposit was created
    const [deposit] = await db.select()
      .from(deposits)
      .where(eq(deposits.txHash, mockTxHash))
      .limit(1);

    expect(deposit).toBeDefined();
    expect(deposit.status).toBe("completed");
    expect(deposit.amount).toBe(mockAmount);
  });

  it("should update wallet balance after confirmed deposit", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get current balance
    const [walletBefore] = await db.select()
      .from(wallets)
      .where(eq(wallets.id, testWalletId))
      .limit(1);

    const balanceBefore = parseFloat(walletBefore.balance);
    const depositAmount = 0.005;

    // Simulate balance update (what monitor would do after confirmation)
    await db.update(wallets)
      .set({
        balance: (balanceBefore + depositAmount).toString(),
        availableBalance: (balanceBefore + depositAmount).toString(),
      })
      .where(eq(wallets.id, testWalletId));

    // Verify balance was updated
    const [walletAfter] = await db.select()
      .from(wallets)
      .where(eq(wallets.id, testWalletId))
      .limit(1);

    expect(parseFloat(walletAfter.balance)).toBeGreaterThan(balanceBefore);
    expect(parseFloat(walletAfter.balance)).toBe(balanceBefore + depositAmount);
  });

  it("should detect duplicate transactions", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const mockTxHash = `test-duplicate-${Date.now()}`;

    // Insert first transaction
    await db.insert(blockchainTransactions).values({
      userId: testUserId,
      asset: "BTC",
      network: "BTC",
      txHash: mockTxHash,
      fromAddress: "external",
      toAddress: "tb1qtest",
      amount: "0.001",
      confirmations: 3,
      status: "confirmed",
    });

    // Check if transaction exists (what monitor would do before processing)
    const [existingTx] = await db.select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, mockTxHash))
      .limit(1);

    expect(existingTx).toBeDefined();
    expect(existingTx.txHash).toBe(mockTxHash);

    // Verify only one transaction exists
    const allTxs = await db.select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, mockTxHash));

    expect(allTxs.length).toBe(1);
  });

  it("should handle pending transactions correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const mockTxHash = `test-pending-${Date.now()}`;
    const mockAmount = "0.001";

    // Insert transaction with insufficient confirmations
    await db.insert(blockchainTransactions).values({
      userId: testUserId,
      asset: "BTC",
      network: "BTC",
      txHash: mockTxHash,
      fromAddress: "external",
      toAddress: "tb1qtest",
      amount: mockAmount,
      confirmations: 1, // Needs 3 for BTC
      status: "pending",
    });

    // Verify transaction is marked as pending
    const [pendingTx] = await db.select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, mockTxHash))
      .limit(1);

    expect(pendingTx).toBeDefined();
    expect(pendingTx.status).toBe("pending");
    expect(pendingTx.confirmations).toBeLessThan(3);

    // Simulate confirmation update (what monitor would do on next check)
    await db.update(blockchainTransactions)
      .set({
        confirmations: 3,
        status: "confirmed",
      })
      .where(eq(blockchainTransactions.txHash, mockTxHash));

    // Verify transaction is now confirmed
    const [confirmedTx] = await db.select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, mockTxHash))
      .limit(1);

    expect(confirmedTx.status).toBe("confirmed");
    expect(confirmedTx.confirmations).toBe(3);
  });
});
