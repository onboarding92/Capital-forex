# VPS Deployment Test Documentation

## Overview

This document provides a comprehensive testing procedure for deploying BitChange Pro to a production VPS. Follow these steps to verify that all deployment automation scripts work correctly and the application is production-ready.

## Prerequisites

### Required Resources

- **VPS Provider**: DigitalOcean, Linode, Vultr, AWS EC2, or similar
- **VPS Specifications**:
  - OS: Ubuntu 22.04 LTS (fresh install)
  - RAM: Minimum 2GB (4GB recommended)
  - CPU: 2 vCPUs minimum
  - Storage: 20GB SSD minimum
  - Network: Public IPv4 address

- **Domain**: Registered domain with DNS access
- **Email**: SendGrid account for email alerts
- **Database**: TiDB Cloud or MySQL 8.0+ instance

### Local Requirements

- SSH client (OpenSSH, PuTTY, etc.)
- rsync or git for file transfer
- Text editor for .env configuration

## Phase 1: VPS Provisioning (15 minutes)

### 1.1 Create VPS Instance

**DigitalOcean Example:**
```bash
# Create droplet via CLI (optional)
doctl compute droplet create bitchange-pro \
  --region nyc3 \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --ssh-keys YOUR_SSH_KEY_ID

# Or use web interface:
# 1. Go to https://cloud.digitalocean.com/droplets/new
# 2. Choose Ubuntu 22.04 LTS
# 3. Select $24/month plan (2 vCPUs, 4GB RAM)
# 4. Add your SSH key
# 5. Create droplet
```

**AWS EC2 Example:**
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx
```

### 1.2 Configure DNS

**Add A Record:**
```
Type: A
Name: @ (or your subdomain)
Value: YOUR_VPS_IP_ADDRESS
TTL: 300 (5 minutes)

Type: A
Name: www
Value: YOUR_VPS_IP_ADDRESS
TTL: 300
```

**Verify DNS Propagation:**
```bash
# Check DNS resolution
dig your-domain.com +short
# Should return: YOUR_VPS_IP_ADDRESS

# Check from multiple locations
nslookup your-domain.com 8.8.8.8
```

**Wait Time:** DNS propagation can take 5-30 minutes

### 1.3 Initial SSH Access

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Create non-root user (recommended)
adduser ubuntu
usermod -aG sudo ubuntu
rsync --archive --chown=ubuntu:ubuntu ~/.ssh /home/ubuntu

# Test sudo access
su - ubuntu
sudo apt update
```

## Phase 2: VPS Environment Setup (30 minutes)

### 2.1 Upload Setup Script

**Option A: Direct Upload**
```bash
# From local machine
scp scripts/setup-vps.sh root@YOUR_VPS_IP:/tmp/

# On VPS
ssh root@YOUR_VPS_IP
chmod +x /tmp/setup-vps.sh
```

**Option B: Download from Repository**
```bash
# On VPS
curl -fsSL https://raw.githubusercontent.com/your-repo/bitchange-pro/main/scripts/setup-vps.sh -o /tmp/setup-vps.sh
chmod +x /tmp/setup-vps.sh
```

### 2.2 Run Setup Script

```bash
# Execute setup script
sudo /tmp/setup-vps.sh

# Expected output:
# [INFO] Starting VPS setup for BitChange Pro...
# [INFO] Updating system packages...
# [SUCCESS] System updated
# [INFO] Installing Node.js 22.x...
# [SUCCESS] Node.js installed: v22.13.0
# [INFO] Installing pnpm...
# [SUCCESS] pnpm installed: 9.x
# ... (continues for ~5-10 minutes)
# [SUCCESS] VPS setup completed successfully!
```

### 2.3 Verify Installation

