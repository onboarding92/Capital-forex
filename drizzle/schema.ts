import { mysqlTable, int, varchar, text, decimal, timestamp, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

// ===== USER MANAGEMENT =====

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Manus OAuth ID
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }), // OAuth provider or 'email'
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  password: varchar("password", { length: 255 }),
  emailVerified: timestamp("emailVerified"),
  kycStatus: mysqlEnum("kycStatus", ["pending", "submitted", "approved", "rejected"]).default("pending").notNull(),
  kycSubmittedAt: timestamp("kycSubmittedAt"),
  kycApprovedAt: timestamp("kycApprovedAt"),
  kycRejectedReason: text("kycRejectedReason"),
  twoFactorSecret: varchar("twoFactorSecret", { length: 255 }),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  twoFactorBackupCodes: text("twoFactorBackupCodes"), // JSON array of backup codes
  accountStatus: mysqlEnum("accountStatus", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== FOREX TRADING ACCOUNTS =====

export const tradingAccounts = mysqlTable("tradingAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountType: mysqlEnum("accountType", ["standard", "ecn", "pro"]).default("standard").notNull(),
  leverage: int("leverage").default(100).notNull(), // 1:100, 1:200, 1:500
  balance: decimal("balance", { precision: 20, scale: 2 }).default("0").notNull(), // USD balance
  equity: decimal("equity", { precision: 20, scale: 2 }).default("0").notNull(), // Balance + unrealized P/L
  margin: decimal("margin", { precision: 20, scale: 2 }).default("0").notNull(), // Used margin
  freeMargin: decimal("freeMargin", { precision: 20, scale: 2 }).default("0").notNull(), // Available margin
  marginLevel: decimal("marginLevel", { precision: 10, scale: 2 }).default("0").notNull(), // (Equity / Margin) * 100
  currency: varchar("currency", { length: 3 }).default("USD").notNull(), // Account currency
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingAccount = typeof tradingAccounts.$inferSelect;

// ===== FOREX PAIRS =====

export const forexPairs = mysqlTable("forexPairs", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // EUR/USD, GBP/USD, etc.
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull(), // EUR, GBP, etc.
  quoteCurrency: varchar("quoteCurrency", { length: 3 }).notNull(), // USD, JPY, etc.
  spread: decimal("spread", { precision: 5, scale: 1 }).default("2.0").notNull(), // Spread in pips
  minVolume: decimal("minVolume", { precision: 10, scale: 2 }).default("0.01").notNull(), // Minimum lot size
  maxVolume: decimal("maxVolume", { precision: 10, scale: 2 }).default("100").notNull(), // Maximum lot size
  maxLeverage: int("maxLeverage").default(500).notNull(), // Maximum leverage for this pair
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForexPair = typeof forexPairs.$inferSelect;

// ===== FOREX POSITIONS =====

export const forexPositions = mysqlTable("forexPositions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // EUR/USD, GBP/USD, etc.
  side: mysqlEnum("side", ["buy", "sell"]).notNull(), // Long or Short
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(), // Lot size (0.01 = micro lot)
  openPrice: decimal("openPrice", { precision: 20, scale: 5 }).notNull(), // Entry price
  currentPrice: decimal("currentPrice", { precision: 20, scale: 5 }).notNull(), // Current market price
  stopLoss: decimal("stopLoss", { precision: 20, scale: 5 }), // Stop loss price
  takeProfit: decimal("takeProfit", { precision: 20, scale: 5 }), // Take profit price
  swap: decimal("swap", { precision: 20, scale: 2 }).default("0").notNull(), // Overnight swap fees
  commission: decimal("commission", { precision: 20, scale: 2 }).default("0").notNull(), // Trading commission
  profit: decimal("profit", { precision: 20, scale: 2 }).default("0").notNull(), // Unrealized profit/loss
  margin: decimal("margin", { precision: 20, scale: 2 }).notNull(), // Margin used for this position
  leverage: int("leverage").notNull(), // Leverage used
  status: mysqlEnum("status", ["open", "closed", "liquidated"]).default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  closedPrice: decimal("closedPrice", { precision: 20, scale: 5 }),
  closedProfit: decimal("closedProfit", { precision: 20, scale: 2 }),
});

export type ForexPosition = typeof forexPositions.$inferSelect;

// ===== SWAP RATES =====

export const swapRates = mysqlTable("swapRates", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull().unique(), // EUR/USD, GBP/USD, etc.
  longSwap: decimal("longSwap", { precision: 10, scale: 2 }).notNull(), // Swap for long positions (pips)
  shortSwap: decimal("shortSwap", { precision: 10, scale: 2 }).notNull(), // Swap for short positions (pips)
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SwapRate = typeof swapRates.$inferSelect;

// ===== MARGIN CALLS =====

export const marginCalls = mysqlTable("marginCalls", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  marginLevel: decimal("marginLevel", { precision: 10, scale: 2 }).notNull(), // Margin level at time of call
  equity: decimal("equity", { precision: 20, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 20, scale: 2 }).notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarginCall = typeof marginCalls.$inferSelect;

// ===== ECONOMIC CALENDAR =====

export const economicEvents = mysqlTable("economicEvents", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(), // USD, EUR, GBP, etc.
  impact: mysqlEnum("impact", ["low", "medium", "high"]).notNull(),
  event: text("event").notNull(), // Event name
  forecast: varchar("forecast", { length: 50 }),
  previous: varchar("previous", { length: 50 }),
  actual: varchar("actual", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EconomicEvent = typeof economicEvents.$inferSelect;

// ===== TRANSACTIONS (DEPOSITS/WITHDRAWALS) =====

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdrawal"]).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  method: varchar("method", { length: 50 }).notNull(), // Bank transfer, Credit card, etc.
  status: mysqlEnum("status", ["pending", "completed", "failed", "cancelled"]).default("pending").notNull(),
  reference: text("reference"), // Transaction reference number
  bankDetails: text("bankDetails"), // JSON with bank details for withdrawals
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Transaction = typeof transactions.$inferSelect;

// ===== ORDERS (INSTANT EXECUTION) =====

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // EUR/USD, GBP/USD, etc.
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  type: mysqlEnum("type", ["market", "limit", "stop"]).default("market").notNull(),
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(), // Lot size
  requestedPrice: decimal("requestedPrice", { precision: 20, scale: 5 }), // For limit/stop orders
  executedPrice: decimal("executedPrice", { precision: 20, scale: 5 }), // Actual execution price
  stopLoss: decimal("stopLoss", { precision: 20, scale: 5 }),
  takeProfit: decimal("takeProfit", { precision: 20, scale: 5 }),
  status: mysqlEnum("status", ["pending", "executed", "cancelled", "rejected"]).default("pending").notNull(),
  positionId: int("positionId"), // Linked position ID after execution
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  executedAt: timestamp("executedAt"),
});

export type Order = typeof orders.$inferSelect;

// ===== TRADES (EXECUTION HISTORY) =====

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  orderId: int("orderId").notNull(),
  positionId: int("positionId"),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 20, scale: 5 }).notNull(),
  commission: decimal("commission", { precision: 20, scale: 2 }).default("0").notNull(),
  swap: decimal("swap", { precision: 20, scale: 2 }).default("0").notNull(),
  profit: decimal("profit", { precision: 20, scale: 2 }), // For closing trades
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;

// ===== KYC DOCUMENTS =====

export const kycDocuments = mysqlTable("kycDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["id_card", "passport", "drivers_license"]).notNull(),
  frontImagePath: text("frontImagePath").notNull(),
  backImagePath: text("backImagePath"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type KycDocument = typeof kycDocuments.$inferSelect;

// ===== SUPPORT TICKETS =====

export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;

export const ticketReplies = mysqlTable("ticketReplies", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  userId: int("userId").notNull(),
  message: text("message").notNull(),
  isStaff: boolean("isStaff").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketReply = typeof ticketReplies.$inferSelect;

// ===== SESSIONS =====

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

// ===== LOGIN HISTORY =====

export const loginHistory = mysqlTable("loginHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  success: boolean("success").notNull(),
  failureReason: varchar("failureReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;

// ===== EMAIL VERIFICATIONS =====

export const emailVerifications = mysqlTable("emailVerifications", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerifications.$inferSelect;

// ===== PASSWORD RESETS =====

export const passwordResets = mysqlTable("passwordResets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordReset = typeof passwordResets.$inferSelect;

// ===== WEBAUTHN CREDENTIALS =====

export const webAuthnCredentials = mysqlTable("webAuthnCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  credentialId: varchar("credentialId", { length: 255 }).notNull().unique(),
  publicKey: text("publicKey").notNull(),
  counter: int("counter").default(0).notNull(),
  deviceName: varchar("deviceName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
});

export type WebAuthnCredential = typeof webAuthnCredentials.$inferSelect;

// ===== NOTIFICATIONS =====

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["trade", "deposit", "withdrawal", "margin_call", "liquidation", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ===== API KEYS (for trading bots) =====

export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  secret: varchar("secret", { length: 64 }).notNull(),
  permissions: text("permissions").notNull(), // JSON array: ["trade", "read", "withdraw"]
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

// ===== API REQUEST LOGS =====

export const apiRequestLogs = mysqlTable("apiRequestLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  apiKeyId: int("apiKeyId"),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: int("statusCode").notNull(),
  responseTime: int("responseTime"), // milliseconds
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;

// ===== SYSTEM LOGS =====

export const systemLogs = mysqlTable("systemLogs", {
  id: int("id").autoincrement().primaryKey(),
  level: mysqlEnum("level", ["info", "warn", "error", "critical"]).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // auth, trading, system, etc.
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemLog = typeof systemLogs.$inferSelect;

// ===== TRADING SIGNALS =====

export const tradingSignals = mysqlTable("tradingSignals", {
  id: int("id").autoincrement().primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull(), // EUR/USD, GBP/USD, etc.
  signalType: mysqlEnum("signalType", ["buy", "sell", "hold"]).notNull(),
  strength: mysqlEnum("strength", ["weak", "moderate", "strong"]).notNull(),
  entryPrice: decimal("entryPrice", { precision: 10, scale: 5 }).notNull(),
  stopLoss: decimal("stopLoss", { precision: 10, scale: 5 }),
  takeProfit: decimal("takeProfit", { precision: 10, scale: 5 }),
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 1H, 4H, 1D
  indicators: text("indicators"), // JSON: RSI, MACD, MA values
  description: text("description"),
  status: mysqlEnum("status", ["active", "closed", "expired"]).default("active").notNull(),
  result: mysqlEnum("result", ["pending", "profit", "loss", "breakeven"]).default("pending"),
  pips: decimal("pips", { precision: 10, scale: 2 }),
  closedAt: timestamp("closedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = typeof tradingSignals.$inferInsert;

// ===== SIGNAL SUBSCRIPTIONS =====

export const signalSubscriptions = mysqlTable("signalSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  signalId: int("signalId").notNull(),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyPush: boolean("notifyPush").default(true).notNull(),
  autoTrade: boolean("autoTrade").default(false).notNull(), // Auto-execute signal
  positionSize: decimal("positionSize", { precision: 10, scale: 2 }), // Lot size if autoTrade
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
});

export type SignalSubscription = typeof signalSubscriptions.$inferSelect;
export type InsertSignalSubscription = typeof signalSubscriptions.$inferInsert;

// ===== MARKET ANALYSIS =====

export const marketAnalysis = mysqlTable("marketAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 1H, 4H, 1D
  trend: mysqlEnum("trend", ["bullish", "bearish", "neutral"]).notNull(),
  support: decimal("support", { precision: 10, scale: 5 }),
  resistance: decimal("resistance", { precision: 10, scale: 5 }),
  rsi: decimal("rsi", { precision: 5, scale: 2 }), // 0-100
  macd: decimal("macd", { precision: 10, scale: 5 }),
  macdSignal: decimal("macdSignal", { precision: 10, scale: 5 }),
  ma50: decimal("ma50", { precision: 10, scale: 5 }),
  ma200: decimal("ma200", { precision: 10, scale: 5 }),
  volatility: decimal("volatility", { precision: 5, scale: 2 }), // percentage
  sentiment: mysqlEnum("sentiment", ["bullish", "bearish", "neutral"]),
  analysis: text("analysis"), // AI-generated or manual analysis
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketAnalysis = typeof marketAnalysis.$inferSelect;
export type InsertMarketAnalysis = typeof marketAnalysis.$inferInsert;

// ===== PRICE ALERTS =====

export const priceAlerts = mysqlTable("priceAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pair: varchar("pair", { length: 20 }).notNull(),
  targetPrice: decimal("targetPrice", { precision: 10, scale: 5 }).notNull(),
  condition: mysqlEnum("condition", ["above", "below"]).notNull(),
  triggered: boolean("triggered").default(false).notNull(),
  notified: boolean("notified").default(false).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;
