export const NETWORKS = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    assets: ["BTC"],
    withdrawalFee: 0.0005,
  },
  {
    id: "ethereum",
    name: "Ethereum (ERC20)",
    symbol: "ETH",
    assets: ["ETH", "USDT", "USDC", "LINK"],
    withdrawalFee: 0.005,
  },
  {
    id: "bsc",
    name: "Binance Smart Chain (BEP20)",
    symbol: "BSC",
    assets: ["BNB", "USDT", "USDC"],
    withdrawalFee: 0.001,
  },
  {
    id: "tron",
    name: "Tron (TRC20)",
    symbol: "TRX",
    assets: ["TRX", "USDT"],
    withdrawalFee: 1,
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    assets: ["SOL", "USDT", "USDC"],
    withdrawalFee: 0.01,
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    assets: ["MATIC", "USDT", "USDC"],
    withdrawalFee: 0.1,
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ADA",
    assets: ["ADA"],
    withdrawalFee: 1,
  },
  {
    id: "ripple",
    name: "Ripple",
    symbol: "XRP",
    assets: ["XRP"],
    withdrawalFee: 0.25,
  },
  {
    id: "polkadot",
    name: "Polkadot",
    symbol: "DOT",
    assets: ["DOT"],
    withdrawalFee: 0.1,
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    assets: ["DOGE"],
    withdrawalFee: 5,
  },
  {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    assets: ["AVAX"],
    withdrawalFee: 0.01,
  },
  {
    id: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    assets: ["LTC"],
    withdrawalFee: 0.001,
  },
  {
    id: "stellar",
    name: "Stellar",
    symbol: "XLM",
    assets: ["XLM"],
    withdrawalFee: 0.01,
  },
];

export function getNetworksForAsset(asset: string) {
  return NETWORKS.filter((network) => network.assets.includes(asset as any));
}

export function getNetworkById(networkId: string) {
  return NETWORKS.find((network) => network.id === networkId);
}
