# 🚀 Quick Start - BitChange Pro Deployment

Deploy your exchange on **bitchangemoney.xyz** in 10 minutes!

## Prerequisites

✅ VPS server (Ubuntu 20.04+, 2GB RAM minimum)  
✅ Domain **bitchangemoney.xyz** with DNS A record pointing to your VPS IP  
✅ SSH access to your VPS  

## Step 1: Download Project Files

**Option A - From Manus UI:**
1. Go to Management UI → "Code" tab
2. Click "Download All Files"
3. Extract ZIP on your computer

**Option B - From GitHub:**
```bash
git clone https://github.com/YOUR_USERNAME/bitchange-pro.git
```

## Step 2: Upload to VPS

```bash
# From your computer, upload to VPS
scp -r bitchange-pro root@YOUR_VPS_IP:/root/

# Or clone directly on VPS
ssh root@YOUR_VPS_IP
cd /root
git clone https://github.com/YOUR_USERNAME/bitchange-pro.git
cd bitchange-pro
```

## Step 3: Configure Environment

```bash
# Copy production template
cp .env.production.example .env

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "WALLET_MASTER_SEED=$(openssl rand -hex 32)" >> .env

# Edit .env file
nano .env
```

**Fill in these REQUIRED values:**
```bash
DATABASE_URL=mysql://bitchange:YOUR_DB_PASSWORD@db:3306/bitchange_pro
DB_PASSWORD=YOUR_DB_PASSWORD
DB_ROOT_PASSWORD=YOUR_ROOT_PASSWORD
JWT_SECRET=<already generated>
WALLET_MASTER_SEED=<already generated>
ADMIN_EMAIL=admin@bitchangemoney.xyz
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD
```

**Domain is already configured:**
```bash
DOMAIN=bitchangemoney.xyz
FRONTEND_URL=https://bitchangemoney.xyz
BACKEND_URL=https://bitchangemoney.xyz/api
```

Save with `Ctrl+X`, `Y`, `Enter`

## Step 4: Run Automated Deployment

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
- ✅ Install Docker & Docker Compose
- ✅ Setup SSL certificates for bitchangemoney.xyz
- ✅ Build all containers (app, MySQL, Nginx)
- ✅ Run database migrations
- ✅ Seed initial data
- ✅ Start all services

**Deployment takes ~5-10 minutes**

## Step 5: Verify Deployment

```bash
# Check containers are running
docker-compose ps

# View logs
docker-compose logs -f app
```

All containers should show "Up" status.

## Step 6: Access Your Exchange

🌐 **Visit:** https://bitchangemoney.xyz

🔐 **Admin Login:**
- Email: admin@bitchangemoney.xyz
- Password: (the one you set in .env)

## Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test wallet creation
- [ ] Test trading system
- [ ] Test deposit addresses generation
- [ ] Test KYC document upload
- [ ] Access admin panel (/admin)
- [ ] Configure firewall: `sudo ufw allow 80,443/tcp`
- [ ] Setup backup automation
- [ ] Add payment gateway APIs (optional)
- [ ] Configure email SMTP (optional)

## Common Commands

```bash
# View logs
docker-compose logs -f app

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Update application
git pull
docker-compose build --no-cache
docker-compose up -d

# Backup database
docker-compose exec db mysqldump -u bitchange -p bitchange_pro > backup.sql
```

## Troubleshooting

**SSL certificate failed?**
- Verify DNS A record points to your VPS IP
- Wait 5-10 minutes for DNS propagation
- Run: `sudo certbot certonly --standalone -d bitchangemoney.xyz`

**Container won't start?**
- Check logs: `docker-compose logs app`
- Verify .env file has all required values
- Check disk space: `df -h`

**Can't access website?**
- Check firewall: `sudo ufw status`
- Open ports: `sudo ufw allow 80,443/tcp`
- Check Nginx: `docker-compose logs nginx`

## What's Missing for Production?

⚠️ **CRITICAL - Authentication System:**

The current system uses **Manus OAuth** which will NOT work on your VPS. You need:

1. **Email/Password Authentication**
   - Independent login/register system
   - Password hashing with bcrypt
   - JWT token generation

2. **Email OTP Verification**
   - Email verification on registration
   - OTP code generation and validation
   - SMTP configuration

3. **Login/Register/Logout Pages**
   - Standalone UI pages
   - Form validation
   - Error handling

4. **Password Recovery**
   - Forgot password flow
   - Reset token generation
   - Email with reset link

**These features are NOT yet implemented.** See AUTHENTICATION.md for implementation guide.

## Optional Enhancements

- **Network Selector**: Add ERC20/TRC20/BEP20 network selection for deposits/withdrawals
- **Matching Engine**: Automatic order execution
- **Email Notifications**: Transaction confirmations, KYC status updates
- **2FA**: Two-factor authentication
- **Trading Charts**: TradingView integration
- **Mobile App**: React Native version

## Need Help?

- 📖 Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🔧 Environment vars: [ENV.md](ENV.md)
- 📧 Support: admin@bitchangemoney.xyz

---

**🎉 Congratulations! Your exchange is live at https://bitchangemoney.xyz**
