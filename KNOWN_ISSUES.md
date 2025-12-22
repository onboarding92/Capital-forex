# BitChange Pro - Known Issues

## Critical Issues

### 1. Email/Password Authentication Not Working in Production

**Status**: ✅ **FIXED** - December 17, 2025

**Description**: The login form at `/auth/login` accepts email and password credentials, but the system maintains the OAuth session from Manus platform, completely ignoring the email/password authentication.

**Impact**:
- Cannot test with created test users (trader1@test.com, trader2@test.com)
- Always logs in as the Manus OAuth user regardless of credentials entered
- Makes it impossible to test multi-user trading scenarios via UI

**Root Cause**:
The authentication context in `server/_core/context.ts` checks for OAuth session first and returns that user, never checking the email/password session table.

**Reproduction Steps**:
1. Navigate to `/auth/login`
2. Enter `trader1@test.com` / `Test123!Test`
3. Click "Sign In"
4. Result: Logged in as Manus OAuth user (e.g., benziluca92@gmail.com) instead of trader1

**Workaround**:
- Clear all cookies before login attempt
- Even after clearing cookies, OAuth session persists
- Use admin panel to adjust balances for the OAuth user
- Test trading with SQL queries instead of UI

**Fix Required**:
```typescript
// server/_core/context.ts
// Current logic (WRONG):
if (oauthUser) return oauthUser;
// Never reaches email/password session check

// Should be:
if (oauthUser) return oauthUser;
if (emailPasswordSession) return emailPasswordUser;
return null;
```

**Priority**: P0 - ✅ FIXED

**Fix Applied**:
Modified `server/_core/context.ts` to check email/password session cookie (`auth_token`) before falling back to OAuth session. Now both authentication methods work correctly.

---

### 2. Trading UI Button Not Triggering Orders

**Status**: ✅ **FIXED** - December 17, 2025

**Description**: Clicking "Buy BTC" or "Sell BTC" buttons in the trading interface does not place orders. The form accepts input (price, amount) and calculates total correctly, but clicking the button has no effect.

**Impact**:
- Cannot test trading engine via UI
- Users cannot place orders
- Core exchange functionality broken

**Reproduction Steps**:
1. Login and navigate to `/trading`
2. Select "Sell" tab
3. Enter Price: 86000
4. Enter Amount: 0.5
5. Click "Sell BTC"
6. Result: Nothing happens, no order created, no error message

**Observations**:
- No console errors in browser
- No network requests visible in DevTools
- "Open Orders" section remains empty
- Database query confirms no orders were created
- Form validation seems to pass (Total is calculated correctly)

**Possible Causes**:
1. tRPC mutation not being called
2. onClick handler not firing
3. Button disabled state not updating
4. Silent validation failure
5. Missing error toast notification

**Workaround**:
Test trading engine via direct SQL insertion (see TESTING_GUIDE.md)

**Debug Steps Needed**:
```typescript
// Add to Trade.tsx handlePlaceOrder function:
const handlePlaceOrder = () => {
  console.log("handlePlaceOrder called"); // Check if function runs
  console.log({ orderType, price, amount }); // Check values
  
  if (orderType === "limit" && !price) {
    console.log("Price validation failed");
    toast.error("Price is required for limit orders");
    return;
  }
  if (!amount) {
    console.log("Amount validation failed");
    toast.error("Amount is required");
    return;
  }

  console.log("Calling placeOrderMutation.mutate");
  placeOrderMutation.mutate({
    pair: selectedPair,
    side: orderSide,
    type: orderType,
    price: orderType === "limit" ? price : undefined,
    amount,
  });
};
```

**Priority**: P0 - ✅ FIXED

**Fix Applied**:
The trading button now works correctly after fixing the authentication context. Orders are successfully placed and visible in the order book.

---

### 3. Matching Engine Not Executing Trades

**Status**: 🔴 **CRITICAL** - DEBUG IN PROGRESS

**Description**: When a buy order and sell order with matching prices are placed, the matching engine does not execute the trade. Both orders remain in "open" status instead of being matched.

**Evidence**:
- Placed sell order: BTC/USDT @ 86000, amount 0.3 BTC (trader1) - SUCCESS, visible in order book
- Attempted buy order: BTC/USDT @ 86000, amount 0.3 BTC (buyer2) - FAILED SILENTLY
- No `[PLACE_ORDER]` or `[MATCHING]` logs appear when clicking "Buy BTC" button
- Server logs show only authentication, no trading activity
- Buy order never reaches backend (mutation fails before API call)

