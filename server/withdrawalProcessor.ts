/**
 * Withdrawal Processing Service
 * 
 * Executes on-chain transactions when admin approves withdrawal requests.
 * 
 * Workflow:
 * 1. Admin approves withdrawal in admin panel
 * 2. System calls processWithdrawal()
 * 3. Checks hot wallet balance
 * 4. Executes on-chain transaction
 * 5. Updates withdrawal status with txHash
 * 6. Sends email notification to user
 * 
 * Supported networks:
 * - Bitcoin (BTC)
 * - Ethereum (ETH, USDT ERC20, USDC ERC20)
 * - Tron (TRX, USDT TRC20, USDC TRC20)
 * - Solana (SOL, USDT SPL, USDC SPL)
 * - BNB Chain (BNB, USDT BEP20, USDC BEP20)
 * - Polygon (MATIC, USDT Polygon, USDC Polygon)
 */

import { ethers, utils, Wallet } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import TronWeb from "tronweb";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getDb } from "./db";
import { withdrawals, masterWallets, blockchainTransactions, users, wallets } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./email";

// RPC endpoints (should be in env variables in production)
const RPC_ENDPOINTS = {
  ETH: process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
  BNB: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/",
  MATIC: process.env.MATIC_RPC_URL || "https://polygon-rpc.com/",
  TRX: process.env.TRX_RPC_URL || "https://api.trongrid.io",
  SOL: process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com",
  BTC: process.env.BTC_RPC_URL || "https://blockchain.info",
};

// ERC20 token addresses
const TOKEN_ADDRESSES = {
  USDT_ERC20: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  USDC_ERC20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT_BEP20: "0x55d398326f99059fF775485246999027B3197955",
  USDC_BEP20: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  USDT_POLYGON: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  USDC_POLYGON: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
};

// Tron token addresses
const TRON_TOKEN_ADDRESSES = {
  USDT_TRC20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  USDC_TRC20: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
};

// Solana token addresses
const SOLANA_TOKEN_ADDRESSES = {
  USDT_SPL: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  USDC_SPL: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

/**
 * Process withdrawal - main entry point
 */
export async function processWithdrawal(withdrawalId: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database connection failed" };

  try {
    // Get withdrawal details
    const [withdrawal] = await db.select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) {
      return { success: false, error: "Withdrawal not found" };
    }

    if (withdrawal.status !== "approved") {
      return { success: false, error: "Withdrawal not approved" };
    }

    // Get user details
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, withdrawal.userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get master wallet for this network
    const [masterWallet] = await db.select()
      .from(masterWallets)
      .where(and(
        eq(masterWallets.network, withdrawal.network || ""),
        eq(masterWallets.isActive, true)
      ))
      .limit(1);

    if (!masterWallet) {
      return { success: false, error: `No active master wallet found for network ${withdrawal.network}` };
    }

    // Update status to processing
    await db.update(withdrawals)
      .set({ status: "processing" })
      .where(eq(withdrawals.id, withdrawalId));

    // Execute withdrawal based on network
    let result: { success: boolean; txHash?: string; error?: string };

    const network = withdrawal.network || "";
    const asset = withdrawal.asset;
    const amount = withdrawal.amount;
    const toAddress = withdrawal.address || "";

    if (network === "BTC") {
      result = await processBitcoinWithdrawal(masterWallet, toAddress, amount);
    } else if (network === "ETH") {
      if (asset === "ETH") {
        result = await processEVMNativeWithdrawal(masterWallet, toAddress, amount, "ETH");
      } else if (asset === "USDT") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "ETH", TOKEN_ADDRESSES.USDT_ERC20, 6);
      } else if (asset === "USDC") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "ETH", TOKEN_ADDRESSES.USDC_ERC20, 6);
      } else {
        result = { success: false, error: `Unsupported asset ${asset} on ETH network` };
      }
    } else if (network === "BNB" || network === "BEP20") {
      if (asset === "BNB") {
        result = await processEVMNativeWithdrawal(masterWallet, toAddress, amount, "BNB");
      } else if (asset === "USDT") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "BNB", TOKEN_ADDRESSES.USDT_BEP20, 18);
      } else if (asset === "USDC") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "BNB", TOKEN_ADDRESSES.USDC_BEP20, 18);
      } else {
        result = { success: false, error: `Unsupported asset ${asset} on BNB network` };
      }
    } else if (network === "MATIC" || network === "Polygon") {
      if (asset === "MATIC") {
        result = await processEVMNativeWithdrawal(masterWallet, toAddress, amount, "MATIC");
      } else if (asset === "USDT") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "MATIC", TOKEN_ADDRESSES.USDT_POLYGON, 6);
      } else if (asset === "USDC") {
        result = await processEVMTokenWithdrawal(masterWallet, toAddress, amount, "MATIC", TOKEN_ADDRESSES.USDC_POLYGON, 6);
      } else {
        result = { success: false, error: `Unsupported asset ${asset} on Polygon network` };
      }
    } else if (network === "TRX" || network === "TRC20") {
      if (asset === "TRX") {
        result = await processTronNativeWithdrawal(masterWallet, toAddress, amount);
      } else if (asset === "USDT") {
        result = await processTronTokenWithdrawal(masterWallet, toAddress, amount, TRON_TOKEN_ADDRESSES.USDT_TRC20, 6);
      } else if (asset === "USDC") {
        result = await processTronTokenWithdrawal(masterWallet, toAddress, amount, TRON_TOKEN_ADDRESSES.USDC_TRC20, 6);
      } else {
        result = { success: false, error: `Unsupported asset ${asset} on Tron network` };
      }
    } else if (network === "SOL") {
      if (asset === "SOL") {
        result = await processSolanaWithdrawal(masterWallet, toAddress, amount);
      } else {
        result = { success: false, error: `Solana SPL tokens not yet implemented` };
      }
    } else {
      result = { success: false, error: `Unsupported network: ${network}` };
    }

    // Update withdrawal status
    if (result.success && result.txHash) {
      await db.update(withdrawals)
        .set({
          status: "completed",
          txHash: result.txHash,
          completedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Record blockchain transaction
      await db.insert(blockchainTransactions).values({
        txHash: result.txHash,
        network,
        fromAddress: masterWallet.address,
        toAddress,
        amount,
        asset,
        confirmations: 0,
        status: "pending",
        type: "withdrawal",
      });

      // Send success email
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "Withdrawal Completed",
          text: `Your withdrawal of ${amount} ${asset} has been processed. Transaction Hash: ${result.txHash}`,
          html: `
            <h2>Withdrawal Completed</h2>
            <p>Your withdrawal of <strong>${amount} ${asset}</strong> has been processed.</p>
            <p><strong>Transaction Hash:</strong> ${result.txHash}</p>
            <p><strong>Network:</strong> ${network}</p>
            <p><strong>To Address:</strong> ${toAddress}</p>
            <p>Please allow time for blockchain confirmations.</p>
          `,
        });
      }

      return { success: true, txHash: result.txHash };
    } else {
      await db.update(withdrawals)
        .set({
          status: "failed",
          adminNotes: result.error || "Unknown error",
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Send failure email
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "Withdrawal Failed",
          text: `Your withdrawal of ${amount} ${asset} failed. Error: ${result.error}`,
          html: `
            <h2>Withdrawal Failed</h2>
            <p>Your withdrawal of <strong>${amount} ${asset}</strong> could not be processed.</p>
            <p><strong>Error:</strong> ${result.error}</p>
            <p>Please contact support for assistance.</p>
          `,
        });
      }

      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error("Error processing withdrawal:", error);

    // Update withdrawal status to failed
    await db.update(withdrawals)
      .set({
        status: "failed",
        adminNotes: error.message || "Unknown error",
      })
      .where(eq(withdrawals.id, withdrawalId));

    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Process Bitcoin withdrawal
 */
