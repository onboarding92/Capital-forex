# BitChange Pro - VPS Deployment Guide

Complete step-by-step guide to deploy BitChange Pro on your VPS server.

## Prerequisites

- VPS server with Ubuntu 20.04+ (minimum 2GB RAM, 2 CPU cores, 20GB storage)
- Root access to the server
- Domain name pointing to your VPS IP (bitchangemoney.xyz)
- SSH access configured

## Server Specifications

- **IP**: 46.224.87.94
- **Domain**: bitchangemoney.xyz
- **OS**: Ubuntu (recommended 22.04 LTS)
- **Minimum Requirements**: 2GB RAM, 2 CPU, 20GB SSD

## Quick Deployment (Automated)

### 1. Connect to your VPS

```bash
ssh root@46.224.87.94
```

### 2. Clone the repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/bitchange-pro.git
cd bitchange-pro
```

### 3. Create .env file

```bash
nano .env
```

Copy and fill in the required variables (see ENV.md for details):

```bash
# Required variables
DATABASE_URL=mysql://bitchange:YOUR_DB_PASSWORD@db:3306/bitchange_pro
JWT_SECRET=$(openssl rand -base64 32)
WALLET_MASTER_SEED=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@bitchangemoney.xyz
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD
DB_PASSWORD=YOUR_DB_PASSWORD
DB_ROOT_PASSWORD=YOUR_ROOT_PASSWORD

# Domain
DOMAIN=bitchangemoney.xyz
FRONTEND_URL=https://bitchangemoney.xyz
BACKEND_URL=https://bitchangemoney.xyz/api
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 4. Run deployment script

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
- Install Docker & Docker Compose
- Setup SSL certificates with Let's Encrypt
- Build and start all containers
- Run database migrations
- Seed initial data

### 5. Verify deployment

```bash
docker-compose ps
```

All containers should show "Up" status.

Visit: https://bitchangemoney.xyz

## Manual Deployment (Step by Step)

If you prefer manual control:

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Setup SSL Certificates

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d bitchangemoney.xyz -d www.bitchangemoney.xyz
```

Copy certificates:

```bash
mkdir -p ssl
sudo cp /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem ssl/
```

### 4. Create .env file

See step 3 in Quick Deployment above.

### 5. Build and start containers

```bash
docker-compose build
docker-compose up -d
```

### 6. Run database migrations

```bash
docker-compose exec app pnpm db:push
```

### 7. Seed staking plans (optional)

```bash
docker-compose exec app node scripts/seed-staking.mjs
```

## Post-Deployment Configuration

### 1. Create Admin User

The admin user should be created automatically on first run using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from .env.

To manually create an admin user:

```bash
docker-compose exec db mysql -u bitchange -p bitchange_pro
```

Enter the database password, then:

```sql
INSERT INTO users (email, password, role, kycStatus, createdAt) 
VALUES ('admin@bitchangemoney.xyz', 'HASHED_PASSWORD', 'admin', 'approved', NOW());
```

**Note**: You'll need to hash the password first. Better to implement a seed script for this.

### 2. Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Setup Auto-Renewal for SSL

```bash
echo "0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem /root/bitchange-pro/ssl/ && cp /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem /root/bitchange-pro/ssl/ && cd /root/bitchange-pro && docker-compose restart nginx" | crontab -
```

### 4. Configure Payment Gateways

Add API keys to .env file:

```bash
nano .env
```

Add your payment gateway credentials (see ENV.md for all available options).

Restart containers:

```bash
docker-compose restart app
```

### 5. Configure Email (Optional)

For email notifications, password reset, etc., add SMTP settings to .env:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@bitchangemoney.xyz
```

Restart:

```bash
docker-compose restart app
```

## Maintenance Commands

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f nginx
```

### Restart services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart app
```

### Stop all services

```bash
docker-compose down
```

### Update application

```bash
cd /root/bitchange-pro
git pull
docker-compose build --no-cache
docker-compose up -d
docker-compose exec app pnpm db:push
```

### Backup database

```bash
docker-compose exec db mysqldump -u bitchange -p bitchange_pro > backup_$(date +%Y%m%d).sql
```

### Restore database

```bash
docker-compose exec -T db mysql -u bitchange -p bitchange_pro < backup_20241217.sql
```

### Check container status

```bash
docker-compose ps
```

### Check disk usage

```bash
docker system df
```

### Clean up unused Docker resources

```bash
docker system prune -a
```

## Monitoring

### Check application health

```bash
curl http://localhost:3000/health
```

### Monitor resource usage

```bash
docker stats
```

### Check Nginx access logs

```bash
docker-compose logs nginx | grep "GET /"
```

## Troubleshooting

### Container won't start

```bash
docker-compose logs app
```

Check for errors in the logs.

### Database connection issues

```bash
docker-compose exec app env | grep DATABASE_URL
```

Verify DATABASE_URL is correct.

### SSL certificate issues

```bash
sudo certbot certificates
```

Check certificate expiry and renewal.

### Port already in use

```bash
sudo lsof -i :80
sudo lsof -i :443
```

Kill the process using the port or change the port in docker-compose.yml.

### Out of disk space

```bash
df -h
docker system prune -a
```

## Security Checklist

- [ ] Changed default passwords in .env
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Database password is strong and unique
- [ ] JWT_SECRET is random and secure (32+ characters)
- [ ] WALLET_MASTER_SEED is random and backed up securely
- [ ] Admin password is strong
- [ ] Regular backups configured
- [ ] Monitoring setup (optional: Grafana, Prometheus)
- [ ] Rate limiting configured in Nginx (already done)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)

## Performance Optimization

### Enable Redis for caching (optional)

Add to docker-compose.yml:

```yaml
redis:
  image: redis:alpine
  container_name: bitchange-redis
  restart: always
  networks:
    - bitchange-network
```

### Increase worker processes in Nginx

Edit nginx.conf:

```nginx
events {
    worker_connections 2048;
}
```

### Database optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallets_userId ON wallets(userId);
CREATE INDEX idx_orders_userId ON orders(userId);
```

## Scaling for 100+ Users/Day

Current configuration should handle 100+ users easily. For higher traffic:

1. **Increase server resources**: Upgrade to 4GB RAM, 4 CPU cores
2. **Add load balancer**: Use Nginx load balancing for multiple app instances
3. **Database optimization**: Add read replicas, optimize queries
4. **CDN**: Use Cloudflare for static assets
5. **Monitoring**: Setup Grafana + Prometheus for metrics

## Support

For issues or questions:
- Check logs: `docker-compose logs -f app`
- Review ENV.md for configuration
- Check GitHub issues
- Contact: admin@bitchangemoney.xyz

## Next Steps

After successful deployment:

1. ✅ Test all features (trading, staking, deposits, withdrawals, KYC)
2. ✅ Create test user account
3. ✅ Verify admin panel access
4. ✅ Test payment gateway integration
5. ✅ Setup monitoring and alerts
6. ✅ Configure backup automation
7. ✅ Add custom branding/logo
8. ✅ Review security settings
9. ✅ Test email notifications
10. ✅ Announce launch! 🚀
