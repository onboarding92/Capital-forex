/**
 * Cold Wallet Manager
 * 
 * Manages cold storage wallets (offline, hardware wallets)
 * - Read-only operations (no private keys stored)
 * - Balance verification via blockchain APIs
 * - Manual transfer tracking
 */

import { getDb } from "./db";
import { coldWallets } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINTS = {
  BTC: process.env.BTC_RPC_URL || "https://blockstream.info/api",
  ETH: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
  BNB: process.env.BNB_RPC_URL || "https://bsc-dataseed1.binance.org",
  MATIC: process.env.MATIC_RPC_URL || "https://polygon-rpc.com",
  SOL: process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com",
  TRX: process.env.TRX_RPC_URL || "https://api.trongrid.io",
};

/**
 * Get all cold wallets
 */
export async function getColdWallets() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  return await db.select().from(coldWallets).orderBy(coldWallets.network);
}

/**
 * Get cold wallet by network
 */
export async function getColdWallet(network: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const [wallet] = await db.select()
    .from(coldWallets)
    .where(eq(coldWallets.network, network))
    .limit(1);
  
  return wallet || null;
}

/**
 * Add new cold wallet (address only, no private key)
 */
export async function addColdWallet(data: {
  network: string;
  asset: string;
  address: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Verify address format before adding
  const isValid = await verifyAddressFormat(data.network, data.address);
  if (!isValid) {
    throw new Error(`Invalid address format for network ${data.network}`);
  }
  
  const [result] = await db.insert(coldWallets).values({
    network: data.network,
    asset: data.asset,
    address: data.address,
    notes: data.notes || null,
    balance: "0",
    lastVerifiedAt: null,
  });
  
  return result;
}

/**
 * Update cold wallet notes
 */
export async function updateColdWalletNotes(network: string, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db.update(coldWallets)
    .set({ notes })
    .where(eq(coldWallets.network, network));
  
  return { success: true };
}

/**
 * Verify cold wallet balance from blockchain
 */
export async function verifyColdWalletBalance(network: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const wallet = await getColdWallet(network);
  if (!wallet) {
    throw new Error(`Cold wallet not found for network ${network}`);
  }
  
  let balance = "0";
  
  try {
    if (network === "BTC") {
      balance = await getBitcoinBalance(wallet.address);
    } else if (network === "ETH" || network.startsWith("USDT_ERC20") || network.startsWith("USDC_ERC20")) {
      balance = await getEthereumBalance(wallet.address, wallet.asset);
    } else if (network === "BNB" || network.startsWith("USDT_BEP20") || network.startsWith("USDC_BEP20")) {
      balance = await getBNBBalance(wallet.address, wallet.asset);
    } else if (network === "MATIC" || network.startsWith("USDT_POLYGON") || network.startsWith("USDC_POLYGON")) {
      balance = await getPolygonBalance(wallet.address, wallet.asset);
    } else if (network === "SOL") {
      balance = await getSolanaBalance(wallet.address);
    } else if (network === "TRX" || network.startsWith("USDT_TRC20")) {
      balance = await getTronBalance(wallet.address, wallet.asset);
    }
    
    // Update balance in database
    await db.update(coldWallets)
      .set({ 
        balance,
        lastVerifiedAt: new Date()
      })
      .where(eq(coldWallets.network, network));
    
    return { success: true, balance, lastVerifiedAt: new Date() };
  } catch (error: any) {
    console.error(`[ColdWallet] Failed to verify balance for ${network}:`, error.message);
    return { success: false, error: error.message, balance: wallet.balance };
  }
}

/**
 * Get total value locked in cold storage (in USD)
 */
export async function getTotalColdStorageValue() {
  const wallets = await getColdWallets();
  
  // TODO: Fetch real-time prices from CoinGecko
  const prices: Record<string, number> = {
    BTC: 88000,
    ETH: 3200,
    USDT: 1,
    USDC: 1,
    BNB: 600,
    SOL: 180,
    MATIC: 0.85,
    TRX: 0.12,
  };
  
  let totalValue = 0;
  
  for (const wallet of wallets) {
    const price = prices[wallet.asset] || 0;
    const balance = parseFloat(wallet.balance || "0");
    totalValue += balance * price;
  }
  
  return {
    totalValue,
    wallets: wallets.map(w => ({
      network: w.network,
      asset: w.asset,
      balance: w.balance,
      value: parseFloat(w.balance || "0") * (prices[w.asset] || 0),
      lastVerifiedAt: w.lastVerifiedAt,
    }))
  };
}

// ============================================================================
// Helper Functions - Blockchain Balance Queries
// ============================================================================

async function verifyAddressFormat(network: string, address: string): Promise<boolean> {
  try {
    if (network === "BTC") {
      // Bitcoin address validation (basic)
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
    } else if (network.includes("ETH") || network.includes("BNB") || network.includes("MATIC")) {
      // EVM address validation
      return ethers.utils.isAddress(address);
    } else if (network === "SOL") {
      // Solana address validation
      try {
        new PublicKey(address);
        return true;
      } catch {
        return false;
      }
    } else if (network.includes("TRX")) {
      // Tron address validation (basic)
      return /^T[a-zA-Z0-9]{33}$/.test(address);
    }
    return true; // Unknown network, allow
  } catch {
    return false;
  }
}

async function getBitcoinBalance(address: string): Promise<string> {
  const response = await fetch(`${RPC_ENDPOINTS.BTC}/address/${address}`);
  const data = await response.json();
  
  const funded = data.chain_stats?.funded_txo_sum || 0;
  const spent = data.chain_stats?.spent_txo_sum || 0;
  const balance = (funded - spent) / 100000000; // Convert satoshis to BTC
  
  return balance.toString();
}

async function getEthereumBalance(address: string, asset: string): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.ETH);
  
  if (asset === "ETH") {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } else {
    // ERC20 token balance (USDT, USDC)
    const tokenAddresses: Record<string, string> = {
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    };
    
    const tokenAddress = tokenAddresses[asset];
    if (!tokenAddress) return "0";
    
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = asset === "USDT" || asset === "USDC" ? 6 : 18;
    
    return ethers.utils.formatUnits(balance, decimals);
  }
}

