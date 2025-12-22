# BitChange Pro - VPS Deployment Guide

This guide provides step-by-step instructions for deploying the latest updates to your VPS.

## 🚀 New Features in This Update

1. **Redis Caching** - Eliminates CoinGecko API rate limit errors (429) with 60-second price caching
2. **Referral System** - Complete referral tracking with unique codes, dashboard, and statistics
3. **Reward Distribution** - Automatic $10 USDT rewards for first deposit/trade
4. **KYC Schema Updates** - Database schema ready for document storage

## 📋 Prerequisites

- SSH access to VPS (root@46.224.87.94)
- BitChange Pro already deployed at `/opt/bitchange-pro`
- Docker and docker-compose installed

## 🔧 Deployment Steps

### Step 1: Connect to VPS

```bash
ssh root@46.224.87.94
cd /opt/bitchange-pro
```

### Step 2: Backup Current Database

```bash
docker exec bitchange_db mysqldump -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Update Docker Compose Configuration

Create or update `docker-compose.production.yml` to include Redis service:

```yaml
services:
  # ... existing services ...
  
  redis:
    image: redis:7-alpine
    container_name: bitchange_redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - bitchange_network

volumes:
  # ... existing volumes ...
  redis_data:
```

### Step 4: Start Redis Service

```bash
docker-compose -f docker-compose.production.yml up -d redis
```

Verify Redis is running:
```bash
docker ps | grep redis
```

### Step 5: Apply Database Migrations

#### 5.1 Add Referral Fields to Users Table

```bash
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e "
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referralCode VARCHAR(20) UNIQUE COMMENT 'Unique referral code',
ADD COLUMN IF NOT EXISTS referredBy INT COMMENT 'User ID who referred this user';
"
```

#### 5.2 Create Rewards Table

```bash
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e "
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  referrerId INT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL DEFAULT 10.00000000,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
  type ENUM('first_deposit', 'first_trade', 'manual') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referrerId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (userId),
  INDEX idx_referrer_id (referrerId),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"
```

#### 5.3 Add KYC Document Fields

```bash
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e "
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kycIdFrontPath TEXT COMMENT 'Local file path for ID front photo',
ADD COLUMN IF NOT EXISTS kycIdBackPath TEXT COMMENT 'Local file path for ID back photo',
ADD COLUMN IF NOT EXISTS kycSelfiePath TEXT COMMENT 'Local file path for selfie with ID';
"
```

### Step 6: Update Application Code

You have two options:

**Option A: Pull from GitHub (Recommended)**
```bash
git pull origin main
```

**Option B: Manual File Upload**

Upload these files from your local machine to VPS:
- `docker-compose.production.yml`
- `server/_core/redis.ts`
- `server/cryptoPrices.ts`
- `server/routers.ts`
- `server/rewardDistribution.ts`
- `drizzle/schema.ts`
- `package.json`
- `client/src/pages/ReferralDashboard.tsx`
- `client/src/components/DashboardLayout.tsx`
- `client/src/App.tsx`

### Step 7: Install New Dependencies

```bash
docker-compose -f docker-compose.production.yml exec app pnpm install
```

Or rebuild the container to ensure all dependencies are fresh:

```bash
docker-compose -f docker-compose.production.yml stop app
docker-compose -f docker-compose.production.yml build --no-cache app
```

### Step 8: Restart Application

```bash
docker-compose -f docker-compose.production.yml up -d app
```

### Step 9: Verify Deployment

Check container status:
```bash
docker-compose -f docker-compose.production.yml ps
```

Check application logs:
```bash
docker-compose -f docker-compose.production.yml logs -f app --tail=100
```

Check Redis connection:
```bash
docker-compose -f docker-compose.production.yml logs redis --tail=50
```

### Step 10: Test New Features

1. **Redis Caching**: Visit homepage and check that crypto prices load without errors
2. **Referral System**: Login and navigate to `/referrals` to see your referral code
3. **Transaction History**: Check `/transactions` page loads correctly

## 🔍 Troubleshooting

### Redis Connection Issues

If app can't connect to Redis:
```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs bitchange_redis

# Test Redis connection
docker exec bitchange_redis redis-cli ping
# Should return: PONG
```

### Database Migration Errors

If migrations fail:
```bash
# Check database connection
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 -e "SHOW DATABASES;"

# Verify tables exist
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e "SHOW TABLES;"

# Check specific table structure
docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e "DESCRIBE users;"
```

### Application Won't Start

```bash
# Check app logs for errors
docker logs bitchange_app --tail=200

# Restart all services
docker-compose -f docker-compose.production.yml restart

# If still failing, rebuild from scratch
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

## 📊 Post-Deployment Verification

Visit these URLs to verify everything works:

1. **Homepage**: https://www.bitchangemoney.xyz
   - Crypto ticker should show prices without errors
   
2. **Dashboard**: https://www.bitchangemoney.xyz/dashboard
   - Should load without "Invalid URL" errors
   
3. **Referral Page**: https://www.bitchangemoney.xyz/referrals
   - Should show referral code and stats
   
4. **Transaction History**: https://www.bitchangemoney.xyz/transactions
   - Should display transaction table with filters

## 🔐 Security Notes

- Redis is bound to localhost only (127.0.0.1:6379)
- KYC documents are stored in `/app/uploads/kyc/` with restricted access
- All database migrations use `IF NOT EXISTS` to prevent errors on re-run
- Backup created before any changes

## 📝 Rollback Procedure

If something goes wrong:

```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore database backup
docker-compose -f docker-compose.production.yml up -d db
docker exec -i bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro < backup_YYYYMMDD_HHMMSS.sql

# Restore previous code version
git reset --hard HEAD~1

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

## 🎯 Next Steps

After successful deployment:

1. **Test Referral Flow**: Create a test account using a referral link
2. **Monitor Redis**: Check Redis memory usage with `docker stats bitchange_redis`
3. **Enable Reward Distribution**: Implement webhook or cron job to trigger reward distribution on deposit/trade completion
4. **Complete KYC UI**: Implement admin review panel for KYC document verification

## 📞 Support

If you encounter issues:
- Check logs: `docker-compose logs -f`
- Verify network: `docker network inspect bitchange_network`
- Database health: `docker exec bitchange_db mysqladmin -uroot -ppBjRIcG97WLl540WWwb4 status`

---

**Deployment Date**: 2025-12-19  
**Version**: ee7b7095  
**Features**: Redis Caching, Referral System, Reward Distribution, KYC Schema