```bash
# Check Node.js
node --version
# Expected: v22.13.0 or higher

# Check pnpm
pnpm --version
# Expected: 9.x

# Check PM2
pm2 --version
# Expected: 5.x

# Check Nginx
nginx -v
# Expected: nginx/1.18.0 or higher

# Check Certbot
certbot --version
# Expected: certbot 1.x

# Check firewall
sudo ufw status
# Expected: Status: active
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW       Anywhere
# Nginx Full                 ALLOW       Anywhere

# Check Fail2ban
sudo systemctl status fail2ban
# Expected: active (running)

# Check swap
free -h
# Expected: Swap: 2.0Gi

# Check project directories
ls -la /var/www/bitchange-pro
ls -la /var/log/bitchange-pro
ls -la /var/backups/bitchange-pro
```

**✅ Checkpoint:** All components installed and verified

## Phase 3: Project Deployment (20 minutes)

### 3.1 Upload Project Files

**Option A: rsync (Recommended)**
```bash
# From local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /path/to/bitchange-pro/ \
  ubuntu@YOUR_VPS_IP:/var/www/bitchange-pro/

# Verify upload
ssh ubuntu@YOUR_VPS_IP "ls -la /var/www/bitchange-pro"
```

**Option B: Git Clone**
```bash
# On VPS
cd /var/www/bitchange-pro
git clone https://github.com/your-repo/bitchange-pro.git .

# Or use private repo with SSH key
git clone git@github.com:your-repo/bitchange-pro.git .
```

### 3.2 Configure Environment

```bash
# On VPS
cd /var/www/bitchange-pro
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-generated-secret-here"

# OAuth (Manus)
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="your-manus-app-id"

# Email (SendGrid)
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@your-domain.com"
SENDGRID_FROM_NAME="BitChange Pro"

# App Configuration
VITE_APP_TITLE="BitChange Pro"
VITE_APP_LOGO="/logo.svg"
VITE_APP_DOMAIN="your-domain.com"
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

**Verify .env file:**
```bash
# Check file exists and has correct permissions
ls -la .env
# Expected: -rw------- 1 ubuntu ubuntu (600 permissions)

# Verify required variables
grep -E "DATABASE_URL|JWT_SECRET|SENDGRID_API_KEY" .env
```

### 3.3 Run Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh production

# Expected output (10-15 minutes):
# [INFO] Starting deployment for environment: production
# [INFO] Checking prerequisites...
# [SUCCESS] All prerequisites met
# [INFO] Creating project directories...
# [SUCCESS] Directories created
# [INFO] Installing dependencies...
# (pnpm install output)
# [SUCCESS] Dependencies installed
# [INFO] Running database migration...
# 🔗 Connecting to database...
# ✅ Connected to database
# ✅ Migration completed successfully!
# [SUCCESS] Database migration completed
# [INFO] Building application...
# (pnpm build output)
# [SUCCESS] Application built successfully
# [INFO] Setting up PM2...
# [SUCCESS] PM2 configured and application started
# [INFO] Setting up Nginx...
# [SUCCESS] Nginx configured
# [INFO] Setting up SSL certificate...
# [SUCCESS] SSL certificate installed
# [INFO] Setting up cron jobs...
# [SUCCESS] Cron jobs configured
# [INFO] Verifying deployment...
# [SUCCESS] Deployment verified
# 
# ==========================================
#   🎉 Deployment Complete!
# ==========================================
```

**✅ Checkpoint:** Application deployed and running

## Phase 4: Deployment Verification (15 minutes)

### 4.1 Check Application Status

```bash
# PM2 status
pm2 status
# Expected output:
# ┌─────┬──────────────────┬─────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ mode    │ ↺       │ status  │ cpu      │
# ├─────┼──────────────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0   │ bitchange-pro    │ fork    │ 0       │ online  │ 0%       │
# └─────┴──────────────────┴─────────┴─────────┴─────────┴──────────┘

# Check logs
pm2 logs bitchange-pro --lines 50
# Expected: No errors, server running on port 3000

# Check port
netstat -tuln | grep 3000
# Expected: tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
```

### 4.2 Check Nginx

```bash
# Nginx status
sudo systemctl status nginx
# Expected: active (running)

# Test configuration
sudo nginx -t
# Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
# Expected: No errors
```

