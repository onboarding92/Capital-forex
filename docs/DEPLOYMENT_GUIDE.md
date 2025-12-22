# BitChange Pro - Production Deployment Guide

## Overview

This guide covers deploying BitChange Pro to production with all enterprise features:
- ✅ Wallet Production System (cold/hot separation)
- ✅ Trust Signals (security badges, platform stats)
- ✅ WebAuthn Biometric Authentication
- ✅ Automatic Sweep Monitoring

## Prerequisites

### Server Requirements

- **VPS**: Ubuntu 22.04 LTS or newer
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **Node.js**: v22.13.0 or newer
- **Database**: MySQL 8.0 or TiDB Cloud
- **SSL Certificate**: Required for WebAuthn (Let's Encrypt recommended)

### Domain Setup

- ✅ Domain registered (e.g., `bitchangemoney.xyz`)
- ✅ DNS A record pointing to VPS IP
- ✅ SSL certificate installed (HTTPS required)

### External Services

- ✅ SendGrid account (for email alerts)
- ✅ Blockchain API access (for balance verification)
- ✅ Database connection string

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 (process manager)
npm install -g pm2

# Install nginx (reverse proxy)
sudo apt install -y nginx

# Install certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clone and Setup Project

```bash
# Create project directory
sudo mkdir -p /var/www/bitchange-pro
sudo chown $USER:$USER /var/www/bitchange-pro

# Clone project (or upload files)
cd /var/www/bitchange-pro
# Upload your project files here

# Install dependencies
pnpm install

# Build frontend
pnpm build
```

### 3. Environment Configuration

Create `.env` file:

```bash
# Database
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here"

# OAuth (Manus)
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="your-app-id"

# Email (SendGrid)
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@bitchangemoney.xyz"
SENDGRID_FROM_NAME="BitChange Pro"

# App Configuration
VITE_APP_TITLE="BitChange Pro"
VITE_APP_LOGO="/logo.svg"
NODE_ENV="production"
PORT=3000

# Owner Info
OWNER_OPEN_ID="your-owner-open-id"
OWNER_NAME="Admin"

# Forge API (Manus built-in services)
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-forge-api-key"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-forge-key"

# Analytics
VITE_ANALYTICS_ENDPOINT="https://analytics.manus.im"
VITE_ANALYTICS_WEBSITE_ID="your-website-id"
```

**Security Note**: Never commit `.env` to version control!

### 4. Database Migration

Run the wallet production system migration:

```bash
cd /var/www/bitchange-pro
node scripts/apply-wallet-migration.mjs
```

**Expected Output:**
```
🔗 Connecting to database...
✅ Connected to database
📝 Applying wallet production system migration...
Creating tables...
  ✓ Created/verified table: coldWallets
  ✓ Created/verified table: sweepTransactions
  ✓ Created/verified table: walletThresholds
Populating default thresholds...
  ✓ Configured threshold: BTC
  ✓ Configured threshold: ETH
  ✓ Configured threshold: BNB
  ✓ Configured threshold: SOL
  ✓ Configured threshold: MATIC
  ✓ Configured threshold: TRX
✅ Migration completed successfully!
📊 Verifying tables...
  • coldWallets: 0 records
  • sweepTransactions: 0 records
  • walletThresholds: 6 records
🎉 Wallet production system is ready!
```

### 5. SSL Certificate Setup

```bash
# Generate SSL certificate with Let's Encrypt
sudo certbot --nginx -d bitchangemoney.xyz -d www.bitchangemoney.xyz

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/bitchange-pro`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name bitchangemoney.xyz www.bitchangemoney.xyz;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bitchangemoney.xyz www.bitchangemoney.xyz;

    # SSL Configuration (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if serving separately)
    location /assets {
        alias /var/www/bitchange-pro/client/dist/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/bitchange-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Start Application with PM2

```bash
cd /var/www/bitchange-pro

# Start app
pm2 start server/_core/index.ts --name bitchange-pro --interpreter tsx

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command it outputs

# View logs
pm2 logs bitchange-pro

# Monitor
pm2 monit
```

### 8. Setup Automatic Sweep Monitoring

```bash
# Make script executable
chmod +x /var/www/bitchange-pro/scripts/sweep-monitor-cron.mjs

# Test script
cd /var/www/bitchange-pro
node scripts/sweep-monitor-cron.mjs

# Create log directory
sudo mkdir -p /var/log/bitchange
sudo chown $USER:$USER /var/log/bitchange

# Add to crontab
crontab -e
```

Add this line:

```cron
*/10 * * * * cd /var/www/bitchange-pro && /usr/bin/node scripts/sweep-monitor-cron.mjs >> /var/log/bitchange/sweep-monitor.log 2>&1
```

Verify cron is running:

```bash
sudo systemctl status cron
tail -f /var/log/bitchange/sweep-monitor.log
```

### 9. Configure Cold Wallets

1. Navigate to Admin Panel → Wallet Management
2. Click "Add Cold Wallet"
3. Enter cold wallet addresses for each network:
   - **BTC**: Your Bitcoin cold wallet address
   - **ETH**: Your Ethereum cold wallet address
   - **BNB**: Your BNB Chain cold wallet address
   - **SOL**: Your Solana cold wallet address
   - **MATIC**: Your Polygon cold wallet address
   - **TRX**: Your Tron cold wallet address

**Security Note**: Never enter private keys! Only addresses.

### 10. Configure Alert Emails

Update wallet thresholds with alert email:

```sql
UPDATE walletThresholds 
SET alertEmail = 'admin@bitchangemoney.xyz' 
WHERE network IN ('BTC', 'ETH', 'BNB', 'SOL', 'MATIC', 'TRX');
```

Or via Admin Panel → Wallet Management → Update Threshold

### 11. Verify Deployment

**Check Application:**
- ✅ Visit https://bitchangemoney.xyz
- ✅ Login with admin account
- ✅ Navigate to Admin Panel → Wallet Management
- ✅ Verify all tabs load correctly

**Check Trust Signals:**
- ✅ Visit Deposit page
- ✅ Verify TrustBanner appears at top
- ✅ Check security badges display correctly

**Check WebAuthn:**
- ✅ Navigate to Account Settings
- ✅ Scroll to "Biometric Authentication" section
- ✅ Try registering a device (Face ID/Touch ID/Windows Hello)

**Check Sweep Monitoring:**
- ✅ Check cron logs: `tail -f /var/log/bitchange/sweep-monitor.log`
- ✅ Wait 10 minutes for first run
- ✅ Verify no errors in logs

## Post-Deployment Configuration

### 1. Add Initial Admin User

If you don't have an admin user yet:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 2. Configure Wallet Thresholds

Adjust thresholds based on your trading volume:

| Network | Default Min | Default Max | Recommended for Low Volume | Recommended for High Volume |
|---------|-------------|-------------|---------------------------|----------------------------|
| BTC | 0.1 BTC | 2.0 BTC | 0.05 BTC - 1.0 BTC | 1.0 BTC - 10.0 BTC |
| ETH | 1.0 ETH | 20.0 ETH | 0.5 ETH - 10.0 ETH | 10.0 ETH - 100.0 ETH |
| BNB | 5.0 BNB | 100.0 BNB | 2.0 BNB - 50.0 BNB | 50.0 BNB - 500.0 BNB |
| SOL | 10.0 SOL | 200.0 SOL | 5.0 SOL - 100.0 SOL | 100.0 SOL - 1000.0 SOL |
| MATIC | 100.0 MATIC | 2000.0 MATIC | 50.0 - 1000.0 | 1000.0 - 10000.0 |
| TRX | 1000.0 TRX | 20000.0 TRX | 500.0 - 10000.0 | 10000.0 - 100000.0 |

### 3. Test WebAuthn on Real Devices

Follow testing guide: `docs/WEBAUTHN_TESTING.md`

Test on:
- ✅ iPhone (Face ID/Touch ID)
- ✅ Android (Fingerprint)
- ✅ Windows (Windows Hello)
- ✅ macOS (Touch ID)

### 4. Monitor System Health

**Daily Checks:**
- Check PM2 status: `pm2 status`
- Check application logs: `pm2 logs bitchange-pro`
- Check sweep logs: `tail -f /var/log/bitchange/sweep-monitor.log`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Weekly Checks:**
- Review sweep transaction history (Admin Panel)
- Verify cold wallet balances on blockchain
- Check hot wallet health status
- Review email alert logs

**Monthly Checks:**
- Update dependencies: `pnpm update`
- Review and adjust wallet thresholds
- Security audit
- Backup database

## Monitoring & Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs bitchange-pro --lines 100

# Restart app
pm2 restart bitchange-pro

# Stop app
pm2 stop bitchange-pro

# Delete app from PM2
pm2 delete bitchange-pro
```

### Database Backup

```bash
# Create backup script
cat > /var/www/bitchange-pro/scripts/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/bitchange"
mkdir -p $BACKUP_DIR

# Extract DB credentials from DATABASE_URL
# Adjust this based on your connection string format
mysqldump -h YOUR_HOST -u YOUR_USER -p'YOUR_PASSWORD' YOUR_DATABASE > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql"
EOF

chmod +x /var/www/bitchange-pro/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:

```cron
0 2 * * * /var/www/bitchange-pro/scripts/backup-db.sh >> /var/log/bitchange/backup.log 2>&1
```

### Log Rotation

Create `/etc/logrotate.d/bitchange-pro`:

```
/var/log/bitchange/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs bitchange-pro --err

# Check Node.js version
node --version  # Should be 22.x

# Check environment variables
pm2 env 0  # Show env for first process

# Restart
pm2 restart bitchange-pro
```

### Database Connection Issues

```bash
# Test database connection
node scripts/apply-wallet-migration.mjs

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Verify database is accessible
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Sweep Monitoring Not Running

```bash
# Check cron status
sudo systemctl status cron

# Check crontab
crontab -l

# Test script manually
cd /var/www/bitchange-pro
node scripts/sweep-monitor-cron.mjs

# Check logs
tail -f /var/log/bitchange/sweep-monitor.log
```

### WebAuthn Not Working

**Common Issues:**
- ❌ Not using HTTPS → WebAuthn requires HTTPS
- ❌ RP ID mismatch → Must match domain exactly
- ❌ Browser not supported → Check browser compatibility
- ❌ Device not supported → Check device has biometric hardware

**Solutions:**
- Verify HTTPS is working: `curl -I https://bitchangemoney.xyz`
- Check browser console for errors
- Test on multiple devices/browsers
- Review `docs/WEBAUTHN_TESTING.md`

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Configure firewall (UFW)
- [ ] Disable root SSH login
- [ ] Setup fail2ban
- [ ] Enable automatic security updates

### Post-Deployment

- [ ] Verify HTTPS is working
- [ ] Test WebAuthn on real devices
- [ ] Configure cold wallet addresses
- [ ] Setup email alerts
- [ ] Test sweep monitoring
- [ ] Backup database
- [ ] Document admin credentials securely

### Ongoing

- [ ] Monitor logs daily
- [ ] Review sweep transactions weekly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly
- [ ] Penetration testing annually

## Performance Optimization

### Database Indexing

Already configured in schema:
- ✅ `coldWallets`: Indexed on `network`, `asset`
- ✅ `sweepTransactions`: Indexed on `status`, `type`, `network`, `createdAt`
- ✅ `walletThresholds`: Indexed on `network`

### Nginx Caching

Add to nginx config:

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### PM2 Cluster Mode

For high traffic:

```bash
pm2 start server/_core/index.ts --name bitchange-pro --interpreter tsx -i max
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (nginx, HAProxy)
- Run multiple PM2 instances
- Use Redis for session storage
- Separate database server

### Vertical Scaling

- Increase VPS resources (RAM, CPU)
- Optimize database queries
- Add database read replicas
- Use CDN for static assets

## Support & Resources

- **Documentation**: `/docs` directory
- **Wallet System**: `docs/WALLET_PRODUCTION_SYSTEM.md`
- **WebAuthn Testing**: `docs/WEBAUTHN_TESTING.md`
- **Cron Setup**: `docs/CRON_SETUP.md`
- **Admin Panel**: https://bitchangemoney.xyz/admin/wallet-management

## Next Steps After Deployment

1. ✅ Add cold wallet addresses
2. ✅ Configure alert emails
3. ✅ Test WebAuthn on all devices
4. ✅ Monitor sweep logs for 24 hours
5. ✅ Perform security audit
6. ✅ Setup monitoring alerts (UptimeRobot, Pingdom)
7. ✅ Document operational procedures
8. ✅ Train team on admin panel

---

**Deployment Complete! 🎉**

Your BitChange Pro platform is now running with enterprise-grade security features:
- 🔐 Cold/Hot Wallet Separation
- 🛡️ Trust Signals for User Confidence
- 🔑 Biometric Authentication (WebAuthn)
- 🔄 Automatic Sweep Monitoring

Monitor the system closely for the first week and adjust thresholds as needed based on actual trading volume.
