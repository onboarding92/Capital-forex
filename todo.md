# Capital Forex - Development TODO

## Phase 1: Project Initialization
- [x] Update package.json with new project name and description
- [x] Update README.md for forex broker
- [x] Initialize Git repository
- [x] Connect to GitHub (https://github.com/onboarding92/Capital-forex.git)
- [x] Push initial code to GitHub
- [x] Adapt database schema for forex trading
- [x] Remove crypto-specific tables (walletAddresses, deposits, withdrawals, stakingPools, etc.)
- [x] Add forex-specific tables (tradingAccounts, forexPositions, marginAccounts, swapRates)

## Phase 2: Forex Trading Engine
- [x] Replace order matching engine with instant execution
- [x] Implement spread-based pricing system
- [x] Add leverage management (1:10, 1:50, 1:100, 1:200, 1:500)
- [x] Create margin calculator
- [x] Implement stop loss / take profit automation
- [x] Add swap rate calculation (overnight fees)
- [x] Create liquidation engine for margin calls
- [x] Create seed scripts for forex pairs and swap rates
- [ ] Remove crypto matching engine files

## Phase 3: Forex Pairs & Price Feeds
- [ ] Replace crypto pairs with forex pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, etc.)
- [ ] Integrate real-time forex price feed API (Alpha Vantage, Twelve Data, or similar)
- [ ] Implement bid/ask spread system (2-5 pips typical)
- [ ] Add pip calculator
- [ ] Create position size calculator
- [ ] Add 28+ forex pairs (majors, minors, exotics)

## Phase 4: UI Adaptation
- [x] Update branding (Capital Forex instead of BitChange Pro)
- [x] Replace crypto terminology with forex terms on homepage
- [x] Update homepage with forex pairs and account types
- [x] Remove staking routes from App.tsx
- [ ] Update trading interface for forex pairs
- [ ] Add leverage selector (1:1 to 1:500)
- [ ] Create margin level indicator
- [ ] Update dashboard with forex-specific metrics
- [x] Update DashboardLayout sidebar navigation
- [ ] Remove deposit/withdrawal crypto address generation
- [ ] Update deposit/withdrawal for fiat currency (bank transfer, credit card)

## Phase 5: Forex-Specific Features
- [ ] Economic calendar integration (Forex Factory API or similar)
- [ ] News feed for forex market
- [ ] Pip value calculator
- [ ] Profit/loss calculator in account currency
- [ ] Swap rate display (long/short overnight fees)
- [ ] Margin requirement calculator
- [ ] Account types (Standard, ECN, Pro)
- [ ] Spread comparison table

## Phase 6: Risk Management
- [ ] Implement margin call system (120% threshold)
- [ ] Add stop out level (50% threshold)
- [ ] Create negative balance protection
- [ ] Add maximum position size limits
- [ ] Implement daily loss limits
- [ ] Add equity/margin monitoring
- [ ] Create automatic position closure on margin call

## Phase 7: Deployment
- [x] Create comprehensive deployment guide
- [x] Create .env.example template
- [x] Configure new VPS for Capital Forex (46.224.157.152)
- [x] Setup MySQL database and seed forex pairs
- [x] Deploy application code
- [x] Setup PM2 process manager
- [x] Configure Nginx reverse proxy
- [x] Application live at http://46.224.157.152
- [ ] Setup domain (capitalforex.xyz or similar)
- [ ] Configure SSL certificate
- [ ] Test all forex features
- [x] Push to GitHub repository

## Phase 8: Documentation
- [ ] Update README for forex broker
- [ ] Create forex trading guide
- [ ] Document leverage and margin system
- [ ] Create API documentation
- [ ] Write deployment guide for VPS
- [ ] Create user manual for forex trading

---

## Key Differences from Crypto Exchange

### Removed Features:
- ❌ Staking pools
- ❌ Crypto deposit addresses
- ❌ Blockchain integration
- ❌ Order book matching
- ❌ Cryptocurrency wallets
- ❌ KYC document upload (simplified KYC)
- ❌ Referral system (optional)
- ❌ Achievement system (optional)

### Added Features:
- ✅ Forex pairs (28+ major/minor/exotic)
- ✅ Instant execution (no order book)
- ✅ High leverage (up to 1:500)
- ✅ Spread-based pricing
- ✅ Swap rates (overnight fees)
- ✅ Margin trading accounts
- ✅ Pip calculator
- ✅ Economic calendar
- ✅ Negative balance protection
- ✅ Margin call system

### Modified Features:
- 🔄 Trading engine: Order matching → Instant execution
- 🔄 Pricing: Order book → Bid/Ask spread
- 🔄 Accounts: Crypto wallets → Forex trading accounts
- 🔄 Risk: KYC only → KYC + Margin management
- 🔄 Deposits: Crypto addresses → Bank transfer/Credit card
- 🔄 Withdrawals: Crypto transactions → Bank transfer

---

## Database Schema Changes

### Tables to Remove:
- walletAddresses
- deposits (crypto-specific)
- withdrawals (crypto-specific)
- stakingPools
- stakingPositions
- stakingRewards
- achievements
- userAchievements
- socialFeed
- leaderboardEntries
- promoCodes
- promoUsage

### Tables to Add:
- tradingAccounts (accountType, leverage, balance, equity, margin, freeMargin)
- forexPositions (symbol, side, volume, openPrice, currentPrice, swap, profit)
- marginCalls (accountId, marginLevel, timestamp, resolved)
- swapRates (symbol, longSwap, shortSwap, updatedAt)
- economicEvents (date, currency, impact, event, forecast, previous)
- forexPairs (symbol, spread, minVolume, maxVolume, leverage)

### Tables to Keep (Modified):
- users (keep basic structure)
- orders (adapt for forex instant execution)
- trades (keep for history)
- transactions (adapt for fiat deposits/withdrawals)
- kycDocuments (simplified)
- supportTickets (keep as-is)

---

## Forex Pairs to Implement

### Major Pairs (7):
- EUR/USD (Euro / US Dollar)
- GBP/USD (British Pound / US Dollar)
- USD/JPY (US Dollar / Japanese Yen)
- USD/CHF (US Dollar / Swiss Franc)
- AUD/USD (Australian Dollar / US Dollar)
- USD/CAD (US Dollar / Canadian Dollar)
- NZD/USD (New Zealand Dollar / US Dollar)

### Minor Pairs (14):
- EUR/GBP, EUR/AUD, EUR/CAD, EUR/CHF, EUR/JPY, EUR/NZD
- GBP/JPY, GBP/CHF, GBP/AUD, GBP/CAD, GBP/NZD
- AUD/JPY, AUD/CAD, AUD/NZD

### Exotic Pairs (7):
- USD/TRY (Turkish Lira)
- USD/ZAR (South African Rand)
- USD/MXN (Mexican Peso)
- USD/SGD (Singapore Dollar)
- USD/HKD (Hong Kong Dollar)
- USD/NOK (Norwegian Krone)
- USD/SEK (Swedish Krona)

**Total: 28 forex pairs**

---

## Current Status

- ✅ Project structure copied from BitChange Pro
- ⏳ Awaiting package.json update
- ⏳ Awaiting database schema adaptation
- ⏳ Awaiting trading engine replacement
