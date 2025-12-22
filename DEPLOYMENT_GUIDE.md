# Capital Forex - VPS Deployment Guide

Complete guide for deploying Capital Forex on a VPS (Ubuntu 22.04 LTS).

---

## Prerequisites

- **VPS Requirements:**
  - Ubuntu 22.04 LTS
  - 2+ CPU cores
  - 4GB+ RAM
  - 40GB+ SSD storage
  - Root or sudo access

- **Domain:**
  - Domain name pointed to VPS IP (A record)
  - Example: `capitalforex.com` → `123.456.789.10`

- **Accounts:**
  - GitHub account (for code repository)
  - SendGrid account (for email notifications)
  - MySQL database (local or remote)

---

## Step 1: Initial VPS Setup

### 1.1 Connect to VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Create Non-Root User (Optional but Recommended)

```bash
adduser capitalforex
usermod -aG sudo capitalforex
su - capitalforex
```

---

## Step 2: Install Dependencies

### 2.1 Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v22.x.x
```

### 2.2 Install pnpm

```bash
npm install -g pnpm
pnpm --version
```

### 2.3 Install MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

**Configure MySQL:**

```bash
sudo mysql

# Create database and user
CREATE DATABASE capital_forex;
CREATE USER 'capitalforex'@'localhost' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON capital_forex.* TO 'capitalforex'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.4 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.5 Install PM2

```bash
sudo npm install -g pm2
pm2 startup
# Run the command it outputs
```

### 2.6 Install Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 3: Clone and Setup Application

### 3.1 Clone Repository

```bash
cd /home/capitalforex
git clone https://github.com/onboarding92/Capital-forex.git
cd Capital-forex
```

### 3.2 Install Dependencies

```bash
pnpm install
```

### 3.3 Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=mysql://capitalforex:your-password@localhost:3306/capital_forex

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
NODE_ENV=production
PORT=3000
DOMAIN=capitalforex.com

# SendGrid Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@capitalforex.com
SENDGRID_FROM_NAME=Capital Forex

# OAuth (Manus - if using)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=your-app-id

# Optional: Redis (for caching)
# REDIS_URL=redis://localhost:6379
```

---

## Step 4: Database Setup

### 4.1 Run Migrations

```bash
pnpm db:push
```

### 4.2 Seed Forex Data

```bash
node scripts/seed-forex-pairs.mjs
node scripts/seed-swap-rates.mjs
```

### 4.3 Create Admin User (Optional)

```bash
# First registered user becomes admin automatically
# Or manually update in database:
mysql -u capitalforex -p capital_forex

UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
EXIT;
```

---

## Step 5: Build Application

```bash
pnpm build
```

This creates:
- `dist/` - Production server bundle
- `client/dist/` - Production client bundle

---

## Step 6: Configure PM2

### 6.1 Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'capital-forex',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

### 6.2 Start Application

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
```

### 6.3 Verify Application

```bash
pm2 status
pm2 logs capital-forex
curl http://localhost:3000
```

---

## Step 7: Configure Nginx

### 7.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/capitalforex.com
```

```nginx
server {
    listen 80;
    server_name capitalforex.com www.capitalforex.com;

    # Redirect HTTP to HTTPS (will be configured by Certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name capitalforex.com www.capitalforex.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/capitalforex.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/capitalforex.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Proxy to Node.js application
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/capitalforex.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Configure SSL (Let's Encrypt)

### 8.1 Obtain SSL Certificate

```bash
sudo certbot --nginx -d capitalforex.com -d www.capitalforex.com
```

Follow the prompts:
- Enter email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 8.2 Test SSL Configuration

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=capitalforex.com

Target: **A+ rating**

### 8.3 Auto-Renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Step 9: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Step 10: Setup Monitoring

### 10.1 PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 10.2 System Monitoring

```bash
# Install htop
sudo apt install -y htop

# Monitor resources
htop

# Monitor logs
pm2 logs capital-forex
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Step 11: Post-Deployment Tasks

### 11.1 Test Application

1. Visit https://capitalforex.com
2. Register new account
3. Test trading functionality
4. Test deposit/withdrawal pages
5. Test admin panel (if admin)

### 11.2 Setup Backups

**Database Backup Script:**

```bash
nano ~/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/capitalforex/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u capitalforex -p'your-password' capital_forex > $BACKUP_DIR/capital_forex_$DATE.sql
gzip $BACKUP_DIR/capital_forex_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

```bash
chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/capitalforex/backup-db.sh
```

---

## Step 12: Updating Application

### 12.1 Pull Latest Code

```bash
cd /home/capitalforex/Capital-forex
git pull origin main
```

### 12.2 Install Dependencies

```bash
pnpm install
```

### 12.3 Run Migrations

```bash
pnpm db:push
```

### 12.4 Rebuild

```bash
pnpm build
```

### 12.5 Restart Application

```bash
pm2 restart capital-forex
pm2 logs capital-forex
```

---

## Troubleshooting

### Application Not Starting

```bash
pm2 logs capital-forex --lines 100
```

### Database Connection Issues

```bash
mysql -u capitalforex -p capital_forex
# Test connection
```

### Nginx Issues

```bash
sudo nginx -t
sudo systemctl status nginx
tail -f /var/log/nginx/error.log
```

### SSL Issues

```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

---

## Security Checklist

- [ ] Strong database password
- [ ] Unique JWT secret
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed (A+ rating)
- [ ] Regular backups configured
- [ ] PM2 process monitoring
- [ ] Log rotation enabled
- [ ] Security headers in Nginx
- [ ] Non-root user for application
- [ ] SSH key authentication (disable password login)

---

## Performance Optimization

### Enable Redis Caching

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Add to .env
REDIS_URL=redis://localhost:6379
```

### MySQL Optimization

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add:
```ini
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
query_cache_size = 0
query_cache_type = 0
```

```bash
sudo systemctl restart mysql
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/onboarding92/Capital-forex/issues
- Email: support@capitalforex.com

---

**Deployment completed! Your Capital Forex platform is now live! 🚀**
