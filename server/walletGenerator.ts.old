import { ethers } from "ethers";
import crypto from "crypto";

const MASTER_SEED = process.env.WALLET_MASTER_SEED || "bitchange-pro-master-seed-change-in-production";

export function generateWalletAddress(userId: number, asset: string, network: string): string {
  const seed = `${MASTER_SEED}-${userId}-${asset}-${network}`;
  const hash = crypto.createHash("sha256").update(seed).digest("hex");

  // Ethereum, BSC, Polygon, Avalanche (tutti usano stesso formato address)
  if (["ethereum", "bsc", "polygon", "avalanche"].includes(network)) {
    const wallet = new ethers.Wallet("0x" + hash);
    return wallet.address;
  }

  // Bitcoin
  if (network === "bitcoin") {
    const btcHash = crypto.createHash("sha256").update(`btc-${seed}`).digest("hex");
    return `bc1q${btcHash.substring(0, 38)}`;
  }

  // Tron (TRC20)
  if (network === "tron") {
    const tronHash = crypto.createHash("sha256").update(`tron-${seed}`).digest("hex");
    return `T${tronHash.substring(0, 33)}`;
  }

  // Solana
  if (network === "solana") {
    const solHash = crypto.createHash("sha256").update(`sol-${seed}`).digest("hex");
    return solHash.substring(0, 44);
  }

  // Cardano
  if (network === "cardano") {
    const adaHash = crypto.createHash("sha256").update(`ada-${seed}`).digest("hex");
    return `addr1${adaHash.substring(0, 54)}`;
  }

  // Ripple
  if (network === "ripple") {
    const xrpHash = crypto.createHash("sha256").update(`xrp-${seed}`).digest("hex");
    return `r${xrpHash.substring(0, 33)}`;
  }

  // Polkadot
  if (network === "polkadot") {
    const dotHash = crypto.createHash("sha256").update(`dot-${seed}`).digest("hex");
    return `1${dotHash.substring(0, 46)}`;
  }

  // Dogecoin
  if (network === "dogecoin") {
    const dogeHash = crypto.createHash("sha256").update(`doge-${seed}`).digest("hex");
    return `D${dogeHash.substring(0, 33)}`;
  }

  // Litecoin
  if (network === "litecoin") {
    const ltcHash = crypto.createHash("sha256").update(`ltc-${seed}`).digest("hex");
    return `ltc1q${ltcHash.substring(0, 38)}`;
  }

  // Stellar
  if (network === "stellar") {
    const xlmHash = crypto.createHash("sha256").update(`xlm-${seed}`).digest("hex");
    return `G${xlmHash.substring(0, 55)}`;
  }

  // Fallback: Ethereum address
  const wallet = new ethers.Wallet("0x" + hash);
  return wallet.address;
}

export function isValidAddress(address: string, network: string): boolean {
  try {
    if (["ethereum", "bsc", "polygon", "avalanche"].includes(network)) {
      return ethers.isAddress(address);
    }
    if (network === "bitcoin") {
      return address.startsWith("bc1q") && address.length >= 42;
    }
    if (network === "tron") {
      return address.startsWith("T") && address.length === 34;
    }
    if (network === "solana") {
      return address.length === 44;
    }
    if (network === "cardano") {
      return address.startsWith("addr1") && address.length >= 59;
    }
    if (network === "ripple") {
      return address.startsWith("r") && address.length === 34;
    }
    if (network === "polkadot") {
      return address.startsWith("1") && address.length === 47;
    }
    if (network === "dogecoin") {
      return address.startsWith("D") && address.length === 34;
    }
    if (network === "litecoin") {
      return address.startsWith("ltc1q") && address.length >= 43;
    }
    if (network === "stellar") {
      return address.startsWith("G") && address.length === 56;
    }
    return false;
  } catch {
    return false;
  }
}