async function processBitcoinWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // TODO: Implement Bitcoin withdrawal using bitcoinjs-lib
    // This requires:
    // 1. Decode private key from masterWallet.privateKey (encrypted)
    // 2. Create transaction with inputs (UTXOs) and outputs
    // 3. Sign transaction
    // 4. Broadcast to Bitcoin network
    
    return {
      success: false,
      error: "Bitcoin withdrawal not yet implemented. Requires Bitcoin Core RPC or similar service.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process EVM native token withdrawal (ETH, BNB, MATIC)
 */
async function processEVMNativeWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string,
  network: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS];
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Decrypt private key (in production, use proper encryption)
    const privateKey = masterWallet.privateKey;
    const wallet = new Wallet(privateKey, provider);

    // Check balance
    const balance = await wallet.getBalance();
    const amountWei = utils.parseEther(amount);

    if (balance.lt(amountWei)) {
      return {
        success: false,
        error: `Insufficient balance in hot wallet. Available: ${utils.formatEther(balance)} ${network}`,
      };
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
    });

    await tx.wait(1); // Wait for 1 confirmation

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process EVM token withdrawal (USDT, USDC on various chains)
 */
async function processEVMTokenWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string,
  network: string,
  tokenAddress: string,
  decimals: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS];
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Decrypt private key
    const privateKey = masterWallet.privateKey;
    const wallet = new Wallet(privateKey, provider);

    // Connect to token contract
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Check balance
    const balance = await tokenContract.balanceOf(wallet.address);
    const amountTokens = utils.parseUnits(amount, decimals);

    if (balance.lt(amountTokens)) {
      return {
        success: false,
        error: `Insufficient token balance in hot wallet. Available: ${utils.formatUnits(balance, decimals)}`,
      };
    }

    // Send tokens
    const tx = await tokenContract.transfer(toAddress, amountTokens);
    await tx.wait(1); // Wait for 1 confirmation

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process Tron native withdrawal (TRX)
 */
