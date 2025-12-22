import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Only create Redis client if REDIS_URL is provided
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('[Redis] REDIS_URL not configured, caching disabled');
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('[Redis] Max retries reached, giving up');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redis.on('connect', () => {
        console.log('[Redis] Connected successfully');
      });

      redis.on('error', (err) => {
        console.error('[Redis] Error:', err.message);
      });

      redis.on('close', () => {
        console.log('[Redis] Connection closed');
      });
    } catch (error) {
      console.error('[Redis] Failed to create client:', error);
      return null;
    }
  }

  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Redis] Failed to get key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 60): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to set key ${key}:`, error);
    return false;
  }
}

export async function cacheDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to delete key ${key}:`, error);
    return false;
  }
}
