import { getDb } from "../server/db";
import { networks } from "../drizzle/schema";

const networkData = [
  // Bitcoin
  {
    name: "Bitcoin",
    symbol: "BTC",
    chainId: null,
    type: "BTC",
    asset: "BTC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.0005",
    minDeposit: "0.0001",
    minWithdrawal: "0.001",
    confirmations: 3,
  },
  
  // Ethereum
  {
    name: "Ethereum",
    symbol: "ETH",
    chainId: "1",
    type: "ERC20",
    asset: "ETH",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.005",
    minDeposit: "0.01",
    minWithdrawal: "0.02",
    confirmations: 12,
  },
  
  // USDT - Multiple Networks
  {
    name: "Tether (ERC20)",
    symbol: "USDT-ERC20",
    chainId: "1",
    type: "ERC20",
    asset: "USDT",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "10",
    minDeposit: "10",
    minWithdrawal: "20",
    confirmations: 12,
  },
  {
    name: "Tether (TRC20)",
    symbol: "USDT-TRC20",
    chainId: null,
    type: "TRC20",
    asset: "USDT",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "1",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 19,
  },
  {
    name: "Tether (BEP20)",
    symbol: "USDT-BEP20",
    chainId: "56",
    type: "BEP20",
    asset: "USDT",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.8",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 15,
  },
  {
    name: "Tether (Polygon)",
    symbol: "USDT-POLYGON",
    chainId: "137",
    type: "POLYGON",
    asset: "USDT",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.5",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 128,
  },
  {
    name: "Tether (Solana)",
    symbol: "USDT-SOL",
    chainId: null,
    type: "SPL",
    asset: "USDT",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.2",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 1,
  },
  
  // USDC - Multiple Networks
  {
    name: "USD Coin (ERC20)",
    symbol: "USDC-ERC20",
    chainId: "1",
    type: "ERC20",
    asset: "USDC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "10",
    minDeposit: "10",
    minWithdrawal: "20",
    confirmations: 12,
  },
  {
    name: "USD Coin (BEP20)",
    symbol: "USDC-BEP20",
    chainId: "56",
    type: "BEP20",
    asset: "USDC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.8",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 15,
  },
  {
    name: "USD Coin (Polygon)",
    symbol: "USDC-POLYGON",
    chainId: "137",
    type: "POLYGON",
    asset: "USDC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.5",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 128,
  },
  {
    name: "USD Coin (Solana)",
    symbol: "USDC-SOL",
    chainId: null,
    type: "SPL",
    asset: "USDC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.2",
    minDeposit: "5",
    minWithdrawal: "10",
    confirmations: 1,
  },
  
  // BSC
  {
    name: "Binance Coin",
    symbol: "BNB",
    chainId: "56",
    type: "BEP20",
    asset: "BNB",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.001",
    minDeposit: "0.01",
    minWithdrawal: "0.02",
    confirmations: 15,
  },
  
  // Tron
  {
    name: "Tron",
    symbol: "TRX",
    chainId: null,
    type: "TRC20",
    asset: "TRX",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "1",
    minDeposit: "10",
    minWithdrawal: "20",
    confirmations: 19,
  },
  
  // Solana
  {
    name: "Solana",
    symbol: "SOL",
    chainId: null,
    type: "SPL",
    asset: "SOL",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.01",
    minDeposit: "0.1",
    minWithdrawal: "0.2",
    confirmations: 1,
  },
  
  // Polygon
  {
    name: "Polygon",
    symbol: "MATIC",
    chainId: "137",
    type: "POLYGON",
    asset: "MATIC",
    isActive: true,
    depositFee: "0",
    withdrawalFee: "0.1",
    minDeposit: "1",
    minWithdrawal: "2",
    confirmations: 128,
  },
];

async function seedNetworks() {
  console.log("🌐 Seeding networks...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  try {
    // Check if networks already exist
    const existing = await db.select().from(networks).limit(1);
    if (existing.length > 0) {
      console.log("⚠️  Networks already seeded. Skipping...");
      return;
    }

    // Insert all networks
    for (const network of networkData) {
      await db.insert(networks).values(network);
      console.log(`✅ Added network: ${network.name} (${network.symbol})`);
    }

    console.log(`\n✅ Successfully seeded ${networkData.length} networks!`);
    console.log("\nSupported networks:");
    console.log("- Bitcoin (BTC)");
    console.log("- Ethereum (ETH)");
    console.log("- USDT: ERC20, TRC20, BEP20, Polygon, Solana");
    console.log("- USDC: ERC20, BEP20, Polygon, Solana");
    console.log("- Binance Coin (BNB)");
    console.log("- Tron (TRX)");
    console.log("- Solana (SOL)");
    console.log("- Polygon (MATIC)");
  } catch (error) {
    console.error("❌ Error seeding networks:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedNetworks();
