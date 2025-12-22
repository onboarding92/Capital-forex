/**
 * WebSocket Server for Real-Time Notifications
 * 
 * Provides real-time push notifications to connected clients for:
 * - Deposit confirmations
 * - Withdrawal approvals
 * - Trade executions
 * - System alerts
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  userEmail?: string;
}

interface WebSocketMessage {
  type: "notification";
  data: {
    id: number;
    type: string;
    title: string;
    message: string;
    createdAt: Date;
  };
}

// Store active connections by userId
const connections = new Map<number, Set<AuthenticatedWebSocket>>();

// Store WebSocket server instance
let wssInstance: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(wss: WebSocketServer) {
  wssInstance = wss;
  wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log("[WebSocket] New connection attempt");

    // Authenticate via JWT cookie
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.auth_token;

    if (!token) {
      console.log("[WebSocket] No auth token, closing connection");
      ws.close(1008, "Authentication required");
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      ws.userId = decoded.userId;
      ws.userEmail = decoded.email;

      // Add to connections map
      if (!connections.has(decoded.userId)) {
        connections.set(decoded.userId, new Set());
      }
      connections.get(decoded.userId)!.add(ws);

      console.log(`[WebSocket] User ${decoded.email} (${decoded.userId}) connected`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        message: "WebSocket connection established"
      }));

      // Initialize subscriptions array
      (ws as any).subscriptions = [];

      // Handle incoming messages (ping/pong, subscriptions)
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          } else if (message.type === "subscribe") {
            // Subscribe to channels (e.g., "BTC/USDT", "orderbook:BTC/USDT", "trades:BTC/USDT")
            const channels = Array.isArray(message.channels) ? message.channels : [message.channels];
            const currentSubs = (ws as any).subscriptions || [];
            const newSubs = new Set([...currentSubs, ...channels]);
            (ws as any).subscriptions = Array.from(newSubs);
            ws.send(JSON.stringify({ type: "subscribed", channels }));
            console.log(`[WebSocket] User ${ws.userId} subscribed to:`, channels);
          } else if (message.type === "unsubscribe") {
            // Unsubscribe from channels
            const channels = Array.isArray(message.channels) ? message.channels : [message.channels];
            (ws as any).subscriptions = (ws as any).subscriptions.filter((s: string) => !channels.includes(s));
            ws.send(JSON.stringify({ type: "unsubscribed", channels }));
            console.log(`[WebSocket] User ${ws.userId} unsubscribed from:`, channels);
          }
        } catch (error) {
          console.error("[WebSocket] Invalid message format:", error);
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        if (ws.userId) {
          const userConnections = connections.get(ws.userId);
          if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
              connections.delete(ws.userId);
            }
          }
          console.log(`[WebSocket] User ${ws.userEmail} (${ws.userId}) disconnected`);
        }
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("[WebSocket] Connection error:", error);
      });

    } catch (error) {
      console.error("[WebSocket] Authentication failed:", error);
      ws.close(1008, "Invalid authentication token");
    }
  });

  console.log("[WebSocket] Server initialized");
}

/**
 * Send notification to specific user (respects user preferences)
 */
export async function sendNotificationToUser(
  userId: number,
  notification: WebSocketMessage["data"],
  checkPreferences: boolean = true
) {
  const userConnections = connections.get(userId);
  
  if (!userConnections || userConnections.size === 0) {
    console.log(`[WebSocket] No active connections for user ${userId}`);
    return false;
  }

  // Check if user has enabled this notification type
  if (checkPreferences) {
    try {
      const { isNotificationEnabled } = await import("./notificationPreferences");
      const notificationType = notification.type as "trade" | "deposit" | "withdrawal" | "security";
      
      // Map notification types to preference keys
      const typeMap: Record<string, "trade" | "deposit" | "withdrawal" | "security"> = {
        trade: "trade",
        deposit: "deposit",
        withdrawal: "withdrawal",
        security: "security",
        login: "security",
      };

      const preferenceKey = typeMap[notificationType];
      if (preferenceKey) {
        const enabled = await isNotificationEnabled(userId, preferenceKey);
        if (!enabled) {
          console.log(`[WebSocket] User ${userId} has disabled ${preferenceKey} notifications`);
          return false;
        }
      }
    } catch (error) {
      console.error("[WebSocket] Error checking notification preferences:", error);
      // Continue sending notification if preference check fails
    }
  }

  const message: WebSocketMessage = {
    type: "notification",
    data: notification
  };

  let sentCount = 0;
  userConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      sentCount++;
    }
  });

  console.log(`[WebSocket] Sent notification to ${sentCount} connection(s) for user ${userId}`);
  return sentCount > 0;
}

/**
 * Broadcast notification to all connected users
 */
export function broadcastNotification(notification: WebSocketMessage["data"]) {
  let sentCount = 0;
  
  connections.forEach((userConnections) => {
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "notification",
          data: notification
        }));
        sentCount++;
      }
    });
  });

  console.log(`[WebSocket] Broadcast notification to ${sentCount} connection(s)`);
  return sentCount;
}

/**
 * Get connection stats
 */
export function getConnectionStats() {
  const totalUsers = connections.size;
  let totalConnections = 0;
  
  connections.forEach((userConnections) => {
    totalConnections += userConnections.size;
  });

  return {
    totalUsers,
    totalConnections,
    averageConnectionsPerUser: totalUsers > 0 ? (totalConnections / totalConnections).toFixed(2) : 0
  };
}

/**
 * Get active connections with details
 */
export function getActiveConnections() {
  const activeConnections: Array<{
    userId: number;
    connectionId: string;
    connectedAt: Date;
    lastActivity: Date;
  }> = [];

  connections.forEach((userConnections, userId) => {
    let connIndex = 0;
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        activeConnections.push({
          userId,
          connectionId: `conn-${userId}-${connIndex++}`,
          connectedAt: new Date(), // TODO: Track actual connection time
          lastActivity: new Date(),
        });
      }
    });
  });

  return activeConnections;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wssInstance;
}
