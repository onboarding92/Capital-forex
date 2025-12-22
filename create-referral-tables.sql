-- Referrals table: tracks who referred whom
CREATE TABLE IF NOT EXISTS referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_referrer (referrer_id),
  INDEX idx_referred (referred_id),
  INDEX idx_code (referral_code)
);

-- Referral rewards table: tracks rewards earned from referrals
CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  referral_id INT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- Add referral_code column to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by INT NULL,
ADD FOREIGN KEY IF NOT EXISTS (referred_by) REFERENCES users(id) ON DELETE SET NULL;

-- Generate unique referral codes for existing users
UPDATE users 
SET referral_code = CONCAT('REF', LPAD(id, 6, '0'), SUBSTRING(MD5(CONCAT(id, email)), 1, 4))
WHERE referral_code IS NULL;
