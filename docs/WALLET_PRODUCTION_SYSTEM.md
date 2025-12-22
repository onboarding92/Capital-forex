# Wallet Production System Design

## Current Architecture Analysis

### Existing Tables
1. **wallets** - User balances (balance + locked amounts)
2. **masterWallets** - Hot wallets with private keys (encrypted)
3. **depositAddresses** - User-specific deposit addresses
4. **blockchainTransactions** - On-chain transaction tracking

### Current Flow
1. User deposits → blockchain monitoring detects → credits user wallet
2. User withdraws → locks balance → admin approves → processes from masterWallet
3. All funds stored in hot wallets (masterWallets table)

### Security Issues
- ❌ All funds in hot wallets (vulnerable to hacks)
- ❌ Private keys stored in database (encrypted but accessible)
- ❌ No cold storage separation
- ❌ No automatic sweep mechanism
- ❌ No multi-signature support
- ❌ No withdrawal limits based on hot wallet balance

---

## Production System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     COLD STORAGE (Offline)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Master Cold Wallets (95% of funds)                  │   │
│  │  - BTC: bc1q...                                      │   │
│  │  - ETH: 0x...                                        │   │
│  │  - Private keys on hardware wallets (offline)        │   │
│  │  - Manual transfers only                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ Manual Transfer
┌─────────────────────────────────────────────────────────────┐
│                     HOT WALLETS (Online)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Master Hot Wallets (5% of funds)                    │   │
│  │  - Handles withdrawals automatically                 │   │
│  │  - Balance monitoring with alerts                    │   │
│  │  - Auto-refill from cold storage (manual trigger)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑ Auto Sweep
┌─────────────────────────────────────────────────────────────┐
│                   DEPOSIT ADDRESSES (User)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  User-specific addresses (receive only)              │   │
│  │  - Automatically swept to hot wallet                 │   │
│  │  - No private keys stored (derived from master)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database Schema Updates

Add new tables and fields:

```sql
-- Cold wallet configuration (addresses only, no private keys)
CREATE TABLE coldWallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL UNIQUE,
  asset VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  balance DECIMAL(20, 8) DEFAULT 0,
  lastVerifiedAt TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sweep configuration and history
CREATE TABLE sweepTransactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fromAddress VARCHAR(255) NOT NULL,
  toAddress VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL,
  asset VARCHAR(20) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  txHash VARCHAR(255),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  type ENUM('deposit_to_hot', 'hot_to_cold', 'cold_to_hot') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP
);

-- Hot wallet balance thresholds
CREATE TABLE walletThresholds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  network VARCHAR(50) NOT NULL UNIQUE,
  asset VARCHAR(20) NOT NULL,
  minBalance DECIMAL(20, 8) NOT NULL, -- Alert when below this
  maxBalance DECIMAL(20, 8) NOT NULL, -- Sweep to cold when above this
  targetBalance DECIMAL(20, 8) NOT NULL, -- Ideal operating balance
  alertEmail VARCHAR(320),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Update masterWallets table
ALTER TABLE masterWallets 
  ADD COLUMN walletType ENUM('hot', 'deposit_generator') DEFAULT 'hot',
  ADD COLUMN minBalance DECIMAL(20, 8) DEFAULT 0,
  ADD COLUMN maxBalance DECIMAL(20, 8) DEFAULT 0;
```

### Phase 2: Backend Modules

#### 1. Cold Wallet Manager (`server/coldWalletManager.ts`)
```typescript
// Read-only cold wallet management
export async function getColdWallets()
export async function addColdWallet(network, address)
export async function verifyColdWalletBalance(network)
export async function getColdWalletBalance(network, asset)
```

#### 2. Sweep System (`server/sweepSystem.ts`)
```typescript
// Automatic sweep from deposit addresses to hot wallet
export async function sweepDepositAddress(depositAddressId)
export async function sweepAllPendingDeposits()

// Manual sweep from hot to cold (admin triggered)
export async function sweepHotToCold(network, amount)

// Manual refill from cold to hot (admin triggered)
export async function refillHotWallet(network, amount)
```

#### 3. Balance Monitor (`server/balanceMonitor.ts`)
```typescript
// Monitor hot wallet balances and send alerts
export async function checkHotWalletBalances()
export async function sendLowBalanceAlert(network, currentBalance, threshold)
export async function sendHighBalanceAlert(network, currentBalance, threshold)
```

#### 4. Withdrawal Security (`server/withdrawalSecurity.ts`)
```typescript
// Enhanced withdrawal checks
export async function checkWithdrawalLimits(userId, amount, asset)
export async function requireManualApproval(amount, asset) // Large amounts
export async function checkHotWalletCapacity(network, amount)
```

### Phase 3: Admin UI

#### 1. Wallet Management Dashboard (`client/src/pages/admin/WalletManagement.tsx`)
- View cold wallet addresses and balances
- View hot wallet balances with threshold indicators
- Manual sweep controls (hot → cold, cold → hot)
- Balance history charts
- Alert configuration

