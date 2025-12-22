# BitChange Pro - Testing Guide

## Overview
This guide provides step-by-step instructions for testing all features of the BitChange Pro cryptocurrency exchange platform.

## Test Environment Setup

### Prerequisites
- MySQL database running
- Node.js environment configured
- SMTP credentials configured (for email testing)
- Test users created with balances

### Test Users
```sql
-- Admin User (already created)
Email: admin@bitchangemoney.xyz
Password: Admin@BitChange2024!
Role: admin

-- Test Trader 1
Email: trader1@test.com
Password: Test123!Test
Role: user
Wallets: 10,000 USDT, 1.0 BTC

-- Test Trader 2
Email: trader2@test.com  
Password: Test123!Test
Role: user
Wallets: 10,000 USDT, 0.0 BTC
```

## Known Issues

### 1. **Email/Password Login Not Working**
**Issue**: The login form accepts email/password but the system maintains OAuth session from Manus, ignoring the email/password credentials.

**Root Cause**: The authentication middleware checks OAuth session first before checking email/password sessions.

**Workaround**: 
- Use admin panel to adjust user balances
- Test with the OAuth-authenticated user
- Or fix the auth middleware to properly handle both auth methods

**Fix Required**: Update `server/_core/context.ts` to check email/password sessions when OAuth session is not present.

### 2. **Trading UI Button Not Triggering**
**Issue**: Clicking "Sell BTC" or "Buy BTC" button doesn't place orders.

**Possible Causes**:
- Form validation failing silently
- tRPC mutation not being called
- Missing error toast notifications

**Workaround**: Test trading engine via direct SQL insertion (see below)

**Fix Required**: Add console.log in handlePlaceOrder to debug, check if mutation is being called.

## Testing Procedures

### 1. Authentication System

#### Register New User
```bash
# Navigate to registration page
https://bitchangemoney.xyz/auth/register

# Fill form:
- Email: newuser@test.com
- Name: New User
- Password: Test123!Test (min 8 chars, uppercase, lowercase, number, special)

# Expected: Success screen with "Check your email" message
```

#### Email Verification
```bash
# Check email inbox for verification code (6 digits)
# Navigate to: https://bitchangemoney.xyz/auth/verify-email
# Enter 6-digit code
# Expected: Redirect to dashboard
```

#### Login
```bash
# Navigate to: https://bitchangemoney.xyz/auth/login
# Enter email and password
# Expected: Redirect to dashboard with user info
```

#### Password Reset
```bash
# Navigate to: https://bitchangemoney.xyz/auth/forgot-password
# Enter email
# Check email for reset link
# Click link, enter new password
# Expected: Password updated, can login with new password
```

### 2. Two-Factor Authentication (2FA)

#### Setup 2FA
```bash
# Login as user
# Navigate to: Settings or 2FA setup page
# Scan QR code with Google Authenticator app
# Download backup codes
# Enter 6-digit code from app to verify
# Expected: 2FA enabled, backup codes downloaded
```

#### Login with 2FA
```bash
# Logout and login again
# After email/password, prompted for 6-digit code
# Enter code from Google Authenticator
# Expected: Successful login
```

### 3. KYC Verification

#### Submit KYC Documents
```bash
# Navigate to: /kyc
# Fill personal information:
  - First Name, Last Name
  - Date of Birth
  - Address, City, Country, Postal Code
# Upload documents (max 5MB each):
  - ID Card Front
  - ID Card Back
  - Selfie with ID
  - Proof of Address
# Expected: Status changes to "Submitted"
```

#### Admin Approve KYC
```bash
# Login as admin
# Navigate to: /admin (Admin Panel)
# Click "KYC Verification" tab
# View submitted documents
# Click "Approve" or "Reject" with reason
# Expected: User KYC status updated
```

### 4. Wallet Management

#### View Wallets
```bash
# Navigate to: /dashboard
# Expected: See all wallets with balances
# Shows: Total Balance, Available Balance, Locked Balance
```

#### Get Deposit Address
```bash
# Navigate to: /deposit
# Select cryptocurrency (BTC, ETH, USDT, etc.)
# Select network (Bitcoin, Ethereum, Tron, etc.)
# Expected: Unique deposit address displayed with QR code
# Copy button should work
```

### 5. Deposits

#### Create Deposit (Manual Test)
```sql
-- Insert deposit record
INSERT INTO transactions (userId, type, asset, amount, status, reference, createdAt)
VALUES (1, 'deposit', 'BTC', 0.5, 'completed', 'test-deposit-001', NOW());

-- Update wallet balance
UPDATE wallets 
SET balance = balance + 0.5 
WHERE userId = 1 AND asset = 'BTC';
```

