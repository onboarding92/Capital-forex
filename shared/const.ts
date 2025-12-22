export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

export const SUPPORTED_ASSETS = ["BTC", "ETH", "USDT", "BNB", "ADA", "SOL", "XRP", "DOT", "DOGE", "AVAX", "SHIB", "MATIC", "LTC", "LINK", "XLM"] as const;
export type Asset = typeof SUPPORTED_ASSETS[number];

export const ASSET_NAMES: Record<Asset, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", USDT: "Tether", BNB: "Binance Coin",
  ADA: "Cardano", SOL: "Solana", XRP: "Ripple", DOT: "Polkadot",
  DOGE: "Dogecoin", AVAX: "Avalanche", SHIB: "Shiba Inu", MATIC: "Polygon",
  LTC: "Litecoin", LINK: "Chainlink", XLM: "Stellar"
};

export const TRADING_PAIRS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "ADA/USDT", "SOL/USDT", "XRP/USDT", "DOT/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT"] as const;
export type TradingPair = typeof TRADING_PAIRS[number];
