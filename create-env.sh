#!/bin/bash
# Script to create .env file on VPS

cd /opt/bitchange-pro

JWT_SECRET=$(openssl rand -base64 32)
WALLET_MASTER_SEED=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "/+=" | cut -c1-20)
DB_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d "/+=" | cut -c1-20)

cat > .env << EOF
DATABASE_URL=mysql://bitchange:${DB_PASSWORD}@db:3306/bitchange_pro
DB_PASSWORD=${DB_PASSWORD}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
JWT_SECRET=${JWT_SECRET}
WALLET_MASTER_SEED=${WALLET_MASTER_SEED}
NODE_ENV=production
PORT=3000
DOMAIN=bitchangemoney.xyz
FRONTEND_URL=https://bitchangemoney.xyz
BACKEND_URL=https://bitchangemoney.xyz/api
ADMIN_EMAIL=admin@bitchangemoney.xyz
ADMIN_PASSWORD=ChangeMe123!
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/app/uploads
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
EOF

chmod 600 .env
echo "✅ .env created with secure secrets"