### 4.3 Check SSL Certificate

```bash
# List certificates
sudo certbot certificates
# Expected output:
# Found the following certs:
#   Certificate Name: your-domain.com
#     Serial Number: ...
#     Domains: your-domain.com www.your-domain.com
#     Expiry Date: ... (VALID: 89 days)

# Test SSL
curl -I https://your-domain.com
# Expected: HTTP/2 200
```

### 4.4 Check Database

```bash
# Test database connection
cd /var/www/bitchange-pro
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection(process.env.DATABASE_URL)
  .then(() => console.log('✅ Database connection successful'))
  .catch(err => console.error('❌ Database connection failed:', err.message));
"

# Check tables
node scripts/apply-wallet-migration.mjs
# Expected: Tables already exist, 6 thresholds configured
```

### 4.5 Check Cron Jobs

```bash
# List cron jobs
crontab -l
# Expected: */10 * * * * cd /var/www/bitchange-pro && /usr/bin/node scripts/sweep-monitor-cron.mjs >> /var/log/bitchange-pro/sweep-monitor.log 2>&1

# Test sweep monitoring script
cd /var/www/bitchange-pro
node scripts/sweep-monitor-cron.mjs
# Expected: Script runs without errors

# Check logs
tail -f /var/log/bitchange-pro/sweep-monitor.log
# Expected: Sweep monitoring logs appear
```

### 4.6 Test Application Access

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://your-domain.com
# Expected: HTTP/1.1 301 Moved Permanently
#           Location: https://your-domain.com

# Test HTTPS
curl -I https://your-domain.com
# Expected: HTTP/2 200

# Test API endpoint
curl https://your-domain.com/api/trpc/auth.me
# Expected: {"result":{"data":null}} or user data if logged in

# Test from browser
# Open: https://your-domain.com
# Expected: Homepage loads correctly
```

**✅ Checkpoint:** All services verified and working

## Phase 5: Functional Testing (20 minutes)

### 5.1 Test User Registration

```
1. Navigate to https://your-domain.com
2. Click "Sign Up" or "Register"
3. Complete registration form
4. Verify email confirmation (if enabled)
5. Login with new account

✅ Expected: User can register and login successfully
```

### 5.2 Test Trading Features

```
1. Login to user account
2. Navigate to Trading page
3. Select trading pair (e.g., BTC/USDT)
4. Place a buy order
5. Place a sell order
6. Check order history

✅ Expected: Orders placed successfully, appear in history
```

### 5.3 Test Deposit/Withdrawal

```
1. Navigate to Deposit page
2. Select network (e.g., BTC)
3. Generate deposit address
4. Verify TrustSignals component displays
5. Navigate to Withdrawal page
6. Enter withdrawal details
7. Submit withdrawal request

✅ Expected: Deposit address generated, withdrawal submitted
```

### 5.4 Test Admin Panel

```
1. Login with admin account
2. Navigate to /admin
3. Check Users tab
4. Check Trading tab
5. Check Wallet Management tab
6. Verify all data loads correctly

✅ Expected: Admin panel accessible, all tabs functional
```

### 5.5 Test WebAuthn (Requires HTTPS)

```
1. Login to user account
2. Navigate to Account Settings
3. Scroll to "Biometric Authentication"
4. Click "Register New Device"
5. Follow browser prompts (Face ID/Touch ID/Windows Hello)
6. Verify device appears in list

✅ Expected: Device registered successfully
```

**✅ Checkpoint:** All features tested and working

## Phase 6: Security Verification (10 minutes)

### 6.1 Check Security Headers

```bash
# Test security headers
curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Content-Security-Policy"

# Expected output:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: no-referrer-when-downgrade
# Content-Security-Policy: default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';
```

### 6.2 Check Firewall

```bash
# Check UFW status
sudo ufw status verbose