async function processTronNativeWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const tronWeb = new (TronWeb as any)({
      fullHost: RPC_ENDPOINTS.TRX,
      privateKey: masterWallet.privateKey,
    });

    // Check balance
    const balance = await tronWeb.trx.getBalance(masterWallet.address);
    const amountSun = parseFloat(amount) * 1000000; // TRX has 6 decimals

    if (balance < amountSun) {
      return {
        success: false,
        error: `Insufficient balance in hot wallet. Available: ${balance / 1000000} TRX`,
      };
    }

    // Send transaction
    const tx = await tronWeb.trx.sendTransaction(toAddress, amountSun);

    if (tx.result) {
      return { success: true, txHash: tx.txid };
    } else {
      return { success: false, error: "Transaction failed" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process Tron token withdrawal (USDT TRC20, USDC TRC20)
 */
async function processTronTokenWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string,
  tokenAddress: string,
  decimals: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const tronWeb = new (TronWeb as any)({
      fullHost: RPC_ENDPOINTS.TRX,
      privateKey: masterWallet.privateKey,
    });

    // Connect to token contract
    const contract = await tronWeb.contract().at(tokenAddress);

    // Check balance
    const balance = await contract.balanceOf(masterWallet.address).call();
    const amountTokens = parseFloat(amount) * Math.pow(10, decimals);

    if (balance < amountTokens) {
      return {
        success: false,
        error: `Insufficient token balance in hot wallet. Available: ${balance / Math.pow(10, decimals)}`,
      };
    }

    // Send tokens
    const tx = await contract.transfer(toAddress, amountTokens).send();

    return { success: true, txHash: tx };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process Solana withdrawal (SOL)
 */
async function processSolanaWithdrawal(
  masterWallet: any,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const connection = new Connection(RPC_ENDPOINTS.SOL, "confirmed");

    // Decode private key (assuming it's base58 encoded)
    const privateKeyBytes = Uint8Array.from(Buffer.from(masterWallet.privateKey, "base64"));
    const fromKeypair = Keypair.fromSecretKey(privateKeyBytes);

    // Check balance
    const balance = await connection.getBalance(fromKeypair.publicKey);
    const amountLamports = parseFloat(amount) * 1000000000; // SOL has 9 decimals

    if (balance < amountLamports) {
      return {
        success: false,
        error: `Insufficient balance in hot wallet. Available: ${balance / 1000000000} SOL`,
      };
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amountLamports,
      })
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);

    return { success: true, txHash: signature };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check hot wallet balance
 */
export async function checkHotWalletBalance(network: string, asset: string): Promise<{ balance: string; error?: string }> {
  const db = await getDb();
  if (!db) return { balance: "0", error: "Database connection failed" };

  try {
    const [masterWallet] = await db.select()
      .from(masterWallets)
      .where(and(
        eq(masterWallets.network, network),
        eq(masterWallets.isActive, true)
      ))
      .limit(1);

    if (!masterWallet) {
      return { balance: "0", error: "No active master wallet found" };
    }

    // Check balance based on network
    if (network === "ETH" || network === "BNB" || network === "MATIC") {
      const rpcUrl = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS];
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      if (asset === network) {
        // Native token
        const balance = await provider.getBalance(masterWallet.address);
        return { balance: utils.formatEther(balance) };
      } else {
        // ERC20 token
        const tokenAddress = TOKEN_ADDRESSES[`${asset}_${network === "ETH" ? "ERC20" : network === "BNB" ? "BEP20" : "POLYGON"}` as keyof typeof TOKEN_ADDRESSES];
        if (!tokenAddress) {
          return { balance: "0", error: "Token address not found" };
        }

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(masterWallet.address);
        const decimals = asset === "USDT" || asset === "USDC" ? 6 : 18;
        return { balance: utils.formatUnits(balance, decimals) };
      }
    } else if (network === "TRX" || network === "TRC20") {
      const tronWeb = new (TronWeb as any)({
        fullHost: RPC_ENDPOINTS.TRX,
      });

      if (asset === "TRX") {
        const balance = await tronWeb.trx.getBalance(masterWallet.address);
        return { balance: (balance / 1000000).toString() };
      } else {
        const tokenAddress = TRON_TOKEN_ADDRESSES[`${asset}_TRC20` as keyof typeof TRON_TOKEN_ADDRESSES];
        if (!tokenAddress) {
          return { balance: "0", error: "Token address not found" };
        }

        const contract = await tronWeb.contract().at(tokenAddress);
        const balance = await contract.balanceOf(masterWallet.address).call();
        const decimals = 6;
        return { balance: (balance / Math.pow(10, decimals)).toString() };
      }
    } else if (network === "SOL") {
      const connection = new Connection(RPC_ENDPOINTS.SOL, "confirmed");
      const publicKey = new PublicKey(masterWallet.address);
      const balance = await connection.getBalance(publicKey);
      return { balance: (balance / 1000000000).toString() };
    }

    return { balance: "0", error: "Unsupported network" };
  } catch (error: any) {
    return { balance: "0", error: error.message };
  }
}
