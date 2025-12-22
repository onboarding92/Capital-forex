/**
 * Exchange Connector - Real Trading Engine Integration
 * 
 * Connects to real cryptocurrency exchanges (Binance, Kraken) for:
 * - Live price feeds
 * - Real-time order book data
 * - Order execution
 * - Trade history
 * 
 * Uses CCXT library for unified API access across multiple exchanges.
 */

import * as ccxt from "ccxt";

// Exchange configuration
const EXCHANGES = {
  binance: {
    id: "binance",
    name: "Binance",
    apiKey: process.env.BINANCE_API_KEY || "",
    secret: process.env.BINANCE_API_SECRET || "",
    testnet: process.env.NODE_ENV !== "production",
  },
  kraken: {
    id: "kraken",
    name: "Kraken",
    apiKey: process.env.KRAKEN_API_KEY || "",
    secret: process.env.KRAKEN_API_SECRET || "",
    testnet: false, // Kraken doesn't have testnet
  },
};

// Exchange instances
let binanceExchange: ccxt.Exchange | null = null;
let krakenExchange: ccxt.Exchange | null = null;

/**
 * Initialize exchange connections
 */
export async function initializeExchanges() {
  try {
    // Initialize Binance
    binanceExchange = new ccxt.binance({
      apiKey: EXCHANGES.binance.apiKey,
      secret: EXCHANGES.binance.secret,
      enableRateLimit: true,
      options: {
        defaultType: "spot",
        adjustForTimeDifference: true,
      },
    });

    if (EXCHANGES.binance.testnet) {
      binanceExchange.setSandboxMode(true);
      console.log("[ExchangeConnector] Binance testnet mode enabled");
    }

    // Initialize Kraken
    krakenExchange = new ccxt.kraken({
      apiKey: EXCHANGES.kraken.apiKey,
      secret: EXCHANGES.kraken.secret,
      enableRateLimit: true,
    });

    // Load markets for both exchanges
    await Promise.all([
      binanceExchange.loadMarkets(),
      krakenExchange.loadMarkets(),
    ]);

    console.log("[ExchangeConnector] Exchanges initialized successfully");
    console.log(`[ExchangeConnector] Binance markets: ${Object.keys(binanceExchange.markets).length}`);
    console.log(`[ExchangeConnector] Kraken markets: ${Object.keys(krakenExchange.markets).length}`);

    return { success: true };
  } catch (error) {
    console.error("[ExchangeConnector] Failed to initialize exchanges:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get live ticker price from primary exchange (Binance)
 */
export async function getLivePrice(symbol: string): Promise<{
  success: boolean;
  price?: number;
  exchange?: string;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    const ticker = await binanceExchange.fetchTicker(symbol);
    
    return {
      success: true,
      price: ticker.last || 0,
      exchange: "binance",
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch price for ${symbol}:`, error);
    
    // Fallback to Kraken
    try {
      if (!krakenExchange) {
        return { success: false, error: String(error) };
      }

      const ticker = await krakenExchange.fetchTicker(symbol);
      return {
        success: true,
        price: ticker.last || 0,
        exchange: "kraken",
      };
    } catch (fallbackError) {
      return { success: false, error: String(fallbackError) };
    }
  }
}

/**
 * Get order book from exchange
 */
export async function getOrderBook(
  symbol: string,
  limit: number = 20
): Promise<{
  success: boolean;
  bids?: Array<[number, number]>;
  asks?: Array<[number, number]>;
  exchange?: string;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    const orderBook = await binanceExchange.fetchOrderBook(symbol, limit);

    return {
      success: true,
      bids: orderBook.bids.map(([price, amount]) => [Number(price), Number(amount)] as [number, number]),
      asks: orderBook.asks.map(([price, amount]) => [Number(price), Number(amount)] as [number, number]),
      exchange: "binance",
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch order book for ${symbol}:`, error);
    
    // Fallback to Kraken
    try {
      if (!krakenExchange) {
        return { success: false, error: String(error) };
      }

      const orderBook = await krakenExchange.fetchOrderBook(symbol, limit);
      return {
        success: true,
        bids: orderBook.bids.map(([price, amount]) => [Number(price), Number(amount)] as [number, number]),
        asks: orderBook.asks.map(([price, amount]) => [Number(price), Number(amount)] as [number, number]),
        exchange: "kraken",
      };
    } catch (fallbackError) {
      return { success: false, error: String(fallbackError) };
    }
  }
}

/**
 * Place order on exchange
 * NOTE: Requires API keys with trading permissions
 */
export async function placeExchangeOrder(params: {
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  amount: number;
  price?: number;
}): Promise<{
  success: boolean;
  orderId?: string;
  status?: string;
  filled?: number;
  remaining?: number;
  exchange?: string;
  error?: string;
}> {
  const { symbol, side, type, amount, price } = params;

  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    // Check if API keys are configured
    if (!EXCHANGES.binance.apiKey || !EXCHANGES.binance.secret) {
      return {
        success: false,
        error: "Exchange API keys not configured. Set BINANCE_API_KEY and BINANCE_API_SECRET in environment variables.",
      };
    }

    // Place order
    const order = await binanceExchange.createOrder(
      symbol,
      type,
      side,
      amount,
      price
    );

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      filled: order.filled || 0,
      remaining: order.remaining || 0,
      exchange: "binance",
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to place order:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get order status from exchange
 */
export async function getOrderStatus(
  orderId: string,
  symbol: string
): Promise<{
  success: boolean;
  status?: string;
  filled?: number;
  remaining?: number;
  price?: number;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    const order = await binanceExchange.fetchOrder(orderId, symbol);

    return {
      success: true,
      status: order.status,
      filled: order.filled || 0,
      remaining: order.remaining || 0,
      price: order.price || 0,
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch order status:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Cancel order on exchange
 */
export async function cancelExchangeOrder(
  orderId: string,
  symbol: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    await binanceExchange.cancelOrder(orderId, symbol);

    return { success: true };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to cancel order:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get trade history for a symbol
 */
export async function getTradeHistory(
  symbol: string,
  limit: number = 50
): Promise<{
  success: boolean;
  trades?: Array<{
    id: string;
    timestamp: number;
    price: number;
    amount: number;
    side: string;
  }>;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    const trades = await binanceExchange.fetchTrades(symbol, undefined, limit);

    return {
      success: true,
      trades: trades.map((trade: any) => ({
        id: trade.id || "",
        timestamp: trade.timestamp || 0,
        price: trade.price || 0,
        amount: trade.amount || 0,
        side: trade.side || "unknown",
      })),
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch trade history:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get available trading pairs
 */
export async function getAvailablePairs(): Promise<{
  success: boolean;
  pairs?: string[];
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    const markets = binanceExchange.markets;
    const pairs = Object.keys(markets).filter(
      (symbol) => markets[symbol].active && markets[symbol].spot
    );

    return {
      success: true,
      pairs,
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch available pairs:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get exchange balance (requires API keys with read permissions)
 */
export async function getExchangeBalance(): Promise<{
  success: boolean;
  balances?: Record<string, { free: number; used: number; total: number }>;
  error?: string;
}> {
  try {
    if (!binanceExchange) {
      await initializeExchanges();
    }

    if (!binanceExchange) {
      return { success: false, error: "Exchange not initialized" };
    }

    // Check if API keys are configured
    if (!EXCHANGES.binance.apiKey || !EXCHANGES.binance.secret) {
      return {
        success: false,
        error: "Exchange API keys not configured",
      };
    }

    const balance = await binanceExchange.fetchBalance();

    // Convert CCXT balance format to our format
    const balances: Record<string, { free: number; used: number; total: number }> = {};
    for (const [currency, bal] of Object.entries(balance)) {
      if (typeof bal === 'object' && bal !== null && 'free' in bal && 'used' in bal && 'total' in bal) {
        balances[currency] = {
          free: Number(bal.free) || 0,
          used: Number(bal.used) || 0,
          total: Number(bal.total) || 0,
        };
      }
    }

    return {
      success: true,
      balances,
    };
  } catch (error) {
    console.error(`[ExchangeConnector] Failed to fetch balance:`, error);
    return { success: false, error: String(error) };
  }
}

// Initialize exchanges on module load
initializeExchanges().catch((error) => {
  console.error("[ExchangeConnector] Failed to initialize on startup:", error);
});
