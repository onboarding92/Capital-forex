/**
 * Copy Trading Execution Engine
 * 
 * Automatically replicates trades from followed traders to followers
 * with risk management and position sizing
 */

import { getDb } from "./db";
import { copyTradingFollows, copyTradingExecutions, orders, wallets } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendUserNotification } from "./websocketBroadcaster";

interface TradeExecution {
  traderId: number;
  orderId: number;
  pair: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
}

/**
 * Execute copy trading when a trader places an order
 */
export async function executeCopyTrades(execution: TradeExecution) {
  const db = await getDb();
  if (!db) {
    console.error("[Copy Trading] Database not available");
    return;
  }

  try {
    // Get all active followers of this trader
    const followers = await db
      .select()
      .from(copyTradingFollows)
      .where(
        and(
          eq(copyTradingFollows.traderId, execution.traderId),
          eq(copyTradingFollows.status, "active")
        )
      );

    if (followers.length === 0) {
      console.log(`[Copy Trading] No active followers for trader ${execution.traderId}`);
      return;
    }

    console.log(`[Copy Trading] Replicating trade for ${followers.length} followers`);

    for (const follow of followers) {
      try {
        await replicateTradeForFollower(follow, execution);
      } catch (error) {
        console.error(`[Copy Trading] Failed to replicate trade for follower ${follow.followerId}:`, error);
      }
    }
  } catch (error) {
    console.error("[Copy Trading] Error executing copy trades:", error);
  }
}

/**
 * Replicate a single trade for a follower with risk management
 */
async function replicateTradeForFollower(
  follow: any,
  execution: TradeExecution
) {
  const db = await getDb();
  if (!db) return;

  // Calculate position size based on copy ratio and allocated amount
  const copyRatio = parseFloat(follow.copyRatio) / 100;
  const maxRiskPerTrade = parseFloat(follow.maxRiskPerTrade) / 100;
  const allocatedAmount = parseFloat(follow.allocatedAmount);

  // Calculate follower's position size
  const maxTradeAmount = allocatedAmount * maxRiskPerTrade;
  const copiedAmount = execution.amount * copyRatio;
  const finalAmount = Math.min(copiedAmount, maxTradeAmount / execution.price);

  // Check if follower has sufficient balance
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(
      and(
        eq(wallets.userId, follow.followerId),
        eq(wallets.currency, execution.pair.split("/")[1]) // Quote currency (e.g., USDT)
      )
    )
    .limit(1);

  if (!wallet) {
    console.log(`[Copy Trading] Follower ${follow.followerId} has no wallet for ${execution.pair.split("/")[1]}`);
    return;
  }

  const requiredBalance = finalAmount * execution.price;
  if (parseFloat(wallet.balance) < requiredBalance) {
    console.log(`[Copy Trading] Follower ${follow.followerId} has insufficient balance`);
    
    // Notify follower
    sendUserNotification({
      userId: follow.followerId,
      type: "copy_trade_executed",
      title: "Copy Trade Failed",
      message: `Insufficient balance to copy trade from trader. Required: ${requiredBalance.toFixed(2)} ${execution.pair.split("/")[1]}`,
    });
    
    return;
  }

  // Create copied order
  const [copiedOrder] = await db
    .insert(orders)
    .values({
      userId: follow.followerId,
      pair: execution.pair,
      side: execution.side,
      type: "limit",
      price: execution.price.toString(),
      amount: finalAmount.toString(),
      filled: "0",
      status: "open",
    })
    .$returningId();

  // Log copy trading execution
  await db.insert(copyTradingExecutions).values({
    followId: follow.id,
    followerId: follow.followerId,
    traderId: follow.traderId,
    originalOrderId: execution.orderId,
    copiedOrderId: copiedOrder.id,
    pair: execution.pair,
    side: execution.side,
    executionPrice: execution.price.toString(),
    amount: finalAmount.toString(),
    copyRatio: follow.copyRatio,
    status: "executed",
    executedAt: new Date(),
  });

  // Update follow statistics
  await db
    .update(copyTradingFollows)
    .set({
      totalCopiedTrades: follow.totalCopiedTrades + 1,
    })
    .where(eq(copyTradingFollows.id, follow.id));

  // Notify follower
  sendUserNotification({
    userId: follow.followerId,
    type: "copy_trade_executed",
    title: "Copy Trade Executed",
    message: `Copied ${execution.side} order for ${finalAmount.toFixed(8)} ${execution.pair.split("/")[0]} at ${execution.price.toFixed(2)}`,
    data: {
      pair: execution.pair,
      side: execution.side,
      amount: finalAmount,
      price: execution.price,
      orderId: copiedOrder.id,
    },
  });

  console.log(`[Copy Trading] Successfully replicated trade for follower ${follow.followerId}`);
}

/**
 * Update trader profile statistics after a trade
 */
export async function updateTraderStats(traderId: number, trade: {
  pnl: number;
  isWin: boolean;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    // This would be called after a trade is closed
    // Update win rate, PnL, etc.
    console.log(`[Copy Trading] Updating stats for trader ${traderId}`);
    
    // TODO: Implement full statistics calculation
    // - Calculate win rate
    // - Update total PnL
    // - Calculate Sharpe ratio
    // - Update max drawdown
    // - Calculate average ROI
  } catch (error) {
    console.error("[Copy Trading] Error updating trader stats:", error);
  }
}
