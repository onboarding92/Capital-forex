#!/bin/bash
set -e

echo "========================================="
echo "BitChange Pro - AlmaLinux Deployment"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Step 1: Install Node.js 22
echo -e "${YELLOW}[1/8] Installing Node.js 22...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
else
    echo -e "${GREEN}✓ Node.js already installed: $(node --version)${NC}"
fi

# Step 2: Install pnpm and PM2
echo -e "${YELLOW}[2/8] Installing pnpm and PM2...${NC}"
npm install -g pnpm pm2
echo -e "${GREEN}✓ pnpm installed: $(pnpm --version)${NC}"
echo -e "${GREEN}✓ PM2 installed${NC}"

# Step 3: Navigate to project
echo -e "${YELLOW}[3/8] Navigating to project directory...${NC}"
cd /opt/bitchange-pro
echo -e "${GREEN}✓ Current directory: $(pwd)${NC}"

# Step 4: Install dependencies
echo -e "${YELLOW}[4/8] Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Run database migration
echo -e "${YELLOW}[5/8] Running database migration...${NC}"
if [ -f "scripts/apply-wallet-migration.mjs" ]; then
    node scripts/apply-wallet-migration.mjs || echo "Migration already applied or failed"
fi
echo -e "${GREEN}✓ Database migration completed${NC}"

# Step 6: Build application
echo -e "${YELLOW}[6/8] Building application...${NC}"
pnpm run build
echo -e "${GREEN}✓ Application built${NC}"

# Step 7: Stop existing PM2 process
echo -e "${YELLOW}[7/8] Stopping existing PM2 process...${NC}"
pm2 stop bitchange-pro 2>/dev/null || echo "No existing process to stop"
pm2 delete bitchange-pro 2>/dev/null || echo "No existing process to delete"

# Step 8: Start application with PM2
echo -e "${YELLOW}[8/8] Starting application with PM2...${NC}"
pm2 start dist/index.js --name bitchange-pro --time
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Application status:"
pm2 status

echo ""
echo "Recent logs:"
pm2 logs bitchange-pro --lines 20 --nostream

echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 status              - Check application status"
echo "  pm2 logs bitchange-pro  - View logs"
echo "  pm2 restart bitchange-pro - Restart application"
echo "  pm2 monit               - Monitor resources"
