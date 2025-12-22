import { TRPCError } from "@trpc/server";

type RateLimitKeyType = "login-ip" | "login-email" | "register-ip";

type Bucket = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const buckets: Map<string, Bucket> = new Map();

// Config for rate limits
const WINDOW_MS = 15 * 60_000; // 15 minutes
const REGISTER_WINDOW_MS = 30 * 60_000; // 30 minutes
const BLOCK_MS = 30 * 60_000; // 30 minutes

const LIMITS: Record<RateLimitKeyType, { max: number; windowMs: number }> = {
  "login-ip": { max: 50, windowMs: WINDOW_MS },
  "login-email": { max: 10, windowMs: WINDOW_MS },
  "register-ip": { max: 10, windowMs: REGISTER_WINDOW_MS },
};

function makeKey(type: RateLimitKeyType, value: string) {
  return `${type}:${value}`;
}

function getBucket(key: string): Bucket {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = {
      count: 0,
      firstAttemptAt: now,
      blockedUntil: null,
    };
    buckets.set(key, bucket);
  }
  return bucket;
}

function shouldBlock(type: RateLimitKeyType, value: string) {
  const now = Date.now();
  const key = makeKey(type, value);
  const cfg = LIMITS[type];
  const bucket = getBucket(key);

  // If currently blocked
  if (bucket.blockedUntil && now < bucket.blockedUntil) {
    return true;
  }

  // Reset window if expired
  if (now - bucket.firstAttemptAt > cfg.windowMs) {
    bucket.count = 0;
    bucket.firstAttemptAt = now;
    bucket.blockedUntil = null;
  }

  // Not yet over limit
  if (bucket.count < cfg.max) {
    return false;
  }

  // Hit limit → block
  bucket.blockedUntil = now + BLOCK_MS;
  return true;
}

function registerAttempt(type: RateLimitKeyType, value: string) {
  const now = Date.now();
  const key = makeKey(type, value);
  const cfg = LIMITS[type];
  const bucket = getBucket(key);

  // Reset window if expired
  if (now - bucket.firstAttemptAt > cfg.windowMs) {
    bucket.count = 0;
    bucket.firstAttemptAt = now;
    bucket.blockedUntil = null;
  }

  bucket.count++;
}

/**
 * Extract client IP from request
 */
export function extractClientIp(req: any): string {
  try {
    const xfwd = req.headers?.["x-forwarded-for"];
    if (typeof xfwd === "string" && xfwd.length > 0) {
      return xfwd.split(",")[0].trim();
    }
    const ip =
      req.ip ||
      req._remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress;
    return typeof ip === "string" ? ip : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check rate limits BEFORE processing login
 */
export function checkLoginRateLimit(params: { ip: string; email?: string }) {
  const { ip, email } = params;
  const ipKey = ip || "unknown";

  if (shouldBlock("login-ip", ipKey)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Too many login attempts from this IP. Please try again later.",
    });
  }

  if (email) {
    const emailKey = email.toLowerCase();
    if (shouldBlock("login-email", emailKey)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message:
          "Too many login attempts for this account. Please try again later.",
      });
    }
  }

  // Count this attempt
  registerAttempt("login-ip", ipKey);
  if (email) {
    registerAttempt("login-email", email.toLowerCase());
  }
}

/**
 * Record login result - reset counters on success
 */
export function recordLoginResult(params: {
  ip: string;
  email?: string;
  success: boolean;
}) {
  const { ip, email, success } = params;
  if (!success) return;

  const ipKey = ip || "unknown";
  const loginIpKey = makeKey("login-ip", ipKey);
  const bucketIp = buckets.get(loginIpKey);
  if (bucketIp) {
    bucketIp.count = 0;
    bucketIp.firstAttemptAt = Date.now();
    bucketIp.blockedUntil = null;
  }

  if (email) {
    const emailKey = email.toLowerCase();
    const loginEmailKey = makeKey("login-email", emailKey);
    const bucketEmail = buckets.get(loginEmailKey);
    if (bucketEmail) {
      bucketEmail.count = 0;
      bucketEmail.firstAttemptAt = Date.now();
      bucketEmail.blockedUntil = null;
    }
  }
}

/**
 * Check and register attempts for registration
 */
export function checkRegisterRateLimit(params: { ip: string }) {
  const { ip } = params;
  const ipKey = ip || "unknown";

  if (shouldBlock("register-ip", ipKey)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Too many registration attempts from this IP. Please try again later.",
    });
  }

  registerAttempt("register-ip", ipKey);
}
