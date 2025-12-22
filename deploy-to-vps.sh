#!/bin/bash
set -e

echo "=== BitChange Pro VPS Deployment Script ==="
echo ""

# Configuration
VPS_IP="46.224.87.94"
VPS_USER="root"
VPS_PASSWORD="UdvAXcUeTPWK"
PROJECT_DIR="/opt/bitchange-pro"

echo "Step 1: Starting Redis service..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d redis"

echo ""
echo "Step 2: Applying SQL migrations..."

# Add referral fields
echo "  - Adding referral fields to users table..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e \"
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referralCode VARCHAR(20) UNIQUE COMMENT 'Unique referral code',
ADD COLUMN IF NOT EXISTS referredBy INT COMMENT 'User ID who referred this user';
\""

# Create rewards table
echo "  - Creating rewards table..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e \"
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  referrerId INT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL DEFAULT 10.00000000,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
  type ENUM('first_deposit', 'first_trade', 'manual') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  notes TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referrerId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (userId),
  INDEX idx_referrer_id (referrerId),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
\""

# Add KYC document fields
echo "  - Adding KYC document fields..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "docker exec bitchange_db mysql -uroot -ppBjRIcG97WLl540WWwb4 bitchange_pro -e \"
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kycIdFrontPath TEXT COMMENT 'Local file path for ID front photo',
ADD COLUMN IF NOT EXISTS kycIdBackPath TEXT COMMENT 'Local file path for ID back photo',
ADD COLUMN IF NOT EXISTS kycSelfiePath TEXT COMMENT 'Local file path for selfie with ID';
\""

echo ""
echo "Step 3: Stopping app container..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml stop app"

echo ""
echo "Step 4: Rebuilding app container..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml build --no-cache app"

echo ""
echo "Step 5: Starting app container..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP \
  "cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d app"

echo ""
echo "=== Deployment Complete! ==="
echo "Redis: Running"
echo "Database: Migrated"
echo "App: Rebuilt and running"
echo ""
echo "Check status: https://www.bitchangemoney.xyz"