#### Verify Deposit
```bash
# Navigate to: /deposit
# Check "Deposit History" section
# Expected: See completed deposit with amount and timestamp
```

### 6. Withdrawals

#### Request Withdrawal
```bash
# Navigate to: /withdrawal
# Select asset (BTC, ETH, USDT, etc.)
# Enter amount
# Enter destination address
# Select network
# Click "Request Withdrawal"
# Expected: Withdrawal status "Pending" (requires admin approval)
```

#### Admin Approve Withdrawal
```bash
# Login as admin
# Navigate to: /admin
# Click "Withdrawals" tab
# See pending withdrawals
# Click "Approve" or "Reject"
# Expected: 
  - If approved: Withdrawal status "Processing" → "Completed"
  - If rejected: Withdrawal status "Rejected", funds returned to wallet
```

### 7. Trading System

#### Test Trading Engine (SQL Method)
```sql
-- 1. Create sell order (User 1 sells 0.5 BTC at $86,000)
INSERT INTO orders (userId, pair, side, type, price, amount, filled, status, createdAt, updatedAt)
VALUES (1, 'BTC/USDT', 'sell', 'limit', 86000.00000000, 0.50000000, 0, 'open', NOW(), NOW());

-- 2. Lock BTC in seller's wallet
UPDATE wallets 
SET balance = balance - 0.5, locked = locked + 0.5
WHERE userId = 1 AND asset = 'BTC';

-- 3. Create buy order (User 2 buys 0.3 BTC at $86,000)
INSERT INTO orders (userId, pair, side, type, price, amount, filled, status, createdAt, updatedAt)
VALUES (2, 'BTC/USDT', 'buy', 'limit', 86000.00000000, 0.30000000, 0, 'open', NOW(), NOW());

-- 4. Lock USDT in buyer's wallet (0.3 BTC * $86,000 = $25,800)
UPDATE wallets 
SET balance = balance - 25800, locked = locked + 25800
WHERE userId = 2 AND asset = 'USDT';

-- 5. Manually execute trade (simulate matching engine)
-- Get order IDs first
SELECT @sell_order := id FROM orders WHERE userId = 1 AND pair = 'BTC/USDT' AND side = 'sell' ORDER BY id DESC LIMIT 1;
SELECT @buy_order := id FROM orders WHERE userId = 2 AND pair = 'BTC/USDT' AND side = 'buy' ORDER BY id DESC LIMIT 1;

-- Insert trade record
INSERT INTO trades (buyOrderId, sellOrderId, buyerId, sellerId, pair, price, amount, createdAt)
VALUES (@buy_order, @sell_order, 2, 1, 'BTC/USDT', 86000.00000000, 0.30000000, NOW());

-- Update orders (partial fill for seller, full fill for buyer)
UPDATE orders SET filled = 0.30000000, status = 'partially_filled', updatedAt = NOW() WHERE id = @sell_order;
UPDATE orders SET filled = 0.30000000, status = 'filled', updatedAt = NOW() WHERE id = @buy_order;

-- Calculate fees (0.1% maker, 0.2% taker)
-- Seller (maker): 0.3 BTC * 0.001 = 0.0003 BTC fee
-- Buyer (taker): 25800 USDT * 0.002 = 51.6 USDT fee

-- Transfer BTC from seller to buyer (minus taker fee)
UPDATE wallets SET locked = locked - 0.3 WHERE userId = 1 AND asset = 'BTC';
UPDATE wallets SET balance = balance + (0.3 - 0.0006) WHERE userId = 2 AND asset = 'BTC';  -- 0.0006 = taker fee

-- Transfer USDT from buyer to seller (minus maker fee)
UPDATE wallets SET locked = locked - 25800 WHERE userId = 2 AND asset = 'USDT';
UPDATE wallets SET balance = balance + (25800 - 25.8) WHERE userId = 1 AND asset = 'USDT';  -- 25.8 = maker fee

-- 6. Verify results
SELECT * FROM orders WHERE id IN (@sell_order, @buy_order);
SELECT * FROM trades WHERE buyOrderId = @buy_order OR sellOrderId = @sell_order;
SELECT w.*, u.email FROM wallets w JOIN users u ON w.userId = u.id WHERE u.id IN (1, 2) AND w.asset IN ('BTC', 'USDT');
```

