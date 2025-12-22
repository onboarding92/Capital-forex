# Environment Variables Configuration

This document lists all environment variables needed for deploying BitChange Pro on your VPS.

## Required Variables

### Database Configuration
```bash
DATABASE_URL=mysql://user:password@localhost:3306/bitchange_pro
```
MySQL connection string. Create database first: `CREATE DATABASE bitchange_pro;`

### JWT Secret
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
Generate with: `openssl rand -base64 32`

### Server Configuration
```bash
NODE_ENV=production
PORT=3000
```

### Domain Configuration
```bash
DOMAIN=bitchangemoney.xyz
FRONTEND_URL=https://bitchangemoney.xyz
BACKEND_URL=https://bitchangemoney.xyz/api
```

### Admin Configuration
```bash
ADMIN_EMAIL=admin@bitchangemoney.xyz
ADMIN_PASSWORD=change-this-secure-password
```
Used to create the first admin user on deployment.

### Wallet Generation Seed
```bash
WALLET_MASTER_SEED=your-master-seed-for-wallet-generation-change-this
```
**CRITICAL**: Keep this secret! Generate with: `openssl rand -hex 32`
This seed is used to generate deterministic wallet addresses for users.

## Optional Variables

### CoinGecko API (for real-time crypto prices)
```bash
COINGECKO_API_KEY=
```
Get free API key at: https://www.coingecko.com/en/api
Without this, the app uses CoinGecko's public API (rate limited).

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@bitchangemoney.xyz
```
For sending verification emails, password resets, notifications.

### File Upload Configuration
```bash
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/var/www/bitchange-pro/uploads
```
Default: 5MB max file size, uploads stored in /var/www/bitchange-pro/uploads

### Security
```bash
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```
Rate limiting: 100 requests per 15 minutes per IP.

## Payment Gateway APIs

Add these when you're ready to integrate real payment gateways:

### ChangeNOW
```bash
CHANGENOW_API_KEY=
```
Get API key at: https://changenow.io/api

### Simplex
```bash
SIMPLEX_API_KEY=
SIMPLEX_PARTNER_ID=
```
Get credentials at: https://www.simplex.com/partners

### MoonPay
```bash
MOONPAY_API_KEY=
MOONPAY_SECRET_KEY=
```
Get credentials at: https://www.moonpay.com/dashboard

### Transak
```bash
TRANSAK_API_KEY=
TRANSAK_ENVIRONMENT=PRODUCTION
```
Get API key at: https://transak.com/

### Mercuryo
```bash
MERCURYO_WIDGET_ID=
MERCURYO_SECRET=
```
Get credentials at: https://mercuryo.io/

### CoinGate
```bash
COINGATE_API_TOKEN=
COINGATE_ENVIRONMENT=live
```
Get API token at: https://coingate.com/

### Changelly
```bash
CHANGELLY_API_KEY=
CHANGELLY_SECRET=
```
Get credentials at: https://changelly.com/

### Banxa
```bash
BANXA_API_KEY=
BANXA_SECRET=
```
Get credentials at: https://banxa.com/

## Creating .env file

1. Copy this template to `.env` file in project root:
```bash
cp ENV.md .env
```

2. Edit `.env` and fill in all required values:
```bash
nano .env
```

3. Make sure `.env` is in `.gitignore` (already configured):
```bash
grep .env .gitignore
```

4. Set proper permissions:
```bash
chmod 600 .env
```

## Notes

- **Never commit `.env` to Git** - it contains sensitive credentials
- **Keep `WALLET_MASTER_SEED` secret** - if leaked, attackers can generate all user wallet addresses
- **Use strong `JWT_SECRET`** - minimum 32 characters, random
- **Change `ADMIN_PASSWORD`** - use a strong password for the admin account
- Payment gateway APIs are optional - the UI will work without them, but users won't be able to complete real transactions
- Email configuration is optional - without it, email verification and password reset won't work
