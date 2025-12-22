/**
 * WebSocket Hook for Real-Time Notifications
 * 
 * Provides a React hook to connect to the WebSocket server and receive real-time notifications.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

interface WebSocketNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
}

interface WebSocketMessage {
  type: "connected" | "notification" | "pong" | "price_update" | "orderbook_update" | "trade_executed" | "user_notification" | "subscribed" | "unsubscribed";
  message?: string;
  data?: any;
  channels?: string[];
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastNotification: WebSocketNotification | null;
  subscriptions: string[];
  sendPing: () => void;
  subscribe: (channels: string | string[]) => void;
  unsubscribe: (channels: string | string[]) => void;
  send: (message: any) => void;
}

interface UseWebSocketOptions {
  onNotification?: (notification: WebSocketNotification) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options?: UseWebSocketOptions | ((notification: WebSocketNotification) => void)): UseWebSocketReturn {
  // Support both old and new API
  const { onNotification, onMessage } = typeof options === 'function' 
    ? { onNotification: options, onMessage: undefined }
    : (options || {});
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<WebSocketNotification | null>(null);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Only connect if user is authenticated
    if (!user) {
      console.log("[WebSocket] User not authenticated, skipping connection");
      return;
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("[WebSocket] Connecting to", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Call generic message handler
          onMessage?.(message);
          
          if (message.type === "connected") {
            console.log("[WebSocket]", message.message);
          } else if (message.type === "notification" && message.data) {
            console.log("[WebSocket] Received notification:", message.data);
            setLastNotification(message.data);
            onNotification?.(message.data);
            
            // Show browser push notification if permission granted and tab is not focused
            if (Notification.permission === "granted" && document.hidden) {
              new Notification(message.data.title, {
                body: message.data.message,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: `notification-${message.data.id}`,
                requireInteraction: false,
              });
            }
          } else if (message.type === "pong") {
            console.log("[WebSocket] Pong received");
          } else if (message.type === "subscribed" && message.channels) {
            console.log("[WebSocket] Subscribed to:", message.channels);
            setSubscriptions(prev => [...new Set([...prev, ...message.channels!])]);
          } else if (message.type === "unsubscribed" && message.channels) {
            console.log("[WebSocket] Unsubscribed from:", message.channels);
            setSubscriptions(prev => prev.filter(s => !message.channels!.includes(s)));
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.log("[WebSocket] Max reconnect attempts reached");
        }
      };
    } catch (error) {
      console.error("[WebSocket] Failed to create connection:", error);
    }
  }, [user, onNotification]);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  const subscribe = useCallback((channels: string | string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const channelArray = Array.isArray(channels) ? channels : [channels];
      wsRef.current.send(JSON.stringify({ type: "subscribe", channels: channelArray }));
    }
  }, []);

  const unsubscribe = useCallback((channels: string | string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const channelArray = Array.isArray(channels) ? channels : [channels];
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", channels: channelArray }));
    }
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === "string" ? message : JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastNotification,
    subscriptions,
    sendPing,
    subscribe,
    unsubscribe,
    send,
  };
}
