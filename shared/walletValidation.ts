/**
 * Wallet Address Validation Utilities
 * 
 * Provides validation functions for cryptocurrency wallet addresses
 * across multiple networks (BTC, ETH, BNB, SOL, MATIC, TRX)
 */

export type Network = 'BTC' | 'ETH' | 'BNB' | 'SOL' | 'MATIC' | 'TRX';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  network?: Network;
  addressType?: string;
}

/**
 * Validate Bitcoin address (Legacy, SegWit, Native SegWit)
 */
export function validateBitcoinAddress(address: string): ValidationResult {
  // Remove whitespace
  address = address.trim();
  
  // Legacy P2PKH (starts with 1)
  const legacyRegex = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // P2SH (starts with 3)
  const p2shRegex = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  
  // Bech32 Native SegWit (starts with bc1)
  const bech32Regex = /^(bc1)[a-z0-9]{39,87}$/;
  
  if (legacyRegex.test(address)) {
    return { valid: true, network: 'BTC', addressType: 'Legacy P2PKH' };
  }
  
  if (p2shRegex.test(address)) {
    return { valid: true, network: 'BTC', addressType: 'P2SH' };
  }
  
  if (bech32Regex.test(address)) {
    return { valid: true, network: 'BTC', addressType: 'Native SegWit (Bech32)' };
  }
  
  return {
    valid: false,
    error: 'Invalid Bitcoin address format. Must start with 1, 3, or bc1',
  };
}

/**
 * Validate Ethereum address (also valid for BNB Chain and Polygon)
 */
export function validateEthereumAddress(address: string): ValidationResult {
  // Remove whitespace
  address = address.trim();
  
  // Ethereum address regex (0x followed by 40 hex characters)
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!ethRegex.test(address)) {
    return {
      valid: false,
      error: 'Invalid Ethereum address format. Must start with 0x followed by 40 hex characters',
    };
  }
  
  // Check for all zeros or all ones (invalid addresses)
  if (address === '0x0000000000000000000000000000000000000000') {
    return {
      valid: false,
      error: 'Invalid address: zero address',
    };
  }
  
  return { valid: true, addressType: 'EVM Address' };
}

/**
 * Validate Solana address (Base58 encoded, 32-44 characters)
 */
export function validateSolanaAddress(address: string): ValidationResult {
  // Remove whitespace
  address = address.trim();
  
  // Solana address regex (Base58, 32-44 characters)
  const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!solRegex.test(address)) {
    return {
      valid: false,
      error: 'Invalid Solana address format. Must be 32-44 Base58 characters',
    };
  }
  
  // Check for invalid characters (0, O, I, l not allowed in Base58)
  if (/[0OIl]/.test(address)) {
    return {
      valid: false,
      error: 'Invalid Solana address: contains invalid Base58 characters (0, O, I, l)',
    };
  }
  
  return { valid: true, network: 'SOL', addressType: 'Solana Address' };
}

/**
 * Validate Tron address (Base58, starts with T)
 */
export function validateTronAddress(address: string): ValidationResult {
  // Remove whitespace
  address = address.trim();
  
  // Tron address regex (starts with T, 34 characters)
  const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
  
  if (!tronRegex.test(address)) {
    return {
      valid: false,
      error: 'Invalid Tron address format. Must start with T and be 34 characters long',
    };
  }
  
  return { valid: true, network: 'TRX', addressType: 'Tron Address' };
}

/**
 * Validate wallet address for any supported network
 */
export function validateWalletAddress(
  address: string,
  network: Network
): ValidationResult {
  switch (network) {
    case 'BTC':
      return validateBitcoinAddress(address);
    
    case 'ETH':
      const ethResult = validateEthereumAddress(address);
      return { ...ethResult, network: 'ETH' };
    
    case 'BNB':
      const bnbResult = validateEthereumAddress(address);
      return { ...bnbResult, network: 'BNB' };
    
    case 'MATIC':
      const maticResult = validateEthereumAddress(address);
      return { ...maticResult, network: 'MATIC' };
    
    case 'SOL':
      return validateSolanaAddress(address);
    
    case 'TRX':
      return validateTronAddress(address);
    
    default:
      return {
        valid: false,
        error: `Unsupported network: ${network}`,
      };
  }
}

/**
 * Get network name for display
 */
export function getNetworkName(network: Network): string {
  const names: Record<Network, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB Chain',
    SOL: 'Solana',
    MATIC: 'Polygon',
    TRX: 'Tron',
  };
  
  return names[network] || network;
}

/**
 * Get example address for network
 */
export function getExampleAddress(network: Network): string {
  const examples: Record<Network, string> = {
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    BNB: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    SOL: '7EqQdEULxWcraVx3mXKFjc84LhCkMGZCkRuDpvcMwJeK',
    MATIC: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    TRX: 'TRX9dKWHkN2BRvyJxDvGNSJXvJqXjNhqVq',
  };
  
  return examples[network] || '';
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2) {
    return address;
  }
  
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Check if address is likely a testnet address
 */
export function isTestnetAddress(address: string, network: Network): boolean {
  switch (network) {
    case 'BTC':
      // Bitcoin testnet addresses start with m, n, or tb1
      return /^[mn2]/.test(address) || /^tb1/.test(address);
    
    case 'TRX':
      // Tron testnet addresses start with 2
      return address.startsWith('2');
    
    default:
      // For EVM chains and Solana, testnet addresses look the same as mainnet
      return false;
  }
}

/**
 * Batch validate multiple addresses
 */
export function validateAddressBatch(
  addresses: Array<{ address: string; network: Network }>
): Array<ValidationResult & { address: string }> {
  return addresses.map(({ address, network }) => ({
    address,
    ...validateWalletAddress(address, network),
  }));
}