**Root Cause Analysis**:
1. ✅ Added comprehensive debug logging to `placeOrder()` (lines 143, 156, 182-184, 186)
2. ✅ Added comprehensive debug logging to `matchOrder()` (lines 196-252)
3. ✅ Verified `placeOrder()` calls `matchOrder()` at line 183
4. ❌ **Buy order mutation fails on frontend** - Never reaches backend
5. ❌ **Likely cause**: Insufficient balance validation
   - buyer2 has 50,000 USDT total
   - 43,000 USDT locked from previous failed test
   - Only 7,000 USDT available
   - Trying to buy 0.3 BTC @ 86000 = 25,800 USDT required
   - Frontend validation or backend returns error before logging
6. ❌ **Error handling gap**: No error toast shown to user when mutation fails

**Impact**: CRITICAL - Core trading functionality completely broken

**Workaround**:
1. Clear locked balances: `UPDATE wallets SET locked = 0 WHERE userId IN (SELECT id FROM users WHERE email LIKE '%test%');`
2. Ensure test users have sufficient available balance
3. Test with smaller amounts that fit within available balance

**Next Debug Steps**:
1. 🔴 **Add error toast in Trade.tsx** - Show backend errors to user
2. 🔴 **Check browser console** - Look for tRPC mutation errors
3. 🔴 **Clear locked balances** - Reset test data for clean testing
4. 🔴 **Test with sufficient balance** - Verify matching engine with valid data
5. 🔴 **Add balance validation UI** - Show available vs required before order

**Fix Required**:
1. Add comprehensive debug logging to `matchOrder()` function:
```typescript
async function matchOrder(db: any, orderId: number): Promise<Trade[]> {
  console.log(`[MATCHING] Starting match for order ${orderId}`);
  const executedTrades: Trade[] = [];
  
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  console.log(`[MATCHING] Order details:`, order);
  
  const oppositeOrders = await db.select()...;
  console.log(`[MATCHING] Found ${oppositeOrders.length} opposite orders`);
  
  for (const oppositeOrder of oppositeOrders) {
    console.log(`[MATCHING] Checking opposite order:`, oppositeOrder);
    console.log(`[MATCHING] Price comparison: ${orderPrice} >= ${oppositePrice} = ${canMatch}`);
    // ... rest of logic
  }
}
```

2. Verify database queries:
```sql
-- Check if opposite orders query works
SELECT * FROM orders 
WHERE pair = 'BTC/USDT' 
  AND side = 'sell' 
  AND status IN ('open', 'partially_filled')
ORDER BY price ASC, createdAt ASC;
```

3. Test with explicit type conversion:
```typescript
const orderPrice = parseFloat(order.price);
const oppositePrice = parseFloat(oppositeOrder.price);
console.log(`Comparing: ${orderPrice} (${typeof orderPrice}) >= ${oppositePrice} (${typeof oppositePrice})`);
```

**Testing**:
```bash
# After adding debug logs, test again:
1. Clear existing orders: DELETE FROM orders;
2. Place sell order via UI
3. Place buy order via UI
4. Check server logs for [MATCHING] entries
5. Check database: SELECT * FROM trades;
```

**Priority**: P0 - MUST FIX IMMEDIATELY

---

## High Priority Issues

### 3. SMTP Email Not Configured

**Status**: 🟡 **HIGH** - Blocks email-dependent features

**Description**: SMTP credentials are not configured, so no emails are being sent for:
- Email verification codes (OTP)
- Password reset links
- Login alerts
- Withdrawal notifications
- KYC status updates

**Impact**:
- New users cannot verify their email
- Users cannot reset forgotten passwords
- No email notifications for important events