# Expected output:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp (OpenSSH)           ALLOW IN    Anywhere
# 80/tcp (Nginx Full)        ALLOW IN    Anywhere
# 443/tcp (Nginx Full)       ALLOW IN    Anywhere
```

### 6.3 Check Fail2ban

```bash
# Check Fail2ban status
sudo fail2ban-client status

# Expected output:
# Status
# |- Number of jail:      4
# `- Jail list:   nginx-badbots, nginx-http-auth, nginx-noscript, sshd

# Check SSH jail
sudo fail2ban-client status sshd
# Expected: No banned IPs (unless there were failed login attempts)
```

### 6.4 Check SSL Configuration

```bash
# Test SSL with ssllabs (online)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
# Expected: A or A+ rating

# Or use testssl.sh
git clone --depth 1 https://github.com/drwetter/testssl.sh.git
cd testssl.sh
./testssl.sh https://your-domain.com

# Expected: No critical vulnerabilities
```

**✅ Checkpoint:** Security measures verified

## Phase 7: Performance Testing (10 minutes)

### 7.1 Load Testing

```bash
# Install Apache Bench (if not installed)
sudo apt install apache2-utils

# Test homepage
ab -n 1000 -c 10 https://your-domain.com/

# Expected output:
# Requests per second:    XXX [#/sec] (mean)
# Time per request:       XX.XXX [ms] (mean)
# Failed requests:        0

# Test API endpoint
ab -n 1000 -c 10 https://your-domain.com/api/trpc/auth.me

# Expected: Similar performance, no failures
```

### 7.2 Resource Usage

```bash
# Check system resources
htop

# Expected:
# - CPU usage: < 50% under normal load
# - Memory usage: < 70% of available RAM
# - Swap usage: Minimal or none

# Check disk usage
df -h

# Expected:
# /dev/vda1       20G    5.0G   14G   27% /
# (At least 50% free space)

# Check PM2 resource usage
pm2 monit

# Expected:
# bitchange-pro: CPU < 10%, Memory < 500MB
```

### 7.3 Response Time

```bash
# Test response time
time curl -s https://your-domain.com > /dev/null

# Expected: real    0m0.XXXs (< 1 second)

# Test API response time
time curl -s https://your-domain.com/api/trpc/auth.me > /dev/null