#### Test Trading via UI (When Fixed)
```bash
# 1. Login as Trader 1
# Navigate to: /trading
# Select pair: BTC/USDT
# Click "Sell" tab
# Enter:
  - Price: 86000
  - Amount: 0.5
# Click "Sell BTC"
# Expected: Order appears in "Open Orders" and "Order Book"

# 2. Login as Trader 2 (different browser/incognito)
# Navigate to: /trading
# Select pair: BTC/USDT
# Click "Buy" tab
# Enter:
  - Price: 86000
  - Amount: 0.3
# Click "Buy BTC"
# Expected: 
  - Trade executes immediately (prices match)
  - Both users see trade in "My Trades"
  - Seller's order partially filled (0.3/0.5)
  - Buyer's order fully filled
  - Wallets updated with fees deducted
```

### 8. Staking System

#### View Staking Plans
```bash
# Navigate to: /staking
# Expected: See 9 staking plans (BTC, ETH, USDT) with different lock periods
# Shows: APR, Lock Period, Min Amount
```

#### Create Staking Position
```bash
# Select a plan (e.g., "BTC Flexible Staking - 4% APR")
# Click "Stake"
# Enter amount (e.g., 0.1 BTC)
# Click "Confirm"
# Expected: 
  - Balance deducted from wallet
  - Position appears in "Active Positions"
  - Rewards start accumulating
```

#### Unstake
```bash
# Navigate to: /staking
# Find active position
# Click "Unstake" (only available after maturity date for locked staking)
# Expected:
  - Principal + rewards returned to wallet
  - Position moved to "Completed Positions"
```

#### Admin Manage Staking Plans
```bash
# Login as admin
# Navigate to: /admin
# Click "Staking Plans" tab
# Can:
  - Create new staking plan
  - Edit existing plans (APR, lock period, min amount)
  - Enable/disable plans
```

### 9. Support Tickets

#### Create Support Ticket
```bash
# Navigate to: /support
# Click "Create Ticket"
# Fill:
  - Subject: "Withdrawal Issue"
  - Priority: High/Medium/Low
  - Message: Description of issue
# Click "Submit"
# Expected: Ticket created with status "Open"
```

#### Admin Respond to Ticket
```bash
# Login as admin
# Navigate to: /admin
# Click "Support Tickets" tab
# Click on ticket
# Enter reply message
# Change status if needed (Open/In Progress/Resolved/Closed)
# Click "Send Reply"
# Expected: User receives notification
```

### 10. Admin Dashboard

#### View Statistics
```bash
# Login as admin
# Navigate to: /admin
# Expected: See real-time stats:
  - Total Users
  - Active Users (logged in last 30 days)
  - Pending Withdrawals count
  - Pending KYC count
  - Trading Volume (daily/weekly/monthly)
  - User Growth Chart
  - Trading Volume Chart
```

#### User Management
```bash
# Navigate to: /admin → Users tab
# Can:
  - Search users by email/name
  - Filter by role, KYC status
  - Edit user (change role, KYC status, account status)
  - Adjust balance manually (add/subtract with reason)
  - View user activity (deposits, withdrawals, logins)
  - Export users to CSV
```

#### Transaction Logs
```bash
# Navigate to: /admin → Transaction Logs tab
# Can:
  - Filter by type (deposits, withdrawals, trades, logins)
  - Search by user ID
  - Select date range
  - Export to CSV
# Expected: See all transactions with timestamps
```

#### Hot Wallet Management
```bash
# Navigate to: /admin → Hot Wallets tab
# Can:
  - View all hot wallets with balances
  - Create new hot wallet for a cryptocurrency
  - View deposit addresses
# Expected: See wallet addresses and balances
```

### 11. Blockchain Monitoring (Background Service)

**Note**: This service runs automatically in the background.

#### How It Works
```
1. Service polls blockchain APIs every 60 seconds
2. Checks for new transactions to user deposit addresses
3. When deposit detected:
   - Creates transaction record
   - Updates user wallet balance
   - Sends email notification
4. Supports: BTC, ETH, TRX, SOL, BNB, MATIC
```

#### Manual Test
```bash
# 1. Get user's deposit address
# Navigate to: /deposit
# Select BTC, copy address

# 2. Send test BTC from external wallet (testnet)
# Use Bitcoin testnet faucet: https://testnet-faucet.mempool.co/
# Send 0.001 BTC to the address

# 3. Wait 60 seconds for monitoring service to detect
# Check: /dashboard → wallet balance should increase
# Check: /deposit → deposit history should show new deposit
```

### 12. Withdrawal Processing (Background Service)

**Note**: This service runs automatically in the background.

#### How It Works
```
1. User requests withdrawal → status "Pending"
2. Admin approves → status "Processing"
3. Background service picks up approved withdrawals
4. Executes on-chain transaction
5. Updates status to "Completed" with txHash
6. If fails → status "Failed", funds returned to wallet
```

#### Manual Test
```bash
# 1. Request withdrawal (see Withdrawals section above)
# 2. Admin approves
# 3. Background service processes (runs every 60 seconds)
# 4. Check withdrawal status updates to "Completed"
# 5. Verify txHash is recorded
```