#### 2. Sweep History (`client/src/pages/admin/SweepHistory.tsx`)
- List all sweep transactions
- Filter by type, status, network
- Retry failed sweeps
- Export to CSV

#### 3. Threshold Configuration (`client/src/pages/admin/WalletThresholds.tsx`)
- Set min/max/target balances for each network
- Configure alert emails
- Test alert system

### Phase 4: Automation

#### 1. Background Jobs
```typescript
// server/jobs/walletJobs.ts
setInterval(async () => {
  await sweepAllPendingDeposits(); // Every 10 minutes
  await checkHotWalletBalances(); // Every 5 minutes
}, 300000);
```

#### 2. Webhook Notifications
- Send alerts to admin when:
  - Hot wallet balance below minimum
  - Hot wallet balance above maximum
  - Large withdrawal requested (>$10k)
  - Sweep transaction failed

---

## Security Best Practices

### Cold Wallet Security
1. ✅ Store private keys on hardware wallets (Ledger, Trezor)
2. ✅ Use multi-signature wallets (2-of-3 or 3-of-5)
3. ✅ Keep hardware wallets in physical safe
4. ✅ Store backup phrases in separate secure locations
5. ✅ Never connect hardware wallets to internet-connected computers
6. ✅ Use air-gapped computers for signing transactions

### Hot Wallet Security
1. ✅ Encrypt private keys with AES-256
2. ✅ Store encryption keys in environment variables (not in database)
3. ✅ Use separate hot wallets for each blockchain
4. ✅ Keep only 5-10% of total funds in hot wallets
5. ✅ Monitor balances 24/7 with automated alerts
6. ✅ Implement rate limiting on withdrawals
7. ✅ Require manual approval for large withdrawals

### Operational Security
1. ✅ Regular security audits
2. ✅ Penetration testing
3. ✅ Bug bounty program
4. ✅ Insurance coverage for hot wallet funds
5. ✅ Incident response plan
6. ✅ Regular backup and disaster recovery drills

---

## Implementation Timeline

### Week 1: Database & Backend
- [ ] Add new tables (coldWallets, sweepTransactions, walletThresholds)
- [ ] Create coldWalletManager.ts module
- [ ] Create sweepSystem.ts module
- [ ] Create balanceMonitor.ts module
- [ ] Update withdrawal processor with security checks

### Week 2: Admin UI
- [ ] Create WalletManagement dashboard
- [ ] Create SweepHistory page
- [ ] Create WalletThresholds configuration page
- [ ] Add tRPC endpoints for all wallet operations

### Week 3: Testing & Automation
- [ ] Test sweep system on testnet
- [ ] Test balance monitoring and alerts
- [ ] Implement background jobs
- [ ] Load testing with simulated deposits/withdrawals

### Week 4: Production Deployment
- [ ] Set up hardware wallets for cold storage
- [ ] Transfer 95% of funds to cold wallets
- [ ] Configure hot wallet thresholds
- [ ] Enable automated sweeping
- [ ] Monitor for 1 week with manual oversight

---

## Cost Estimates

### Hardware
- 3x Ledger Nano X: $450
- 2x Trezor Model T: $400
- Physical safe: $500
- **Total: $1,350**

### Operational
- Insurance (optional): $5,000-50,000/year
- Security audit: $10,000-50,000 one-time
- Penetration testing: $5,000-20,000/year

### Development
- Implementation: 160 hours @ $100/hr = $16,000
- Testing & QA: 40 hours @ $100/hr = $4,000
- **Total: $20,000**

---

## Risk Mitigation

### Risk: Hot wallet compromised
- **Impact**: Loss of 5% of funds (~$50k if $1M TVL)
- **Mitigation**: 
  - Insurance coverage
  - Immediate detection and freeze
  - Move remaining funds to new hot wallet
  - Refund affected users

### Risk: Cold wallet lost/stolen
- **Impact**: Loss of 95% of funds
- **Mitigation**:
  - Multi-signature (requires 2-3 keys)
  - Backup phrases in separate locations
  - Regular verification of access

### Risk: Sweep system fails
- **Impact**: Deposits not credited, withdrawals delayed
- **Mitigation**:
  - Manual fallback process
  - Alert system for failed sweeps
  - Retry mechanism with exponential backoff

---

## Success Metrics

1. **Security**
   - Zero hot wallet breaches
   - 100% of cold wallet funds secure
   - All withdrawals processed within SLA

2. **Efficiency**
   - 95%+ of deposits swept within 10 minutes
   - Hot wallet balance within target range 99% of time
   - <1% failed sweep transactions

3. **User Experience**
   - Deposits credited within 15 minutes
   - Withdrawals processed within 1 hour
   - Zero user funds lost

---

Last Updated: December 21, 2025
