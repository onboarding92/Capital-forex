# BitChange Pro - VPS Deployment Guide

## Server Information
- **IP**: 46.224.87.94
- **OS**: AlmaLinux 10.1
- **Domain**: bitchangemoney.xyz
- **User**: root

## Prerequisites
✅ DNS A record configured (bitchangemoney.xyz → 46.224.87.94)
✅ SSH access to VPS
✅ Root privileges

## Deployment Steps

### Step 1: Prepare VPS (Run on VPS)

```bash
# SSH into VPS
ssh root@46.224.87.94

# Run preparation script
bash deploy-vps.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Install required tools (git, curl, openssl, certbot)
- Generate secure secrets (JWT, wallet seed, database passwords)
- Create .env configuration file
- Configure firewall

### Step 2: Upload Application Files

From your local machine or sandbox:

```bash
# Create deployment archive
cd /home/ubuntu/bitchange-pro
tar -czf bitchange-pro.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=uploads \
  --exclude=.manus \
  .

# Upload to VPS
scp bitchange-pro.tar.gz root@46.224.87.94:/opt/

# SSH to VPS and extract
ssh root@46.224.87.94
cd /opt
tar -xzf bitchange-pro.tar.gz -C /opt/bitchange-pro
rm bitchange-pro.tar.gz
```

### Step 3: Deploy Application

```bash
# On VPS
cd /opt/bitchange-pro

# Use production docker-compose
cp docker-compose.production.yml docker-compose.yml
cp Dockerfile.production Dockerfile
cp nginx.production.conf nginx.conf

# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f app
```

### Step 4: Configure SSL Certificate

```bash
# On VPS
# Stop nginx temporarily
docker-compose stop nginx

# Obtain SSL certificate
certbot certonly --standalone -d bitchangemoney.xyz -d www.bitchangemoney.xyz

# Start nginx
docker-compose start nginx

# Setup auto-renewal
echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | crontab -
```

### Step 5: Verify Deployment

1. **Check services**:
```bash
docker-compose ps
# All services should be "Up"
```

2. **Check logs**:
```bash
docker-compose logs -f app
# Should see "Server running on http://localhost:3000"
```

3. **Test website**:
- Open browser: https://bitchangemoney.xyz
- Should see BitChange Pro homepage
- Try registration: https://bitchangemoney.xyz/auth/register

4. **Test admin login**:
- Email: admin@bitchangemoney.xyz
- Password: ChangeMe123! (change immediately!)

### Step 6: Post-Deployment Configuration

#### 6.1 Change Admin Password
```bash
# On VPS
docker-compose exec app node -e "
const bcrypt = require('bcryptjs');
const password = 'YOUR_NEW_SECURE_PASSWORD';
console.log(bcrypt.hashSync(password, 10));
"

# Update in database
docker-compose exec db mysql -u bitchange -p bitchange_pro -e "
UPDATE users SET password='HASH_FROM_ABOVE' WHERE email='admin@bitchangemoney.xyz';
"
```

#### 6.2 Configure SMTP (Optional)
Edit `/opt/bitchange-pro/.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@bitchangemoney.xyz
```

Restart app:
```bash
docker-compose restart app
```

#### 6.3 Configure CoinGecko API (Optional)
Get free API key: https://www.coingecko.com/en/api

Edit `/opt/bitchange-pro/.env`:
```bash
COINGECKO_API_KEY=your_api_key_here
```

Restart app:
```bash
docker-compose restart app
```

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart app
```

### Update Application
```bash
cd /opt/bitchange-pro
git pull origin main  # If using git
docker-compose up -d --build
```

### Database Backup
```bash
# Create backup
docker-compose exec db mysqldump -u bitchange -p bitchange_pro > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T db mysql -u bitchange -p bitchange_pro < backup_20241218.sql
```

### View Database
```bash
docker-compose exec db mysql -u bitchange -p bitchange_pro
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs app

# Check if port is in use
netstat -tulpn | grep 3000

# Restart all services
docker-compose down && docker-compose up -d
```

### SSL certificate issues
```bash
# Check certificate
certbot certificates

# Renew manually
certbot renew --force-renewal
docker-compose restart nginx
```

### Database connection issues
```bash
# Check database is running
docker-compose ps db

# Test connection
docker-compose exec app node -e "
const mysql = require('mysql2/promise');
mysql.createConnection(process.env.DATABASE_URL).then(() => console.log('✅ Connected'));
"
```

### Out of disk space
```bash
# Clean Docker
docker system prune -a --volumes

# Check disk usage
df -h
du -sh /opt/bitchange-pro/*
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Configured firewall (ports 80, 443 only)
- [ ] SSL certificate installed and auto-renewing
- [ ] Database passwords are strong and unique
- [ ] JWT_SECRET and WALLET_MASTER_SEED are secure
- [ ] .env file has restricted permissions (chmod 600)
- [ ] Regular backups configured
- [ ] Monitoring/alerts configured
- [ ] Rate limiting enabled (via nginx)

## Performance Optimization

### Enable Redis Caching (Optional)
Add to docker-compose.yml:
```yaml
redis:
  image: redis:alpine
  container_name: bitchange_redis
  restart: always
  networks:
    - bitchange_network
```

### Scale Application
```bash
# Run multiple app instances
docker-compose up -d --scale app=3
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation in `/opt/bitchange-pro/README.md`
- Check known issues: `/opt/bitchange-pro/KNOWN_ISSUES.md`

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 443 | https://bitchangemoney.xyz |
| API | 443 | https://bitchangemoney.xyz/api |
| Database | 3306 | localhost:3306 (internal) |
| Nginx | 80, 443 | - |

**Default Credentials:**
- Admin Email: admin@bitchangemoney.xyz
- Admin Password: ChangeMe123! (CHANGE IMMEDIATELY!)
