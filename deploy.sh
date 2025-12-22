#!/bin/bash

# BitChange Pro - VPS Deployment Script
# This script automates the deployment process on your VPS

set -e  # Exit on error

echo "🚀 BitChange Pro Deployment Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 3: Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Step 4: Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please create .env file with required variables (see ENV.md)"
    exit 1
fi

# Step 5: Create necessary directories
echo -e "${YELLOW}Step 4: Creating directories...${NC}"
mkdir -p /var/www/bitchange-pro/uploads
mkdir -p ssl
chmod 755 /var/www/bitchange-pro/uploads

# Step 6: Setup SSL certificates with Let's Encrypt
echo -e "${YELLOW}Step 5: Setting up SSL certificates...${NC}"
if [ ! -f ssl/fullchain.pem ]; then
    echo "Installing certbot..."
    apt install -y certbot
    
    echo -e "${YELLOW}Obtaining SSL certificate for bitchangemoney.xyz...${NC}"
    echo "Make sure your domain DNS is pointing to this server!"
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    certbot certonly --standalone -d bitchangemoney.xyz -d www.bitchangemoney.xyz
    
    # Copy certificates to ssl directory
    cp /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem ssl/
    cp /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem ssl/
    
    # Setup auto-renewal
    echo "0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem /root/bitchange-pro/ssl/ && cp /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem /root/bitchange-pro/ssl/ && docker-compose restart nginx" | crontab -
else
    echo -e "${GREEN}SSL certificates already exist${NC}"
fi

# Step 7: Build and start containers
echo -e "${YELLOW}Step 6: Building and starting Docker containers...${NC}"
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Step 8: Wait for database to be ready
echo -e "${YELLOW}Step 7: Waiting for database to be ready...${NC}"
sleep 10

# Step 9: Run database migrations
echo -e "${YELLOW}Step 8: Running database migrations...${NC}"
docker-compose exec -T app pnpm db:push

# Step 10: Seed staking plans
echo -e "${YELLOW}Step 9: Seeding staking plans...${NC}"
docker-compose exec -T app node scripts/seed-staking.mjs || echo "Staking plans already seeded or script not found"

# Step 11: Check container status
echo -e "${YELLOW}Step 10: Checking container status...${NC}"
docker-compose ps

# Step 12: Show logs
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "📝 Recent logs:"
docker-compose logs --tail=50 app
echo ""
echo -e "${GREEN}✅ BitChange Pro is now running!${NC}"
echo ""
echo "🌐 Access your exchange at: https://bitchangemoney.xyz"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Restart: docker-compose restart"
echo "  - Stop: docker-compose down"
echo "  - Update: git pull && docker-compose up -d --build"
echo ""
echo "🔐 Don't forget to:"
echo "  1. Create admin user in database (see DEPLOYMENT.md)"
echo "  2. Configure payment gateway APIs in .env"
echo "  3. Setup email SMTP in .env"
echo "  4. Configure firewall (ufw allow 80,443/tcp)"
