/**
 * Testnet Configuration
 * 
 * This file contains RPC endpoints and configuration for testnet environments.
 * Set TESTNET_MODE=true in .env to enable testnet mode.
 */

export const TESTNET_MODE = process.env.TESTNET_MODE === 'true';

export const NETWORK_CONFIG = {
  BTC: {
    mainnet: {
      rpc: process.env.BTC_RPC_URL || 'https://blockchain.info',
      explorer: 'https://blockchain.info',
    },
    testnet: {
      rpc: process.env.BTC_TESTNET_RPC_URL || 'https://blockstream.info/testnet/api',
      explorer: 'https://blockstream.info/testnet',
      faucet: 'https://testnet-faucet.mempool.co',
    },
  },
  ETH: {
    mainnet: {
      rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      explorer: 'https://etherscan.io',
    },
    testnet: {
      rpc: process.env.ETH_TESTNET_RPC_URL || 'https://rpc.ankr.com/eth_sepolia',
      explorer: 'https://sepolia.etherscan.io',
      faucet: 'https://sepoliafaucet.com',
    },
  },
  TRX: {
    mainnet: {
      rpc: process.env.TRX_RPC_URL || 'https://api.trongrid.io',
      explorer: 'https://tronscan.org',
    },
    testnet: {
      rpc: process.env.TRX_TESTNET_RPC_URL || 'https://api.shasta.trongrid.io',
      explorer: 'https://shasta.tronscan.org',
      faucet: 'https://www.trongrid.io/faucet',
    },
  },
  SOL: {
    mainnet: {
      rpc: process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com',
      explorer: 'https://explorer.solana.com',
    },
    testnet: {
      rpc: process.env.SOL_TESTNET_RPC_URL || 'https://api.devnet.solana.com',
      explorer: 'https://explorer.solana.com/?cluster=devnet',
      faucet: 'https://faucet.solana.com',
    },
  },
  BNB: {
    mainnet: {
      rpc: process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org',
      explorer: 'https://bscscan.com',
    },
    testnet: {
      rpc: process.env.BNB_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      explorer: 'https://testnet.bscscan.com',
      faucet: 'https://testnet.binance.org/faucet-smart',
    },
  },
  MATIC: {
    mainnet: {
      rpc: process.env.MATIC_RPC_URL || 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com',
    },
    testnet: {
      rpc: process.env.MATIC_TESTNET_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      explorer: 'https://mumbai.polygonscan.com',
      faucet: 'https://faucet.polygon.technology',
    },
  },
};

/**
 * Get RPC endpoint for a network
 */
export function getRpcUrl(network: keyof typeof NETWORK_CONFIG): string {
  const config = NETWORK_CONFIG[network];
  if (!config) throw new Error(`Unknown network: ${network}`);
  
  return TESTNET_MODE ? config.testnet.rpc : config.mainnet.rpc;
}

/**
 * Get explorer URL for a network
 */
export function getExplorerUrl(network: keyof typeof NETWORK_CONFIG): string {
  const config = NETWORK_CONFIG[network];
  if (!config) throw new Error(`Unknown network: ${network}`);
  
  return TESTNET_MODE ? config.testnet.explorer : config.mainnet.explorer;
}

/**
 * Get faucet URL for a testnet
 */
export function getFaucetUrl(network: keyof typeof NETWORK_CONFIG): string | null {
  const config = NETWORK_CONFIG[network];
  if (!config || !TESTNET_MODE) return null;
  
  return config.testnet.faucet;
}

/**
 * Get minimum confirmations required for a network
 * Testnet requires fewer confirmations for faster testing
 */
export function getRequiredConfirmations(network: string): number {
  if (TESTNET_MODE) {
    return network === 'BTC' ? 1 : 3; // Faster confirmations in testnet
  }
  
  // Mainnet confirmation requirements
  switch (network) {
    case 'BTC': return 6;
    case 'ETH': return 12;
    case 'TRX': return 19;
    case 'SOL': return 32;
    case 'BNB': return 15;
    case 'MATIC': return 128;
    default: return 12;
  }
}
