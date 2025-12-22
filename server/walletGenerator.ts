/**
 * Wallet Generation Service
 * 
 * Generates real cryptocurrency wallet addresses using proper crypto libraries.
 * Supports BTC, ETH, TRX, BNB, SOL, MATIC and their tokens (ERC20, TRC20, BEP20).
 */

import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";
import TronWeb from "tronweb";
const { TronWeb: TronWebClass } = TronWeb as any;
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import * as bip32 from "bip32";
import * as ecc from "tiny-secp256k1";
import crypto from "crypto";

// Initialize BIP32 with tiny-secp256k1
const BIP32 = bip32.BIP32Factory(ecc);

// Encryption key (should be stored in env variable in production)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "change-this-to-secure-32-byte-key!";

/**
 * Encrypt sensitive data using AES-256-GCM
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString("hex"),
    encrypted,
    authTag: authTag.toString("hex"),
  });
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData: string): string {
  const { iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Generate BTC wallet (Native SegWit - bc1...)
 */
export function generateBTCWallet() {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = BIP32.fromSeed(seed);
  
  // BIP84 path for Native SegWit (bc1...)
  const path = "m/84'/0'/0'/0/0";
  const child = root.derivePath(path);
  
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  
  if (!address) throw new Error("Failed to generate BTC address");
  
  const privateKey = child.toWIF();
  
  return {
    address,
    privateKey,
    mnemonic,
    derivationPath: path,
    encryptedPrivateKey: encrypt(privateKey),
    encryptedMnemonic: encrypt(mnemonic),
  };
}

/**
 * Generate ETH wallet (also works for ERC20 tokens)
 */
export function generateETHWallet() {
  const wallet = ethers.Wallet.createRandom();
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
    derivationPath: wallet.mnemonic?.path || "m/44'/60'/0'/0/0",
    encryptedPrivateKey: encrypt(wallet.privateKey),
    encryptedMnemonic: encrypt(wallet.mnemonic?.phrase || ""),
  };
}

/**
 * Generate TRX wallet (also works for TRC20 tokens)
 */
export async function generateTRXWallet() {
  // Use default export directly
  const tronWeb = TronWeb as any;
  
  // Generate random account
  const account = tronWeb.utils.accounts.generateAccount();
  
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
    mnemonic: "", // TronWeb doesn't generate mnemonic by default
    derivationPath: "",
    encryptedPrivateKey: encrypt(account.privateKey),
    encryptedMnemonic: "",
  };
}

/**
 * Generate SOL wallet
 */
export function generateSOLWallet() {
  const keypair = Keypair.generate();
  const privateKey = Buffer.from(keypair.secretKey).toString("hex");
  
  return {
    address: keypair.publicKey.toBase58(),
    privateKey,
    mnemonic: "", // Solana uses keypair, not mnemonic by default
    derivationPath: "",
    encryptedPrivateKey: encrypt(privateKey),
    encryptedMnemonic: "",
  };
}

/**
 * Generate BNB wallet (BEP20 - same as ETH)
 */
export function generateBNBWallet() {
  // BNB Smart Chain uses same address format as Ethereum
  return generateETHWallet();
}

/**
 * Generate MATIC wallet (Polygon - same as ETH)
 */
export function generateMATICWallet() {
  // Polygon uses same address format as Ethereum
  return generateETHWallet();
}

/**
 * Derive address from master wallet using HD derivation
 */
export function deriveETHAddress(mnemonic: string, index: number) {
  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    derivationPath: path,
    derivationIndex: index,
  };
}

/**
 * Derive BTC address from master wallet
 */
export function deriveBTCAddress(mnemonic: string, index: number) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = BIP32.fromSeed(seed);
  
  const path = `m/84'/0'/0'/0/${index}`;
  const child = root.derivePath(path);
  
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  
  if (!address) throw new Error("Failed to derive BTC address");
  
  return {
    address,
    privateKey: child.toWIF(),
    derivationPath: path,
    derivationIndex: index,
  };
}

/**
 * Validate cryptocurrency address format
 */
export function validateAddress(address: string, network: string): boolean {
  try {
    switch (network.toUpperCase()) {
      case "BTC":
        // BTC addresses start with 1, 3, or bc1
        return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
      
      case "ETH":
      case "BNB":
      case "MATIC":
        // ETH addresses are 42 chars starting with 0x
        return /^0x[a-fA-F0-9]{40}$/.test(address) && ethers.utils.isAddress(address);
      
      case "TRX":
        // TRX addresses start with T and are 34 chars
        return /^T[a-zA-Z0-9]{33}$/.test(address);
      
      case "SOL":
        // SOL addresses are base58, 32-44 chars
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Get network type from asset
 */
export function getNetworkFromAsset(asset: string, networkHint?: string): string {
  // If network hint provided, use it
  if (networkHint) return networkHint;
  
  // Otherwise infer from asset
  switch (asset.toUpperCase()) {
    case "BTC":
      return "BTC";
    case "ETH":
      return "ETH";
    case "TRX":
      return "TRX";
    case "BNB":
      return "BNB";
    case "SOL":
      return "SOL";
    case "MATIC":
      return "MATIC";
    case "USDT":
    case "USDC":
      // Default to ETH for stablecoins if no hint
      return "ETH";
    default:
      return "ETH";
  }
}

export { encrypt, decrypt };


/**
 * Main wallet generation function (backward compatible)
 * Generates address based on network type
 */
export async function generateWalletAddress(userId: number, asset: string, network: string): Promise<string> {
  const networkUpper = network.toUpperCase();
  
  try {
    switch (networkUpper) {
      case "BTC":
      case "BITCOIN":
        return generateBTCWallet().address;
      
      case "ETH":
      case "ETHEREUM":
      case "ERC20":
        return generateETHWallet().address;
      
      case "TRX":
      case "TRON":
      case "TRC20":
        const trxWallet = await generateTRXWallet();
        return trxWallet.address;
      
      case "BNB":
      case "BSC":
      case "BEP20":
        return generateBNBWallet().address;
      
      case "SOL":
      case "SOLANA":
        return generateSOLWallet().address;
      
      case "MATIC":
      case "POLYGON":
        return generateMATICWallet().address;
      
      default:
        // Default to ETH for unknown networks
        return generateETHWallet().address;
    }
  } catch (error) {
    console.error(`Error generating wallet for ${network}:`, error);
    throw new Error(`Failed to generate ${network} wallet address`);
  }
}

/**
 * Legacy compatibility: isValidAddress
 */
export function isValidAddress(address: string, network: string): boolean {
  return validateAddress(address, network);
}
