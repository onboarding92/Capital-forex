import axios from "axios";
import { cacheGet, cacheSet } from "./_core/redis";

// CoinGecko API (free tier, no API key required)
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Mapping dei nostri asset ai CoinGecko IDs
const ASSET_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  ADA: "cardano",
  SOL: "solana",
  XRP: "ripple",
  DOT: "polkadot",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  SHIB: "shiba-inu",
  MATIC: "matic-network",
  LTC: "litecoin",
  LINK: "chainlink",
  XLM: "stellar",
};

interface PriceData {
  asset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: number;
}

// Cache per evitare troppe chiamate API
const priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map();
const CACHE_DURATION = 60000; // 60 secondi (1 minuto)

/**
 * Ottiene il prezzo corrente di un asset da CoinGecko
 */
export async function getCryptoPrice(asset: string): Promise<PriceData | null> {
  const coinId = ASSET_TO_COINGECKO[asset];
  if (!coinId) {
    console.warn(`[CryptoPrices] Asset ${asset} not mapped to CoinGecko ID`);
    return null;
  }

  // Check Redis cache first
  const redisCached = await cacheGet<PriceData>(`price:${asset}`);
  if (redisCached) {
    return redisCached;
  }

  // Check in-memory cache
  const cached = priceCache.get(asset);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: "usd",
        include_24hr_change: true,
        include_24hr_vol: true,
        include_last_updated_at: true,
      },
      timeout: 5000,
    });

    const data = response.data[coinId];
    if (!data) {
      console.warn(`[CryptoPrices] No data for ${asset} (${coinId})`);
      return null;
    }

    const priceData: PriceData = {
      asset,
      price: data.usd || 0,
      change24h: data.usd_24h_change || 0,
      volume24h: data.usd_24h_vol || 0,
      high24h: data.usd * 1.02, // Approximation (CoinGecko free tier doesn't provide this)
      low24h: data.usd * 0.98,
      lastUpdated: data.last_updated_at * 1000 || Date.now(),
    };

    // Update both caches
    priceCache.set(asset, { data: priceData, timestamp: Date.now() });
    await cacheSet(`price:${asset}`, priceData, 60); // 60 seconds TTL

    return priceData;
  } catch (error: any) {
    console.error(`[CryptoPrices] Error fetching price for ${asset}:`, error.message);
    return null;
  }
}

/**
 * Ottiene i prezzi di tutti gli asset supportati
 */
export async function getAllCryptoPrices(): Promise<PriceData[]> {
  // Check Redis cache for all prices
  const redisCached = await cacheGet<PriceData[]>('prices:all');
  if (redisCached && redisCached.length > 0) {
    return redisCached;
  }

  const assets = Object.keys(ASSET_TO_COINGECKO);
  const coinIds = Object.values(ASSET_TO_COINGECKO).join(",");

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinIds,
        vs_currencies: "usd",
        include_24hr_change: true,
        include_24hr_vol: true,
        include_last_updated_at: true,
      },
      timeout: 30000, // Increased to 30 seconds
    });

    const prices: PriceData[] = [];

    for (const asset of assets) {
      const coinId = ASSET_TO_COINGECKO[asset];
      const data = response.data[coinId];

      if (data) {
        const priceData: PriceData = {
          asset,
          price: data.usd || 0,
          change24h: data.usd_24h_change || 0,
          volume24h: data.usd_24h_vol || 0,
          high24h: data.usd * 1.02,
          low24h: data.usd * 0.98,
          lastUpdated: data.last_updated_at * 1000 || Date.now(),
        };

        prices.push(priceData);
        priceCache.set(asset, { data: priceData, timestamp: Date.now() });
      }
    }

    // Cache all prices in Redis
    await cacheSet('prices:all', prices, 60); // 60 seconds TTL

    return prices;
  } catch (error: any) {
    console.error("[CryptoPrices] Error fetching all prices:", error.message);
    return [];
  }
}

/**
 * Ottiene il prezzo di un trading pair (es. BTC/USDT)
 */
export async function getPairPrice(pair: string): Promise<number> {
  const [base, quote] = pair.split("/");
  
  if (quote === "USDT" || quote === "USD") {
    const priceData = await getCryptoPrice(base);
    return priceData?.price || 0;
  }

  // Per altri pair, calcola il rapporto
  const basePrice = await getCryptoPrice(base);
  const quotePrice = await getCryptoPrice(quote);

  if (!basePrice || !quotePrice || quotePrice.price === 0) {
    return 0;
  }

  return basePrice.price / quotePrice.price;
}

/**
 * Pulisce la cache (utile per testing)
 */
export function clearPriceCache() {
  priceCache.clear();
}