## Performance Testing

### Load Testing
```bash
# Use Apache Bench or similar tool
ab -n 1000 -c 100 https://bitchangemoney.xyz/api/trpc/trade.orderBook

# Expected:
# - 100+ requests/second
# - <200ms average response time
# - 0% error rate
```

### Database Performance
```sql
-- Check slow queries
SHOW FULL PROCESSLIST;

-- Analyze table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = 'bitchange'
ORDER BY (data_length + index_length) DESC;

-- Check indexes
SHOW INDEX FROM orders;
SHOW INDEX FROM trades;
SHOW INDEX FROM transactions;
```

## Security Testing

### SQL Injection
```bash
# Try injecting SQL in login form
Email: admin' OR '1'='1
Password: anything

# Expected: Login fails, no SQL error exposed
```

### XSS (Cross-Site Scripting)
```bash
# Try injecting script in support ticket
Subject: <script>alert('XSS')</script>

# Expected: Script is escaped, not executed
```

### CSRF (Cross-Site Request Forgery)
```bash
# Try making API request without valid session
curl -X POST https://bitchangemoney.xyz/api/trpc/trade.placeOrder \
  -H "Content-Type: application/json" \
  -d '{"pair":"BTC/USDT","side":"buy","amount":"1"}'

# Expected: 401 Unauthorized
```

### Rate Limiting
```bash
# Try 100 login attempts in 1 minute
for i in {1..100}; do
  curl -X POST https://bitchangemoney.xyz/api/trpc/auth.login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Expected: After 10 attempts, rate limit kicks in (429 Too Many Requests)
```

## Deployment Testing

### Production Checklist
- [ ] Environment variables configured (.env.production)
- [ ] Database migrations applied
- [ ] SMTP credentials configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Firewall rules configured
- [ ] Backup system configured
- [ ] Monitoring alerts configured
- [ ] Admin user created
- [ ] Test deposits/withdrawals on testnet
- [ ] Load testing passed
- [ ] Security audit completed

### Post-Deployment Verification
```bash
# 1. Check all pages load
curl -I https://bitchangemoney.xyz
curl -I https://bitchangemoney.xyz/dashboard
curl -I https://bitchangemoney.xyz/trading

# 2. Check API health
curl https://bitchangemoney.xyz/api/health

# 3. Check database connection
# Login to admin panel, verify stats load

# 4. Check background services
# Check logs: docker logs bitchange-app
# Verify blockchain monitoring is running
# Verify withdrawal processing is running

# 5. Test critical flows
# - Register new user
# - Login
# - View wallets
# - Place trade order
# - Request withdrawal
```

## Troubleshooting

### Issue: Orders not appearing in order book
**Solution**: Check if trading engine service is running, check database for orders table

### Issue: Deposits not credited
**Solution**: Check blockchain monitoring service logs, verify deposit address is correct

### Issue: Withdrawals stuck in "Processing"
**Solution**: Check withdrawal processing service logs, verify hot wallet has sufficient balance

### Issue: Email not sending
**Solution**: Check SMTP credentials in .env, check email service logs

### Issue: 2FA QR code not displaying
**Solution**: Check if `qrcode.react` package is installed, check browser console for errors

### Issue: High database CPU usage
**Solution**: Add indexes to frequently queried columns, optimize slow queries

## Automated Testing

### Run Unit Tests
```bash
cd /home/ubuntu/bitchange-pro
pnpm test

# Expected: All tests pass
# Current status: 11/15 tests passing (see SYSTEM_TEST_REPORT.md)
```

### Run Integration Tests
```bash
# TODO: Create integration tests for:
# - Trading engine
# - Blockchain monitoring
# - Withdrawal processing
# - Email notifications
```

## Monitoring

### Application Logs
```bash
# View real-time logs
docker logs -f bitchange-app

# Search for errors
docker logs bitchange-app 2>&1 | grep ERROR

# Check specific service
docker logs bitchange-app 2>&1 | grep "Blockchain Monitor"
```

### Database Logs
```bash
# MySQL error log
tail -f /var/log/mysql/error.log

# Slow query log
tail -f /var/log/mysql/slow-query.log
```

### System Resources
```bash
# Check CPU/Memory usage
htop

# Check disk space
df -h

# Check network connections
netstat -tulpn | grep :3000
```

## Conclusion

This testing guide covers all major features of BitChange Pro. For production deployment, ensure all tests pass and all known issues are resolved. Refer to SYSTEM_TEST_REPORT.md for detailed test results and PROFESSIONAL_EXCHANGE_ROADMAP.md for future enhancements.
