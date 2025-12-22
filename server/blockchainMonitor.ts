/**
 * Blockchain Monitoring Service
 * 
 * Monitors blockchain networks for incoming deposits and automatically
 * updates user balances when transactions are confirmed.
 * 
 * Supported networks:
 * - Bitcoin (BTC)
 * - Ethereum (ETH, USDT ERC20, USDC ERC20)
 * - Tron (TRX, USDT TRC20, USDC TRC20)
 * - Solana (SOL, USDT SPL, USDC SPL)
 * - BNB Chain (BNB, USDT BEP20, USDC BEP20)
 * - Polygon (MATIC, USDT Polygon, USDC Polygon)
 */

import { ethers, utils } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import TronWeb from "tronweb";
import { Connection, PublicKey } from "@solana/web3.js";
import { getDb } from "./db";
import { deposits, wallets, depositAddresses, blockchainTransactions, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "./email";

// Confirmation requirements per network
const CONFIRMATIONS_REQUIRED = {
  BTC: 3,
  ETH: 12,
  TRX: 19,
  SOL: 32,
  BNB: 12,
  MATIC: 128,
};

// RPC endpoints (should be in env variables in production)
const RPC_ENDPOINTS = {
  ETH: process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
  BNB: process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/",
  MATIC: process.env.MATIC_RPC_URL || "https://polygon-rpc.com/",
  TRX: process.env.TRX_RPC_URL || "https://api.trongrid.io",
  SOL: process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com",
  BTC: process.env.BTC_RPC_URL || "https://blockchain.info", // Fallback to blockchain.info API
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

/**
 * Monitor Bitcoin blockchain for deposits
 */
export async function monitorBitcoinDeposits() {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all BTC deposit addresses
    const addresses = await db.select()
      .from(depositAddresses)
      .where(eq(depositAddresses.network, "BTC"));

    for (const addr of addresses) {
      try {
        // Check balance using blockchain.info API
        const response = await fetch(`https://blockchain.info/q/addressbalance/${addr.address}`);
        const balanceSatoshis = parseInt(await response.text());
        const balanceBTC = balanceSatoshis / 100000000;

        // Check if there's a new deposit
        if (balanceBTC > 0) {
          // Get transaction details
          const txResponse = await fetch(`https://blockchain.info/rawaddr/${addr.address}`);
          const txData = await txResponse.json();

          for (const tx of txData.txs) {
            const txHash = tx.hash;
            const confirmations = tx.block_height ? (await getCurrentBlockHeight()) - tx.block_height + 1 : 0;

            // Check if we've already processed this transaction
            const [existing] = await db.select()
              .from(blockchainTransactions)
              .where(eq(blockchainTransactions.txHash, txHash))
              .limit(1);

            if (!existing && confirmations >= CONFIRMATIONS_REQUIRED.BTC) {
              // Calculate amount received to this address
              let amountReceived = 0;
              for (const output of tx.out) {
                if (output.addr === addr.address) {
                  amountReceived += output.value / 100000000;
                }
              }

              if (amountReceived > 0) {
                await processDeposit({
                  userId: addr.userId,
                  asset: "BTC",
                  amount: amountReceived.toString(),
                  txHash,
                  confirmations,
                  network: "BTC",
                  address: addr.address,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error monitoring BTC address ${addr.address}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in monitorBitcoinDeposits:", error);
  }
}

async function getCurrentBlockHeight(): Promise<number> {
  const response = await fetch("https://blockchain.info/q/getblockcount");
  return parseInt(await response.text());
}

/**
 * Monitor Ethereum blockchain for deposits (ETH, USDT ERC20, USDC ERC20)
 */
export async function monitorEthereumDeposits() {
  const db = await getDb();
  if (!db) return;

  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.ETH);

  try {
    // Monitor ETH deposits
    await monitorEVMNativeDeposits(db, provider, "ETH", "ETH");

    // Monitor USDT ERC20 deposits
    await monitorEVMTokenDeposits(db, provider, "USDT", "ERC20", TOKEN_ADDRESSES.USDT_ERC20);

    // Monitor USDC ERC20 deposits
    await monitorEVMTokenDeposits(db, provider, "USDC", "ERC20", TOKEN_ADDRESSES.USDC_ERC20);
  } catch (error) {
    console.error("Error in monitorEthereumDeposits:", error);
  }
}

/**
 * Monitor BNB Chain for deposits
 */
export async function monitorBNBDeposits() {
  const db = await getDb();
  if (!db) return;

  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.BNB);

  try {
    // Monitor BNB deposits
    await monitorEVMNativeDeposits(db, provider, "BNB", "BNB");

    // Monitor USDT BEP20 deposits
    await monitorEVMTokenDeposits(db, provider, "USDT", "BEP20", TOKEN_ADDRESSES.USDT_BEP20);

    // Monitor USDC BEP20 deposits
    await monitorEVMTokenDeposits(db, provider, "USDC", "BEP20", TOKEN_ADDRESSES.USDC_BEP20);
  } catch (error) {
    console.error("Error in monitorBNBDeposits:", error);
  }
}

/**
 * Monitor Polygon for deposits
 */
export async function monitorPolygonDeposits() {
  const db = await getDb();
  if (!db) return;

  const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.MATIC);

  try {
    // Monitor MATIC deposits
    await monitorEVMNativeDeposits(db, provider, "MATIC", "MATIC");

    // Monitor USDT Polygon deposits
    await monitorEVMTokenDeposits(db, provider, "USDT", "Polygon", TOKEN_ADDRESSES.USDT_POLYGON);

    // Monitor USDC Polygon deposits
    await monitorEVMTokenDeposits(db, provider, "USDC", "Polygon", TOKEN_ADDRESSES.USDC_POLYGON);
  } catch (error) {
    console.error("Error in monitorPolygonDeposits:", error);
  }
}

/**
 * Generic EVM native token monitoring (ETH, BNB, MATIC)
 */
async function monitorEVMNativeDeposits(
  db: any,
  provider: ethers.providers.JsonRpcProvider,
  asset: string,
  network: string
) {
  const addresses = await db.select()
    .from(depositAddresses)
    .where(eq(depositAddresses.network, network));

  const currentBlock = await provider.getBlockNumber();

  for (const addr of addresses) {
    try {
      const balance = await provider.getBalance(addr.address);
      const balanceEther = utils.formatEther(balance);

      if (parseFloat(balanceEther) > 0) {
        // Get recent transactions using getLogs
        // Note: This is a simplified version. In production, use event logs or indexer service like Etherscan API
        const fromBlock = Math.max(0, currentBlock - 1000); // Last ~1000 blocks
        
        try {
          const logs = await provider.getLogs({
            fromBlock,
            toBlock: currentBlock,
          });

          // Filter logs for transactions to this address
          for (const log of logs) {
            if (!log.blockNumber) continue;

            // Get transaction details
            const tx = await provider.getTransaction(log.transactionHash);
            if (!tx || !tx.to || tx.to.toLowerCase() !== addr.address.toLowerCase()) continue;

            const confirmations = currentBlock - log.blockNumber + 1;
            const requiredConf = CONFIRMATIONS_REQUIRED[network as keyof typeof CONFIRMATIONS_REQUIRED];

            // Check if we've already processed this transaction
            const [existing] = await db.select()
              .from(blockchainTransactions)
              .where(eq(blockchainTransactions.txHash, tx.hash))
              .limit(1);

            if (!existing && confirmations >= requiredConf) {
              const amount = utils.formatEther(tx.value);

              if (parseFloat(amount) > 0) {
                await processDeposit({
                  userId: addr.userId,
                  asset,
                  amount,
                  txHash: tx.hash,
                  confirmations,
                  network,
                  address: addr.address,
                });
              }
            }
          }
        } catch (logError) {
          // If getLogs fails, skip this address for now
          console.error(`Error getting logs for ${addr.address}:`, logError);
        }
      }
    } catch (error) {
      console.error(`Error monitoring ${network} address ${addr.address}:`, error);
    }
  }
}

/**
 * Generic EVM token monitoring (USDT, USDC on various chains)
 */
async function monitorEVMTokenDeposits(
  db: any,
  provider: ethers.providers.JsonRpcProvider,
  asset: string,
  network: string,
  tokenAddress: string
) {
  const addresses = await db.select()
    .from(depositAddresses)
    .where(eq(depositAddresses.network, network));

  const tokenContract = new ethers.Contract(
    tokenAddress,
    ["function balanceOf(address) view returns (uint256)", "event Transfer(address indexed from, address indexed to, uint256 value)"],
    provider
  );

  const currentBlock = await provider.getBlockNumber();

  for (const addr of addresses) {
    try {
      const balance = await tokenContract.balanceOf(addr.address);
      const decimals = asset === "USDT" || asset === "USDC" ? 6 : 18;
      const balanceFormatted = utils.formatUnits(balance, decimals);

      if (parseFloat(balanceFormatted) > 0) {
        // Get transfer events to this address
        const filter = tokenContract.filters.Transfer(null, addr.address);
        const events = await tokenContract.queryFilter(filter, currentBlock - 1000, currentBlock);

        for (const event of events) {
          if (!event.blockNumber) continue;

          const confirmations = currentBlock - event.blockNumber + 1;
          const requiredConf = CONFIRMATIONS_REQUIRED[network as keyof typeof CONFIRMATIONS_REQUIRED];

          // Check if we've already processed this transaction
          const [existing] = await db.select()
            .from(blockchainTransactions)
            .where(eq(blockchainTransactions.txHash, event.transactionHash))
            .limit(1);

          if (!existing && confirmations >= requiredConf) {
            const amount = utils.formatUnits(event.args![2], decimals);

            if (parseFloat(amount) > 0) {
              await processDeposit({
                userId: addr.userId,
                asset,
                amount,
                txHash: event.transactionHash,
                confirmations,
                network,
                address: addr.address,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error monitoring ${asset} ${network} address ${addr.address}:`, error);
    }
  }
}

/**
 * Monitor Tron blockchain for deposits
 */
export async function monitorTronDeposits() {
  const db = await getDb();
  if (!db) return;

  const tronWeb = new (TronWeb as any)({
    fullHost: RPC_ENDPOINTS.TRX,
  });

  try {
    // Monitor TRX deposits
    await monitorTronNativeDeposits(db, tronWeb);

    // Monitor USDT TRC20 deposits
    await monitorTronTokenDeposits(db, tronWeb, "USDT", TRON_TOKEN_ADDRESSES.USDT_TRC20);

    // Monitor USDC TRC20 deposits
    await monitorTronTokenDeposits(db, tronWeb, "USDC", TRON_TOKEN_ADDRESSES.USDC_TRC20);
  } catch (error) {
    console.error("Error in monitorTronDeposits:", error);
  }
}

async function monitorTronNativeDeposits(db: any, tronWeb: any) {
  const addresses = await db.select()
    .from(depositAddresses)
    .where(eq(depositAddresses.network, "TRX"));

  for (const addr of addresses) {
    try {
      const balance = await tronWeb.trx.getBalance(addr.address);
      const balanceTRX = balance / 1000000; // TRX has 6 decimals

      if (balanceTRX > 0) {
        // Get transactions
        const transactions = await tronWeb.trx.getTransactionsRelated(addr.address, "all", 20);

        for (const tx of transactions) {
          const txHash = tx.txID;

          // Check if we've already processed this transaction
          const [existing] = await db.select()
            .from(blockchainTransactions)
            .where(eq(blockchainTransactions.txHash, txHash))
            .limit(1);

          if (!existing && tx.ret && tx.ret[0].contractRet === "SUCCESS") {
            const amount = (tx.raw_data.contract[0].parameter.value.amount || 0) / 1000000;

            if (amount > 0 && tx.raw_data.contract[0].parameter.value.to_address === addr.address) {
              // Get confirmations
              const currentBlock = await tronWeb.trx.getCurrentBlock();
              const txBlock = tx.blockNumber || 0;
              const confirmations = currentBlock.block_header.raw_data.number - txBlock + 1;

              if (confirmations >= CONFIRMATIONS_REQUIRED.TRX) {
                await processDeposit({
                  userId: addr.userId,
                  asset: "TRX",
                  amount: amount.toString(),
                  txHash,
                  confirmations,
                  network: "TRX",
                  address: addr.address,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error monitoring TRX address ${addr.address}:`, error);
    }
  }
}

async function monitorTronTokenDeposits(db: any, tronWeb: any, asset: string, tokenAddress: string) {
  const addresses = await db.select()
    .from(depositAddresses)
    .where(eq(depositAddresses.network, "TRC20"));

  for (const addr of addresses) {
    try {
      const contract = await tronWeb.contract().at(tokenAddress);
      const balance = await contract.balanceOf(addr.address).call();
      const decimals = asset === "USDT" || asset === "USDC" ? 6 : 18;
      const balanceFormatted = balance.toString() / Math.pow(10, decimals);

      if (balanceFormatted > 0) {
        // Get TRC20 transactions
        const transactions = await tronWeb.trx.getTransactionsRelated(addr.address, "all", 20);

        for (const tx of transactions) {
          if (tx.raw_data.contract[0].type !== "TriggerSmartContract") continue;

          const txHash = tx.txID;

          // Check if we've already processed this transaction
          const [existing] = await db.select()
            .from(blockchainTransactions)
            .where(eq(blockchainTransactions.txHash, txHash))
            .limit(1);

          if (!existing && tx.ret && tx.ret[0].contractRet === "SUCCESS") {
            // Parse transfer event (simplified)
            const amount = 0; // TODO: Parse from event logs

            if (amount > 0) {
              const currentBlock = await tronWeb.trx.getCurrentBlock();
              const txBlock = tx.blockNumber || 0;
              const confirmations = currentBlock.block_header.raw_data.number - txBlock + 1;

              if (confirmations >= CONFIRMATIONS_REQUIRED.TRX) {
                await processDeposit({
                  userId: addr.userId,
                  asset,
                  amount: amount.toString(),
                  txHash,
                  confirmations,
                  network: "TRC20",
                  address: addr.address,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error monitoring ${asset} TRC20 address ${addr.address}:`, error);
    }
  }
}

/**
 * Monitor Solana blockchain for deposits
 */
export async function monitorSolanaDeposits() {
  const db = await getDb();
  if (!db) return;

  const connection = new Connection(RPC_ENDPOINTS.SOL, "confirmed");

  try {
    // Monitor SOL deposits
    await monitorSolanaNativeDeposits(db, connection);

    // Monitor USDT SPL deposits
    await monitorSolanaTokenDeposits(db, connection, "USDT", SOLANA_TOKEN_ADDRESSES.USDT_SPL);

    // Monitor USDC SPL deposits
    await monitorSolanaTokenDeposits(db, connection, "USDC", SOLANA_TOKEN_ADDRESSES.USDC_SPL);
  } catch (error) {
    console.error("Error in monitorSolanaDeposits:", error);
  }
}

async function monitorSolanaNativeDeposits(db: any, connection: Connection) {
  const addresses = await db.select()
    .from(depositAddresses)
    .where(eq(depositAddresses.network, "SOL"));

  for (const addr of addresses) {
    try {
      const publicKey = new PublicKey(addr.address);
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / 1000000000; // SOL has 9 decimals

      if (balanceSOL > 0) {
        // Get recent transactions
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });

        for (const sig of signatures) {
          const txHash = sig.signature;

          // Check if we've already processed this transaction
          const [existing] = await db.select()
            .from(blockchainTransactions)
            .where(eq(blockchainTransactions.txHash, txHash))
            .limit(1);

          if (!existing && sig.confirmationStatus === "finalized") {
            const tx = await connection.getTransaction(txHash, { maxSupportedTransactionVersion: 0 });

            if (tx && tx.meta && !tx.meta.err) {
              // Calculate amount received
              const preBalance = tx.meta.preBalances[0] || 0;
              const postBalance = tx.meta.postBalances[0] || 0;
              const amount = (postBalance - preBalance) / 1000000000;

              if (amount > 0) {
                await processDeposit({
                  userId: addr.userId,
                  asset: "SOL",
                  amount: amount.toString(),
                  txHash,
                  confirmations: CONFIRMATIONS_REQUIRED.SOL,
                  network: "SOL",
                  address: addr.address,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error monitoring SOL address ${addr.address}:`, error);
    }
  }
}

async function monitorSolanaTokenDeposits(db: any, connection: Connection, asset: string, tokenMint: string) {
  // TODO: Implement SPL token monitoring
  // This requires getting token accounts and monitoring transfers
  console.log(`Monitoring ${asset} SPL deposits - not yet implemented`);
}

/**
 * Process confirmed deposit
 */
async function processDeposit(params: {
  userId: number;
  asset: string;
  amount: string;
  txHash: string;
  confirmations: number;
  network: string;
  address: string;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    // Start transaction
    await db.transaction(async (tx) => {
      // Record blockchain transaction
      await tx.insert(blockchainTransactions).values({
        txHash: params.txHash,
        network: params.network,
        fromAddress: "", // Unknown sender
        toAddress: params.address,
        amount: params.amount,
        asset: params.asset,
        confirmations: params.confirmations,
        status: "confirmed",
        type: "deposit",
      });

      // Create deposit record
      await tx.insert(deposits).values({
        userId: params.userId,
        asset: params.asset,
        amount: params.amount,
        status: "completed",
        network: params.network,
        externalId: params.txHash,
      });

      // Update user wallet balance
      const [wallet] = await tx.select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, params.userId),
          eq(wallets.asset, params.asset)
        ))
        .limit(1);

      if (wallet) {
        const newBalance = (parseFloat(wallet.balance) + parseFloat(params.amount)).toString();
        await tx.update(wallets)
          .set({ balance: newBalance })
          .where(eq(wallets.id, wallet.id));
      } else {
        // Create new wallet
        await tx.insert(wallets).values({
          userId: params.userId,
          asset: params.asset,
          balance: params.amount,
          locked: "0",
        });
      }
    });

    // Send email notification
    const [user] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
    if (user && user.email) {
      await sendEmail({
        to: user.email,
        subject: "Deposit Confirmed",
        text: `Your deposit of ${params.amount} ${params.asset} has been confirmed. Transaction Hash: ${params.txHash}`,
        html: `
          <h2>Deposit Confirmed</h2>
          <p>Your deposit of <strong>${params.amount} ${params.asset}</strong> has been confirmed.</p>
          <p><strong>Transaction Hash:</strong> ${params.txHash}</p>
          <p><strong>Network:</strong> ${params.network}</p>
          <p><strong>Confirmations:</strong> ${params.confirmations}</p>
          <p>Your balance has been updated.</p>
        `,
      });
    }

    console.log(`✅ Deposit processed: ${params.amount} ${params.asset} for user ${params.userId}`);
  } catch (error) {
    console.error("Error processing deposit:", error);
  }
}

/**
 * Main monitoring loop - runs every minute
 */
export async function runBlockchainMonitoring() {
  console.log("[Blockchain Monitor] Starting monitoring cycle...");

  try {
    await Promise.all([
      monitorBitcoinDeposits(),
      monitorEthereumDeposits(),
      monitorBNBDeposits(),
      monitorPolygonDeposits(),
      monitorTronDeposits(),
      monitorSolanaDeposits(),
    ]);

    console.log("[Blockchain Monitor] Monitoring cycle completed");
  } catch (error) {
    console.error("[Blockchain Monitor] Error in monitoring cycle:", error);
  }
}

// Start monitoring if this file is run directly
if (require.main === module) {
  console.log("Starting blockchain monitoring service...");
  
  // Run immediately
  runBlockchainMonitoring();

  // Then run every minute
  setInterval(runBlockchainMonitoring, 60 * 1000);
}
