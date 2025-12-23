#!/bin/bash

#############################################
# Capital Forex - Automated VPS Deployment
# Ubuntu 24.04 LTS
#############################################

set -e  # Exit on error

echo "=========================================="
echo "Capital Forex - VPS Deployment Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/onboarding92/Capital-forex.git"
APP_DIR="/var/www/capital-forex"
DB_NAME="capital_forex"
DB_USER="capitalforex"
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}[1/10] Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}[2/10] Installing Node.js 22...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version
npm --version

echo -e "${GREEN}[3/10] Installing pnpm...${NC}"
npm install -g pnpm
pnpm --version

echo -e "${GREEN}[4/10] Installing MySQL...${NC}"
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

echo -e "${GREEN}[5/10] Configuring MySQL database...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo -e "${GREEN}[6/10] Installing Nginx and PM2...${NC}"
apt install -y nginx
systemctl enable nginx
systemctl start nginx
npm install -g pm2
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

echo -e "${GREEN}[7/10] Cloning Capital Forex repository...${NC}"
mkdir -p /var/www
cd /var/www
if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $APP_DIR
    git pull
else
    git clone ${GITHUB_REPO} capital-forex
    cd $APP_DIR
fi

echo -e "${GREEN}[8/10] Installing dependencies...${NC}"
pnpm install

echo -e "${GREEN}[9/10] Configuring environment...${NC}"
cat > .env << EOF
# Database
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# Server
NODE_ENV=production
PORT=3000
DOMAIN=46.224.157.152

# SendGrid Email (configure later)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@capitalforex.com
SENDGRID_FROM_NAME=Capital Forex

# App Branding
VITE_APP_TITLE=Capital Forex
VITE_APP_LOGO=/logo.svg
EOF

echo -e "${GREEN}[10/10] Running database migrations and seeding...${NC}"
pnpm db:push
node scripts/seed-forex-pairs.mjs
node scripts/seed-swap-rates.mjs

echo -e "${GREEN}Building application...${NC}"
pnpm build

echo -e "${GREEN}Starting application with PM2...${NC}"
pm2 delete capital-forex 2>/dev/null || true
pm2 start dist/index.js --name capital-forex --instances max --exec-mode cluster
pm2 save

echo -e "${GREEN}Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/capital-forex << 'NGINXCONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    client_max_body_size 10M;

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

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/capital-forex /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo -e "${GREEN}Configuring firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw status

echo ""
echo "=========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED!${NC}"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "  - Application: http://46.224.157.152"
echo "  - Database: ${DB_NAME}"
echo "  - DB User: ${DB_USER}"
echo "  - DB Password: ${DB_PASS}"
echo "  - JWT Secret: ${JWT_SECRET}"
echo ""
echo "🔐 IMPORTANT: Save these credentials!"
echo ""
echo "📝 Next Steps:"
echo "  1. Visit: http://46.224.157.152"
echo "  2. Register first user (becomes admin)"
echo "  3. Configure SendGrid API key in .env"
echo "  4. Setup domain name (optional)"
echo "  5. Install SSL certificate with certbot"
echo ""
echo "🔧 Useful Commands:"
echo "  - View logs: pm2 logs capital-forex"
echo "  - Restart app: pm2 restart capital-forex"
echo "  - Check status: pm2 status"
echo "  - Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo "=========================================="

# Save credentials to file
cat > /root/capital-forex-credentials.txt << EOF
Capital Forex - Deployment Credentials
Generated: $(date)

Application URL: http://46.224.157.152
Database Name: ${DB_NAME}
Database User: ${DB_USER}
Database Password: ${DB_PASS}
JWT Secret: ${JWT_SECRET}

Application Directory: ${APP_DIR}
Logs: pm2 logs capital-forex

First user registered will become admin automatically.
EOF

echo -e "${YELLOW}Credentials saved to: /root/capital-forex-credentials.txt${NC}"
