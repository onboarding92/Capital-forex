/**
 * WebSocket Broadcaster for Real-Time Trading Data
 * 
 * Broadcasts:
 * - Price updates for all trading pairs
 * - Orderbook changes
 * - Trade executions
 * - User-specific notifications
 */

import { WebSocket } from "ws";
import { getWebSocketServer } from "./websocket";

interface PriceUpdate {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

interface OrderBookUpdate {
  pair: string;
  bids: Array<{ price: number; amount: number }>;
  asks: Array<{ price: number; amount: number }>;
  timestamp: number;
}

interface TradeUpdate {
  pair: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

interface UserNotification {
  userId: number;
  type: "trade_executed" | "order_filled" | "copy_trade_executed" | "stop_loss_triggered" | "take_profit_triggered";
  title: string;
  message: string;
  data?: any;
}

/**
 * Broadcast price update to all connected clients subscribed to a pair
 */
export function broadcastPriceUpdate(update: PriceUpdate) {
  const wss = getWebSocketServer();
  if (!wss) return;

  const message = JSON.stringify({
    type: "price_update",
    data: update,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Check if client is subscribed to this pair
      const subscriptions = (client as any).subscriptions || [];
      if (subscriptions.includes(update.pair) || subscriptions.includes("all")) {
        client.send(message);
      }
    }
  });
}

/**
 * Broadcast orderbook update to subscribed clients
 */
export function broadcastOrderBookUpdate(update: OrderBookUpdate) {
  const wss = getWebSocketServer();
  if (!wss) return;

  const message = JSON.stringify({
    type: "orderbook_update",
    data: update,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const subscriptions = (client as any).subscriptions || [];
      if (subscriptions.includes(`orderbook:${update.pair}`)) {
        client.send(message);
      }
    }
  });
}

/**
 * Broadcast trade execution to all clients
 */
export function broadcastTradeExecution(trade: TradeUpdate) {
  const wss = getWebSocketServer();
  if (!wss) return;

  const message = JSON.stringify({
    type: "trade_executed",
    data: trade,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const subscriptions = (client as any).subscriptions || [];
      if (subscriptions.includes(`trades:${trade.pair}`)) {
        client.send(message);
      }
    }
  });
}

/**
 * Send notification to a specific user
 */
export function sendUserNotification(notification: UserNotification) {
  const wss = getWebSocketServer();
  if (!wss) return;

  const message = JSON.stringify({
    type: "user_notification",
    data: notification,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const userId = (client as any).userId;
      if (userId === notification.userId) {
        client.send(message);
      }
    }
  });
}

/**
 * Broadcast system-wide message to all connected clients
 */
export function broadcastSystemMessage(message: string, type: "info" | "warning" | "error" = "info") {
  const wss = getWebSocketServer();
  if (!wss) return;

  const payload = JSON.stringify({
    type: "system_message",
    data: { message, type, timestamp: Date.now() },
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Get count of connected clients
 */
export function getConnectedClientsCount(): number {
  const wss = getWebSocketServer();
  if (!wss) return 0;
  return wss.clients.size;
}

/**
 * Get count of clients subscribed to a specific channel
 */
export function getSubscribedClientsCount(channel: string): number {
  const wss = getWebSocketServer();
  if (!wss) return 0;

  let count = 0;
  wss.clients.forEach((client) => {
    const subscriptions = (client as any).subscriptions || [];
    if (subscriptions.includes(channel)) {
      count++;
    }
  });

  return count;
}
