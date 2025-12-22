/**
 * Trading Bot API - REST Endpoints
 * 
 * Provides REST API for algorithmic trading with:
 * - API key authentication
 * - Rate limiting (100 requests/minute per key)
 * - Request logging
 * - IP whitelist support
 * 
 * Endpoints:
 * - POST /api/v1/trading/order - Place order
 * - GET /api/v1/trading/balance - Get wallet balances
 * - GET /api/v1/trading/orders - Get open orders
 * - GET /api/v1/trading/trades - Get trade history
 * - DELETE /api/v1/trading/order/:id - Cancel order
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from './db';
import { apiKeys, apiRequestLogs, wallets, orders, trades } from '../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Rate limiting storage (in-memory, per API key)
const rateLimitStore = new Map<number, { count: number; resetAt: number }>();

/**
 * API Key Authentication Middleware
 */
async function authenticateAPIKey(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const apiSecret = req.headers['x-api-secret'] as string;

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        error: 'Missing API credentials',
        message: 'X-API-Key and X-API-Secret headers are required',
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
      });
    }

    // Find API key
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .limit(1);

    if (!keyRecord) {
      await logAPIRequest(null, null, req, 401, Date.now() - startTime, 'Invalid API key');
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    // Check if key is enabled
    if (!keyRecord.enabled) {
      await logAPIRequest(keyRecord.id, keyRecord.userId, req, 403, Date.now() - startTime, 'API key disabled');
      return res.status(403).json({
        success: false,
        error: 'API key is disabled',
      });
    }

    // Check if key has expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      await logAPIRequest(keyRecord.id, keyRecord.userId, req, 403, Date.now() - startTime, 'API key expired');
      return res.status(403).json({
        success: false,
        error: 'API key has expired',
      });
    }

    // Verify secret (compare hashed)
    const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');
    if (hashedSecret !== keyRecord.secret) {
      await logAPIRequest(keyRecord.id, keyRecord.userId, req, 401, Date.now() - startTime, 'Invalid API secret');
      return res.status(401).json({
        success: false,
        error: 'Invalid API secret',
      });
    }

    // Check IP whitelist (if configured)
    if (keyRecord.ipWhitelist) {
      try {
        const whitelist = JSON.parse(keyRecord.ipWhitelist);
        const clientIP = req.ip || req.socket.remoteAddress || '';
        
        if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
          await logAPIRequest(keyRecord.id, keyRecord.userId, req, 403, Date.now() - startTime, 'IP not whitelisted');
          return res.status(403).json({
            success: false,
            error: 'IP address not whitelisted',
          });
        }
      } catch (e) {
        console.error('Error parsing IP whitelist:', e);
      }
    }

    // Check rate limit
    const now = Date.now();
    const rateLimitKey = keyRecord.id;
    let rateLimit = rateLimitStore.get(rateLimitKey);

    if (!rateLimit || now > rateLimit.resetAt) {
      // Reset rate limit window (1 minute)
      rateLimit = {
        count: 0,
        resetAt: now + 60000, // 1 minute from now
      };
      rateLimitStore.set(rateLimitKey, rateLimit);
    }

    if (rateLimit.count >= keyRecord.rateLimit) {
      const resetIn = Math.ceil((rateLimit.resetAt - now) / 1000);
      await logAPIRequest(keyRecord.id, keyRecord.userId, req, 429, Date.now() - startTime, 'Rate limit exceeded');
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Rate limit: ${keyRecord.rateLimit} requests per minute`,
        resetIn,
      });
    }

    // Increment rate limit counter
    rateLimit.count++;

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id));

    // Attach user info to request
    (req as any).apiKey = keyRecord;
    (req as any).userId = keyRecord.userId;
    (req as any).startTime = startTime;

    next();
  } catch (error) {
    console.error('API authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Log API request
 */
async function logAPIRequest(
  apiKeyId: number | null,
  userId: number | null,
  req: Request,
  statusCode: number,
  responseTime: number,
  error?: string
) {
  try {
    const db = await getDb();
    if (!db || !apiKeyId || !userId) return;

    await db.insert(apiRequestLogs).values({
      apiKeyId,
      userId,
      endpoint: req.path,
      method: req.method,
      statusCode,
      responseTime,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || null,
      requestBody: req.method === 'POST' ? JSON.stringify(req.body) : null,
      error: error || null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Error logging API request:', e);
  }
}

/**
 * Middleware to log successful requests
 */
function logSuccess(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    const apiKey = (req as any).apiKey;
    const startTime = (req as any).startTime;
    
    if (apiKey && startTime) {
      logAPIRequest(
        apiKey.id,
        apiKey.userId,
        req,
        res.statusCode,
        Date.now() - startTime
      );
    }
    
    return originalJson(body);
  };
  
  next();
}

// Apply authentication to all routes
router.use(authenticateAPIKey);
router.use(logSuccess);

/**
 * POST /api/v1/trading/order
 * Place a new order
 */
router.post('/order', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pair, side, type, price, amount, stopLoss, takeProfit } = req.body;

    // Validate input
    if (!pair || !side || !type || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['pair', 'side', 'type', 'amount'],
      });
    }

    if (type === 'limit' && !price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required for limit orders',
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    // Check permissions
    const apiKey = (req as any).apiKey;
    const permissions = JSON.parse(apiKey.permissions);
    if (!permissions.includes('trading')) {
      return res.status(403).json({
        success: false,
        error: 'API key does not have trading permission',
      });
    }

    // Create order (simplified - in production, add full validation and balance checks)
    const [order] = await db.insert(orders).values({
      userId,
      pair,
      side,
      type,
      price: price || '0',
      amount,
      filled: '0',
      status: 'open',
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      order: {
        id: order.insertId,
        pair,
        side,
        type,
        price,
        amount,
        stopLoss,
        takeProfit,
        status: 'open',
      },
    });
  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to place order',
    });
  }
});

/**
 * GET /api/v1/trading/balance
 * Get wallet balances
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    const userWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    return res.json({
      success: true,
      balances: userWallets.map(w => ({
        asset: w.asset,
        balance: w.balance,
        locked: w.locked,
        available: (parseFloat(w.balance) - parseFloat(w.locked)).toFixed(8),
      })),
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
});

/**
 * GET /api/v1/trading/orders
 * Get open orders
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pair, status = 'open' } = req.query;

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    const conditions = [eq(orders.userId, userId)];
    if (pair) conditions.push(eq(orders.pair, pair as string));
    if (status) conditions.push(eq(orders.status, status as any));

    const userOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    return res.json({
      success: true,
      orders: userOrders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
});

/**
 * GET /api/v1/trading/trades
 * Get trade history
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pair, limit = 50 } = req.query;

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    const conditions = [
      sql`(${trades.buyerId} = ${userId} OR ${trades.sellerId} = ${userId})`
    ];
    if (pair) conditions.push(eq(trades.pair, pair as string));

    const userTrades = await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.createdAt))
      .limit(parseInt(limit as string));

    return res.json({
      success: true,
      trades: userTrades,
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
    });
  }
});

/**
 * DELETE /api/v1/trading/order/:id
 * Cancel an order
 */
router.delete('/order/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const orderId = parseInt(req.params.id);

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    // Check permissions
    const apiKey = (req as any).apiKey;
    const permissions = JSON.parse(apiKey.permissions);
    if (!permissions.includes('trading')) {
      return res.status(403).json({
        success: false,
        error: 'API key does not have trading permission',
      });
    }

    // Verify order belongs to user
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled',
      });
    }

    // Cancel order
    await db
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
});

export default router;
