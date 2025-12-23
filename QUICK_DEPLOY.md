# Capital Forex - Quick Deployment Instructions

**VPS:** 46.224.157.152 (Ubuntu 24.04)

---

## 🚀 One-Command Deployment

### Step 1: Connect to VPS

```bash
ssh root@46.224.157.152
# Password: FnEtqffVndpX
```

### Step 2: Run Automated Deployment Script

```bash
curl -sSL https://raw.githubusercontent.com/onboarding92/Capital-forex/main/deploy-vps-auto.sh | bash
```

**OR** if you prefer to review the script first:

```bash
wget https://raw.githubusercontent.com/onboarding92/Capital-forex/main/deploy-vps-auto.sh
chmod +x deploy-vps-auto.sh
./deploy-vps-auto.sh
```

### Step 3: Wait for Completion

The script will automatically:
- ✅ Install Node.js 22, MySQL, Nginx, PM2
- ✅ Create database and user
- ✅ Clone Capital Forex repository
- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Run database migrations
- ✅ Seed 28 forex pairs
- ✅ Build application
- ✅ Start with PM2
- ✅ Configure Nginx
- ✅ Setup firewall

**Duration:** ~5-10 minutes

---

## ✅ After Deployment

### 1. Access Application

Visit: **http://46.224.157.152**

### 2. Register First User

- Click "Start Trading" or "Sign In"
- Register with your email
- **First user becomes admin automatically**

### 3. View Credentials

```bash
cat /root/capital-forex-credentials.txt
```

This file contains:
- Database credentials
- JWT secret
- Application directory
- Useful commands

---

## 🔧 Useful Commands

### Check Application Status

```bash
pm2 status
pm2 logs capital-forex
```

### Restart Application

```bash
pm2 restart capital-forex
```

### View Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Check Database

```bash
mysql -u capitalforex -p capital_forex
# Password in /root/capital-forex-credentials.txt
```

### Update Application

```bash
cd /var/www/capital-forex
git pull origin main
pnpm install
pnpm build
pm2 restart capital-forex
```

---

## 🌐 Setup Custom Domain (Optional)

### 1. Point Domain to VPS

Add A record in your DNS:
```
@ → 46.224.157.152
www → 46.224.157.152
```

### 2. Update Nginx Configuration

```bash
nano /etc/nginx/sites-available/capital-forex
```

Change `server_name` from `_` to your domain:
```nginx
server_name capitalforex.com www.capitalforex.com;
```

### 3. Install SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d capitalforex.com -d www.capitalforex.com
```

Follow prompts and choose to redirect HTTP to HTTPS.

### 4. Update .env

```bash
cd /var/www/capital-forex
nano .env
```

Change:
```env
DOMAIN=capitalforex.com
```

Restart:
```bash
pm2 restart capital-forex
```

---

## 📧 Configure Email (SendGrid)

### 1. Get SendGrid API Key

1. Sign up at https://sendgrid.com/
2. Create API key with "Mail Send" permissions
3. Verify sender email

### 2. Update .env

```bash
cd /var/www/capital-forex
nano .env
```

Add:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@capitalforex.com
SENDGRID_FROM_NAME=Capital Forex
```

### 3. Restart Application

```bash
pm2 restart capital-forex
```

---

## 🔐 Security Checklist

- [x] Firewall enabled (UFW)
- [x] MySQL secured (localhost only)
- [x] Strong database password (auto-generated)
- [x] JWT secret (auto-generated)
- [ ] SSL certificate (optional, for custom domain)
- [ ] Change root password
- [ ] Setup SSH key authentication
- [ ] Disable password login
- [ ] Setup fail2ban
- [ ] Configure automatic backups

---

## 📊 Monitoring

### System Resources

```bash
htop
df -h
free -h
```

### Application Logs

```bash
pm2 logs capital-forex --lines 100
```

### Database Size

```bash
mysql -u capitalforex -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'capital_forex';"
```

---

## 🆘 Troubleshooting

### Application Not Starting

```bash
pm2 logs capital-forex
cd /var/www/capital-forex
cat .env  # Check configuration
```

### Database Connection Error

```bash
mysql -u capitalforex -p capital_forex
# Test connection with password from credentials file
```

### Nginx 502 Bad Gateway

```bash
pm2 status  # Check if app is running
netstat -tlnp | grep 3000  # Check if port 3000 is listening
tail -f /var/log/nginx/error.log
```

### Port Already in Use

```bash
lsof -i :3000
kill -9 <PID>
pm2 restart capital-forex
```

---

## 🔄 Backup & Restore

### Backup Database

```bash
mysqldump -u capitalforex -p capital_forex > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
mysql -u capitalforex -p capital_forex < backup_20250101.sql
```

### Backup Application

```bash
cd /var/www
tar -czf capital-forex-backup-$(date +%Y%m%d).tar.gz capital-forex/
```

---

## 📞 Support

- **GitHub:** https://github.com/onboarding92/Capital-forex
- **Issues:** https://github.com/onboarding92/Capital-forex/issues

---

## ✅ Deployment Checklist

- [ ] Run deployment script
- [ ] Access http://46.224.157.152
- [ ] Register first user (becomes admin)
- [ ] Test trading interface
- [ ] Test deposit/withdrawal pages
- [ ] Configure SendGrid (optional)
- [ ] Setup custom domain (optional)
- [ ] Install SSL certificate (optional)
- [ ] Configure backups
- [ ] Save credentials securely

---

**Your Capital Forex platform will be live in ~10 minutes! 🚀**
