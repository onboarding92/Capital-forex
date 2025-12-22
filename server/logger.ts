import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child loggers for different modules
export const apiLogger = logger.child({ module: "api" });
export const dbLogger = logger.child({ module: "database" });
export const tradeLogger = logger.child({ module: "trading" });
export const authLogger = logger.child({ module: "auth" });
export const exchangeLogger = logger.child({ module: "exchange" });

// Helper function to log API requests
export function logApiRequest(req: any, res: any, duration: number) {
  apiLogger.info({
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.headers?.["user-agent"] || "unknown",
    ip: req.ip || req.connection?.remoteAddress,
  });
}

// Helper function to log errors with context
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}

// Helper function to log trading activity
export function logTrade(data: {
  userId: number;
  pair: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  mode: "simulated" | "live";
}) {
  tradeLogger.info({
    event: "trade_executed",
    ...data,
  });
}

// Helper function to log exchange API calls
export function logExchangeCall(data: {
  exchange: string;
  method: string;
  success: boolean;
  duration: number;
  error?: string;
}) {
  exchangeLogger.info({
    event: "exchange_api_call",
    ...data,
  });
}

// Helper function to log authentication events
export function logAuth(event: string, data: Record<string, any>) {
  authLogger.info({
    event,
    ...data,
  });
}

// Helper function to log database queries
export function logDbQuery(query: string, duration: number, error?: Error) {
  if (error) {
    dbLogger.error({
      event: "query_error",
      query: query.substring(0, 200), // Truncate long queries
      duration: `${duration}ms`,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } else {
    dbLogger.debug({
      event: "query_executed",
      query: query.substring(0, 200),
      duration: `${duration}ms`,
    });
  }
}