async function getBNBBalance(address: string, asset: string): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.BNB);
  
  if (asset === "BNB") {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } else {
    const tokenAddresses: Record<string, string> = {
      USDT: "0x55d398326f99059fF775485246999027B3197955",
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    };
    
    const tokenAddress = tokenAddresses[asset];
    if (!tokenAddress) return "0";
    
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    
    return ethers.utils.formatUnits(balance, 18);
  }
}

async function getPolygonBalance(address: string, asset: string): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.MATIC);
  
  if (asset === "MATIC") {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } else {
    const tokenAddresses: Record<string, string> = {
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    };
    
    const tokenAddress = tokenAddresses[asset];
    if (!tokenAddress) return "0";
    
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    
    return ethers.utils.formatUnits(balance, 6);
  }
}

async function getSolanaBalance(address: string): Promise<string> {
  const connection = new Connection(RPC_ENDPOINTS.SOL, "confirmed");
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  
  return (balance / 1000000000).toString(); // Convert lamports to SOL
}

async function getTronBalance(address: string, asset: string): Promise<string> {
  // Tron balance query via TronGrid API
  const response = await fetch(`${RPC_ENDPOINTS.TRX}/v1/accounts/${address}`);
  const data = await response.json();
  
  if (asset === "TRX") {
    const balance = data.data?.[0]?.balance || 0;
    return (balance / 1000000).toString(); // Convert sun to TRX
  } else {
    // TRC20 token balance (USDT)
    // TODO: Implement TRC20 balance query
    return "0";
  }
}