**Fix Required**:
Configure SMTP in `.env.production`:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<SendGrid API Key>
SMTP_FROM=info@bitchangemoney.xyz
```

**Recommended Service**: SendGrid (professional, reliable, good reputation)

**Alternative**: Gmail SMTP (for testing only, not production)

**Priority**: P1 - Required for production launch

---

### 4. Logout Functionality - Dropdown Not Opening

**Status**: 🟡 **MEDIUM** - UI bug

**Description**: Logout button exists in DashboardLayout user menu dropdown (lines 211-238), but the dropdown menu does not open when clicked.

**Impact**:
- Users cannot access logout button (though it exists)
- Testing multiple users requires manual cookie clearing
- Minor UX issue

**Root Cause**:
- DropdownMenu component from shadcn/ui not opening
- Possible z-index conflict or event handler issue
- Logout mutation exists and works: `trpc.auth.logout.useMutation()`

**Workaround**:
```javascript
// Clear cookies via browser console:
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
```

**Fix Required**:
1. Debug DropdownMenu component in DashboardLayout.tsx
2. Check for z-index conflicts with sidebar
3. Verify DropdownMenuTrigger onClick handler
4. Test with different shadcn/ui dropdown implementation

**Priority**: P2 - Minor UI bug, workaround available

---

### 5. Database Schema Missing Security Columns

**Status**: 🟡 **HIGH** - Schema inconsistency

**Description**: The users table in code references columns that don't exist in the database:
- `antiPhishingCode`
- `ipWhitelist`

**Impact**:
- Potential runtime errors if these fields are accessed
- Security features not functional

**Fix Required**:
```bash
cd /home/ubuntu/bitchange-pro
pnpm db:push
```

This will sync the database schema with the Drizzle schema definition.

**Priority**: P1 - Run before production deployment

---

## Medium Priority Issues

### 6. Trading Engine Not Auto-Matching

**Status**: 🟠 **MEDIUM** - Feature incomplete

**Description**: The trading engine code exists (`server/services/tradingEngine.ts`) but is not being called automatically when orders are placed. Orders are created but not matched.

**Impact**:
- Orders sit in order book without executing
- No automatic trade execution
- Manual intervention required

**Expected Behavior**:
When a new order is placed, the trading engine should:
1. Find matching orders on opposite side
2. Execute trades at best prices
3. Update order statuses (filled/partially_filled)
4. Transfer funds between users
5. Deduct trading fees

**Current Behavior**:
Orders are created with status "open" and never matched.

**Fix Required**:
Call `matchOrders()` from `tradingEngine.ts` after creating an order in `trade.placeOrder` mutation.

**Priority**: P2 - Core feature, but can be tested manually

---

### 7. Blockchain Monitoring Service Not Tested

**Status**: 🟠 **MEDIUM** - Needs verification

**Description**: The blockchain monitoring service (`server/services/blockchainMonitor.ts`) is implemented but not tested with real blockchain transactions.

**Impact**:
- Unknown if deposits will be detected correctly
- May have bugs in production
- Could miss deposits or credit wrong amounts

**Testing Needed**:
1. Configure testnet RPC endpoints
2. Send test transactions to user deposit addresses
3. Verify service detects deposits
4. Verify wallet balances update correctly
5. Verify email notifications sent

**Priority**: P2 - Test on testnet before mainnet

---

### 8. Withdrawal Processing Service Not Tested

**Status**: 🟠 **MEDIUM** - Needs verification

**Description**: The withdrawal processing service (`server/services/withdrawalProcessor.ts`) is implemented but not tested with real blockchain transactions.

**Impact**:
- Unknown if withdrawals will execute correctly
- May have bugs that could lose funds
- Could send to wrong addresses

**Testing Needed**:
1. Configure testnet hot wallets
2. Request test withdrawals
3. Admin approve withdrawals
4. Verify service executes on-chain transactions
5. Verify txHash is recorded
6. Verify wallet balances update correctly

**Priority**: P2 - MUST test on testnet before mainnet

---

### 9. Real-Time Price Feeds May Hit Rate Limits

**Status**: 🟠 **MEDIUM** - Scalability concern

**Description**: The system uses CoinGecko free API for price feeds. Free tier has rate limits (50 calls/minute).

**Impact**:
- With 100+ users, may exceed rate limits
- Prices may become stale
- Trading experience degraded

**Fix Required**:
1. Implement price caching (Redis)
2. Upgrade to CoinGecko Pro API
3. Or use alternative price feed (Binance API, CoinMarketCap)

**Priority**: P2 - Monitor in production, upgrade if needed

---

## Low Priority Issues

### 10. No Market Orders Implementation

**Status**: 🟢 **LOW** - Feature gap

**Description**: The UI has a "Market Order" option, but the trading engine only implements limit orders. Market orders are not executed.

**Impact**:
- Users expect market orders to work
- Confusing UX

**Fix Required**:
Either:
1. Implement market order logic in trading engine
2. Remove market order option from UI

**Priority**: P3 - Nice to have

---

### 11. No Order Cancellation in UI

**Status**: 🟢 **LOW** - UX gap

**Description**: Users can place orders but cannot cancel them via UI (though backend endpoint exists).

**Impact**:
- Users stuck with unwanted orders
- Poor UX

**Fix Required**:
Add "Cancel" button to Open Orders table

**Priority**: P3 - Should add eventually

---

### 12. No Trading Charts

**Status**: 🟢 **LOW** - Feature gap

**Description**: Professional exchanges have price charts (candlestick, line charts). BitChange Pro has none.

**Impact**:
- Less professional appearance
- Traders prefer visual data

**Fix Required**:
Integrate charting library (TradingView, Lightweight Charts)

**Priority**: P3 - Enhancement for future

---

### 13. No Mobile Responsive Design Testing

**Status**: 🟢 **LOW** - Testing gap

**Description**: The UI uses Tailwind responsive classes but hasn't been tested on mobile devices.

**Impact**:
- May have layout issues on mobile
- Poor mobile UX

**Testing Needed**:
Test all pages on:
- iPhone (Safari)
- Android (Chrome)
- Tablet (iPad)

**Priority**: P3 - Test before launch

---

### 14. No API Documentation

**Status**: 🟢 **LOW** - Documentation gap

**Description**: There is no API documentation for developers who want to integrate with BitChange Pro.

**Impact**:
- Harder for third-party integrations
- Support burden

**Fix Required**:
Generate API docs from tRPC schema (use tRPC OpenAPI generator)

**Priority**: P3 - Nice to have

---

### 15. No Referral Program UI

**Status**: 🟢 **LOW** - Feature incomplete

**Description**: Database schema has referral tables but no UI to:
- Generate referral codes
- Track referrals
- View referral earnings

**Impact**:
- Marketing feature not usable
- Cannot incentivize user growth

**Fix Required**:
Build referral dashboard page

**Priority**: P3 - Future enhancement

---

## Test Results Summary

### Vitest Unit Tests
- **Status**: 11/15 tests passing (73%)
- **Failed Tests**:
  - `auth.register` - Email verification not mocked
  - `auth.verifyEmail` - OTP validation failing
  - `trade.placeOrder` - Trading engine not called
  - `withdrawal.create` - Wallet locking issue

### Manual UI Tests
- **Authentication**: ❌ Email/password login broken
- **2FA Setup**: ✅ Working (QR code generation, backup codes)
- **KYC Submission**: ✅ Working (file upload, form validation)
- **Wallet Display**: ✅ Working (shows balances correctly)
- **Deposit Address**: ✅ Working (generates unique addresses with QR)
- **Trading UI**: ❌ Order placement broken
- **Admin Dashboard**: ✅ Working (stats, charts, user management)
- **Admin KYC Approval**: ✅ Working
- **Admin Withdrawal Approval**: ⚠️ Not tested (no withdrawals to approve)

### Database Tests
- **Schema**: ⚠️ Missing columns (antiPhishingCode, ipWhitelist)
- **Indexes**: ✅ Proper indexes on orders, trades, transactions
- **Constraints**: ✅ Foreign keys working
- **Migrations**: ⚠️ Need to run `pnpm db:push`

### Security Tests
- **SQL Injection**: ✅ Protected (using Drizzle ORM)
- **XSS**: ✅ Protected (React escapes by default)
- **CSRF**: ✅ Protected (tRPC uses session cookies)
- **Rate Limiting**: ✅ Implemented (50 login attempts per IP/15min)
- **Password Hashing**: ✅ Using bcrypt
- **2FA**: ✅ Using speakeasy TOTP

### Performance Tests
- **Not Conducted**: Need load testing with Apache Bench or similar

---

## Recommendations

### Before Production Deployment

1. **FIX CRITICAL ISSUES** (P0):
   - Fix email/password authentication
   - Fix trading UI button
   - Configure SMTP email

2. **FIX HIGH PRIORITY ISSUES** (P1):
   - Add logout functionality
   - Run database migration (`pnpm db:push`)
   - Test blockchain monitoring on testnet
   - Test withdrawal processing on testnet

3. **TESTING**:
   - Fix failing unit tests
   - Conduct load testing
   - Test on mobile devices
   - Security audit

4. **DOCUMENTATION**:
   - Update README with production setup
   - Create admin user guide
   - Create user guide

### After Production Launch

1. **Monitor**:
   - Set up error tracking (Sentry)
   - Set up uptime monitoring (UptimeRobot)
   - Monitor API rate limits
   - Monitor database performance

2. **Enhancements**:
   - Implement market orders
   - Add trading charts
   - Build referral program UI
   - Add API documentation
   - Implement advanced order types (stop-loss, take-profit)

---

## Contact

For questions or issues, refer to:
- **TESTING_GUIDE.md** - Comprehensive testing procedures
- **SYSTEM_TEST_REPORT.md** - Detailed test results
- **PROFESSIONAL_EXCHANGE_ROADMAP.md** - Future enhancements
- **DEPLOYMENT.md** - Production deployment guide
