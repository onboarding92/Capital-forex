/**
 * NotificationToast Component
 * 
 * Displays real-time toast notifications for:
 * - Achievement unlocks
 * - Margin calls
 * - Liquidations
 * - Funding fees
 * - Trade executions
 * - System alerts
 */

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { 
  Trophy, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  TrendingUp,
  Bell,
  CheckCircle2,
  Info
} from "lucide-react";

interface NotificationData {
  type: "achievement" | "margin_call" | "liquidation" | "funding_fee" | "trade_executed" | "system_alert" | "general";
  title: string;
  message: string;
  severity?: "info" | "success" | "warning" | "error";
  data?: any;
}

const notificationIcons = {
  achievement: Trophy,
  margin_call: AlertTriangle,
  liquidation: XCircle,
  funding_fee: DollarSign,
  trade_executed: TrendingUp,
  system_alert: Bell,
  general: Info,
};

const notificationColors = {
  achievement: "text-yellow-500",
  margin_call: "text-orange-500",
  liquidation: "text-red-500",
  funding_fee: "text-blue-500",
  trade_executed: "text-green-500",
  system_alert: "text-purple-500",
  general: "text-gray-500",
};

export function NotificationToast() {
  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      // Handle user-specific notifications
      if (message.type === "user_notification" && message.data) {
        const notification: NotificationData = message.data;
        showNotificationToast(notification);
      }
    },
  });

  const showNotificationToast = (notification: NotificationData) => {
    const Icon = notificationIcons[notification.type] || Info;
    const iconColor = notificationColors[notification.type];
    
    // Determine toast type based on severity or notification type
    const severity = notification.severity || getSeverityFromType(notification.type);
    
    const toastOptions = {
      description: notification.message,
      icon: <Icon className={`h-5 w-5 ${iconColor}`} />,
      duration: getDurationFromType(notification.type),
    };

    switch (severity) {
      case "success":
        toast.success(notification.title, toastOptions);
        break;
      case "warning":
        toast.warning(notification.title, toastOptions);
        break;
      case "error":
        toast.error(notification.title, toastOptions);
        break;
      default:
        toast.info(notification.title, toastOptions);
    }

    // Play sound for critical notifications
    if (notification.type === "margin_call" || notification.type === "liquidation") {
      playNotificationSound();
    }
  };

  const getSeverityFromType = (type: string): "info" | "success" | "warning" | "error" => {
    switch (type) {
      case "achievement":
        return "success";
      case "margin_call":
        return "warning";
      case "liquidation":
        return "error";
      case "trade_executed":
        return "success";
      default:
        return "info";
    }
  };

  const getDurationFromType = (type: string): number => {
    switch (type) {
      case "margin_call":
      case "liquidation":
        return 10000; // 10 seconds for critical notifications
      case "achievement":
        return 7000; // 7 seconds for achievements
      default:
        return 5000; // 5 seconds for normal notifications
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors (e.g., user hasn't interacted with page yet)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  // Subscribe to user-specific notification channel on mount
  useEffect(() => {
    // This component doesn't render anything, it just handles WebSocket notifications
  }, []);

  return null; // This component doesn't render anything
}

// Helper function to send notifications from server-side
export function createNotification(
  type: NotificationData["type"],
  title: string,
  message: string,
  severity?: NotificationData["severity"],
  data?: any
): NotificationData {
  return {
    type,
    title,
    message,
    severity,
    data,
  };
}

// Example notification creators for common scenarios
export const NotificationTemplates = {
  achievementUnlocked: (achievementName: string, points: number) =>
    createNotification(
      "achievement",
      "🎉 Achievement Unlocked!",
      `You've unlocked "${achievementName}" and earned ${points} points!`,
      "success",
      { achievementName, points }
    ),

  marginCall: (symbol: string, marginLevel: number, requiredAmount: number) =>
    createNotification(
      "margin_call",
      "⚠️ Margin Call",
      `Your ${symbol} position margin level is ${marginLevel.toFixed(2)}%. Add ${requiredAmount.toFixed(2)} USDT to avoid liquidation.`,
      "warning",
      { symbol, marginLevel, requiredAmount }
    ),

  liquidation: (symbol: string, amount: number, loss: number) =>
    createNotification(
      "liquidation",
      "❌ Position Liquidated",
      `Your ${symbol} position (${amount.toFixed(4)}) was liquidated. Loss: ${loss.toFixed(2)} USDT`,
      "error",
      { symbol, amount, loss }
    ),

  fundingFee: (symbol: string, fee: number, isPositive: boolean) =>
    createNotification(
      "funding_fee",
      "💰 Funding Fee",
      `${isPositive ? "Received" : "Paid"} ${Math.abs(fee).toFixed(2)} USDT funding fee for ${symbol}`,
      "info",
      { symbol, fee, isPositive }
    ),

  tradeExecuted: (symbol: string, side: "buy" | "sell", amount: number, price: number) =>
    createNotification(
      "trade_executed",
      "✅ Trade Executed",
      `${side.toUpperCase()} ${amount.toFixed(4)} ${symbol} @ ${price.toFixed(2)} USDT`,
      "success",
      { symbol, side, amount, price }
    ),

  systemAlert: (title: string, message: string) =>
    createNotification(
      "system_alert",
      title,
      message,
      "info"
    ),
};
