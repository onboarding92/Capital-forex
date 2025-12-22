#!/bin/bash
set -e

echo "========================================="
echo "BitChange Pro - Nginx Setup"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install Nginx
echo -e "${YELLOW}[1/5] Installing Nginx...${NC}"
dnf install -y nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed${NC}"

# Step 2: Create Nginx configuration
echo -e "${YELLOW}[2/5] Creating Nginx configuration...${NC}"
cat > /etc/nginx/conf.d/bitchange.conf << 'EOF'
# Upstream for Node.js application
upstream bitchange_app {
    server localhost:3000;
    keepalive 64;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name bitchangemoney.xyz www.bitchangemoney.xyz;
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bitchangemoney.xyz www.bitchangemoney.xyz;
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/bitchangemoney.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bitchangemoney.xyz/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Max upload size
    client_max_body_size 50M;
    
    # Proxy settings
    location / {
        proxy_pass http://bitchange_app;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Disable cache for dynamic content
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://bitchange_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
EOF
echo -e "${GREEN}✓ Nginx configuration created${NC}"

# Step 3: Test Nginx configuration
echo -e "${YELLOW}[3/5] Testing Nginx configuration...${NC}"
nginx -t
echo -e "${GREEN}✓ Nginx configuration valid${NC}"

# Step 4: Install Certbot for SSL
echo -e "${YELLOW}[4/5] Installing Certbot...${NC}"
dnf install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot installed${NC}"

# Step 5: Start Nginx (without SSL first)
echo -e "${YELLOW}[5/5] Starting Nginx...${NC}"
# Temporarily use HTTP-only config
cat > /etc/nginx/conf.d/bitchange.conf << 'EOF'
upstream bitchange_app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name bitchangemoney.xyz www.bitchangemoney.xyz;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://bitchange_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://bitchange_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
EOF

mkdir -p /var/www/html
systemctl restart nginx
echo -e "${GREEN}✓ Nginx started${NC}"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Nginx setup completed!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test HTTP access: http://bitchangemoney.xyz"
echo "2. Setup SSL certificate:"
echo "   certbot --nginx -d bitchangemoney.xyz -d www.bitchangemoney.xyz"
echo ""
echo "The site should now be accessible via HTTP."
echo "After running certbot, it will be available via HTTPS."
