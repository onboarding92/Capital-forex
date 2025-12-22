#!/bin/bash
set -e

echo "🚀 BitChange Pro - VPS Deployment Script"
echo "=========================================="
echo ""

# Configuration
DOMAIN="bitchangemoney.xyz"
APP_DIR="/opt/bitchange-pro"
DOCKER_COMPOSE_VERSION="2.24.5"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
dnf update -y

# Step 2: Install Docker
echo -e "${YELLOW}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${YELLOW}[3/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Step 4: Install additional tools
echo -e "${YELLOW}[4/8] Installing additional tools...${NC}"
dnf install -y git curl wget openssl certbot python3-certbot-nginx

# Step 5: Create application directory
echo -e "${YELLOW}[5/8] Creating application directory...${NC}"
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Step 6: Generate secrets
echo -e "${YELLOW}[6/8] Generating secrets...${NC}"
JWT_SECRET=$(openssl rand -base64 32)
WALLET_MASTER_SEED=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)
DB_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)

# Step 7: Create .env file
echo -e "${YELLOW}[7/8] Creating environment configuration...${NC}"
cat > ${APP_DIR}/.env << EOF
# Database Configuration
DATABASE_URL=mysql://bitchange:${DB_PASSWORD}@db:3306/bitchange_pro
DB_PASSWORD=${DB_PASSWORD}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}

# Security
JWT_SECRET=${JWT_SECRET}
WALLET_MASTER_SEED=${WALLET_MASTER_SEED}

# Domain Configuration
NODE_ENV=production
PORT=3000
DOMAIN=${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
BACKEND_URL=https://${DOMAIN}/api

# Admin Configuration
ADMIN_EMAIL=admin@${DOMAIN}
ADMIN_PASSWORD=ChangeMe123!

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=${APP_DIR}/uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
EOF

chmod 600 ${APP_DIR}/.env

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Default admin password is 'ChangeMe123!'${NC}"
echo -e "${YELLOW}   Change it immediately after first login!${NC}"
echo ""

# Step 8: Setup firewall
echo -e "${YELLOW}[8/8] Configuring firewall...${NC}"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo -e "${GREEN}✅ Firewall configured${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ VPS preparation complete!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Upload application files to ${APP_DIR}"
echo "2. Run: cd ${APP_DIR} && docker-compose up -d"
echo "3. Configure SSL: certbot --nginx -d ${DOMAIN}"
echo ""
echo "Environment file created at: ${APP_DIR}/.env"
echo ""