# Expected: real    0m0.XXXs (< 500ms)
```

**✅ Checkpoint:** Performance verified

## Deployment Verification Checklist

Use this checklist to verify all aspects of the deployment:

### Infrastructure
- [ ] VPS provisioned with Ubuntu 22.04 LTS
- [ ] DNS A records configured and propagated
- [ ] SSH access working
- [ ] Non-root user created with sudo access

### Environment Setup
- [ ] Node.js 22.x installed
- [ ] pnpm installed
- [ ] PM2 installed
- [ ] Nginx installed and running
- [ ] Certbot installed
- [ ] MySQL client installed
- [ ] UFW firewall configured and active
- [ ] Fail2ban installed and running
- [ ] 2GB swap configured
- [ ] Log rotation configured
- [ ] Project directories created

### Application Deployment
- [ ] Project files uploaded
- [ ] .env file configured with all required variables
- [ ] Dependencies installed (pnpm install)
- [ ] Database migration completed
- [ ] Frontend built (pnpm build)
- [ ] PM2 process running
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Cron jobs configured (sweep monitoring)

### Verification
- [ ] Application accessible via HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] PM2 status shows "online"
- [ ] No errors in PM2 logs
- [ ] No errors in Nginx logs
- [ ] Database connection working
- [ ] Cron job executing every 10 minutes

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] Trading features work
- [ ] Deposit page loads with TrustSignals
- [ ] Withdrawal page works
- [ ] Admin panel accessible
- [ ] WebAuthn registration works (on HTTPS)

### Security
- [ ] Security headers present
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] Fail2ban protecting SSH
- [ ] SSL certificate valid (A+ rating)
- [ ] No critical vulnerabilities

### Performance
- [ ] Load testing passed (1000 requests, 0 failures)
- [ ] CPU usage < 50%
- [ ] Memory usage < 70%
- [ ] Response time < 1 second
- [ ] Disk space > 50% free

### Post-Deployment
- [ ] Cold wallet addresses configured
- [ ] Alert emails configured
- [ ] Wallet thresholds adjusted
- [ ] Backup schedule configured
- [ ] Monitoring dashboard accessible
- [ ] Documentation reviewed

## Common Issues and Solutions

### Issue: SSL Certificate Installation Fails

**Symptoms:**
```
Certbot failed to authenticate
Challenge failed for domain your-domain.com
```

**Solutions:**
1. Verify DNS propagation: `dig your-domain.com +short`
2. Check Nginx is running: `sudo systemctl status nginx`
3. Verify port 80 is open: `sudo ufw status | grep 80`
4. Try manual certificate: `sudo certbot certonly --manual -d your-domain.com`

### Issue: PM2 Process Crashes

**Symptoms:**
```
pm2 status shows "errored" or "stopped"
```

**Solutions:**
1. Check logs: `pm2 logs bitchange-pro --err`
2. Verify .env file: `cat .env | grep DATABASE_URL`
3. Test database connection manually
4. Restart process: `pm2 restart bitchange-pro`
5. Check Node.js version: `node --version`

### Issue: Database Connection Fails

**Symptoms:**
```
Error: Failed to connect to database
ECONNREFUSED or ETIMEDOUT
```

**Solutions:**
1. Verify DATABASE_URL format
2. Check database server is accessible: `telnet DB_HOST DB_PORT`
3. Verify SSL is enabled if required
4. Check firewall rules on database server
5. Test with MySQL client: `mysql -h HOST -u USER -p DATABASE`

### Issue: Nginx 502 Bad Gateway

**Symptoms:**
```
curl https://your-domain.com
502 Bad Gateway
```

**Solutions:**
1. Check PM2 status: `pm2 status`
2. Verify app is listening on port 3000: `netstat -tuln | grep 3000`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Restart services: `pm2 restart bitchange-pro && sudo systemctl restart nginx`

### Issue: Cron Job Not Running

**Symptoms:**
```
No logs in /var/log/bitchange-pro/sweep-monitor.log
```

**Solutions:**
1. Verify cron service: `sudo systemctl status cron`
2. Check crontab: `crontab -l`
3. Test script manually: `node scripts/sweep-monitor-cron.mjs`
4. Check script permissions: `ls -la scripts/sweep-monitor-cron.mjs`
5. Verify log directory exists: `ls -la /var/log/bitchange-pro`

## Rollback Procedure

If deployment fails or issues arise:

### 1. Identify Backup

```bash
# List available backups
ls -lh /var/backups/bitchange-pro/

# Expected output:
# backup_20251221_120000.tar.gz
# backup_20251221_130000.tar.gz
```

### 2. Stop Current Application

```bash
# Stop PM2 process
pm2 stop bitchange-pro
pm2 delete bitchange-pro
```

### 3. Restore Backup

```bash
# Extract backup
cd /var/www/bitchange-pro
tar -xzf /var/backups/bitchange-pro/backup_YYYYMMDD_HHMMSS.tar.gz

# Restore dependencies
pnpm install

# Restart application
pm2 start server/_core/index.ts --name bitchange-pro --interpreter tsx
pm2 save
```

### 4. Verify Rollback

```bash
# Check PM2 status
pm2 status

# Check application
curl https://your-domain.com

# Check logs
pm2 logs bitchange-pro --lines 50
```

## Conclusion

Following this test procedure ensures that:
- ✅ All deployment automation scripts work correctly
- ✅ Application is properly configured and running
- ✅ Security measures are in place
- ✅ Performance is acceptable
- ✅ All features are functional

**Estimated Total Time:** 1.5 - 2 hours

**Next Steps After Successful Deployment:**
1. Configure cold wallet addresses (Admin Panel)
2. Setup alert emails
3. Test WebAuthn on real devices
4. Monitor logs for 24 hours
5. Perform security audit
6. Setup external monitoring (UptimeRobot, Pingdom)
