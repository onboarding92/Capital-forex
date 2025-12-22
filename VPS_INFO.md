# BitChange Pro VPS Information

## VPS Details
- **IP Address:** 46.224.87.94
- **SSH Access:** root@46.224.87.94
- **Password:** UdvAXcUeTPWK
- **Domain:** bitchangemoney.xyz
- **SSL:** Enabled (Let's Encrypt)

## Services Running
- **Web Application:** Port 3000 (Node.js + Express)
- **MySQL Database:** Port 3306 (MySQL 8.0)
- **Redis Cache:** Port 6379
- **Nginx:** Port 80/443 (Reverse Proxy)
- **WebSocket Server:** Port 3000 (Socket.IO)

## Project Directory
`/opt/bitchange-pro`

## Standard Deployment Process

```bash
# 1. SSH into VPS
ssh root@46.224.87.94

# 2. Navigate to project
cd /opt/bitchange-pro

# 3. Pull latest code from GitHub
git pull origin main

# 4. Install dependencies (if package.json changed)
pnpm install

# 5. Run database migrations (if schema changed)
pnpm db:push

# 6. Rebuild and restart containers
docker-compose down
docker-compose build
docker-compose up -d

# 7. Verify deployment
docker ps
docker logs bitchange-pro-app-1 --tail 50

# 8. Check WebSocket server
docker logs bitchange-pro-app-1 2>&1 | grep "WebSocket server started"
```

## Quick Deployment (No Docker Rebuild)
```bash
# If only code changes, no dependencies or schema changes
cd /opt/bitchange-pro
git pull origin main
docker restart bitchange-pro-app-1
```

## GitHub Repository
https://github.com/onboarding92/bitchange
