-- BitChange Pro - Admin User Promotion Script
-- This script promotes a user to admin role by email address

-- Usage:
-- Replace 'user@example.com' with the actual email address
-- Run on VPS: docker exec bitchange-db mysql -ubitchange -p'PNskCx58YLkXcpj2s16X' bitchange_pro < promote-to-admin.sql

-- Promote user to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'REPLACE_WITH_EMAIL';

-- Verify the change
SELECT id, name, email, role, createdAt 
FROM users 
WHERE email = 'REPLACE_WITH_EMAIL';
