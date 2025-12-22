# Deploy Admin KYC Review Panel to VPS

## Quick Deploy Steps

### 1. Connect to VPS
```bash
ssh root@46.224.87.94
cd /opt/bitchange-pro
```

### 2. Copy New Files

You need to copy these files from your local machine to VPS:

**New Files:**
- `client/src/pages/admin/KYCReview.tsx` → `/opt/bitchange-pro/client/src/pages/admin/KYCReview.tsx`

**Updated Files:**
- `client/src/App.tsx` → `/opt/bitchange-pro/client/src/App.tsx`
- `server/routers.ts` → `/opt/bitchange-pro/server/routers.ts`
- `todo.md` → `/opt/bitchange-pro/todo.md`

### 3. Rebuild and Restart

```bash
cd /opt/bitchange-pro
docker-compose -f docker-compose.production.yml stop app
docker-compose -f docker-compose.production.yml build --no-cache app
docker-compose -f docker-compose.production.yml up -d app
```

### 4. Verify Deployment

1. Login as admin: https://www.bitchangemoney.xyz/auth/login
   - Email: `admin@bitchange.com`
   - Password: `Admin123!`

2. Navigate to: https://www.bitchangemoney.xyz/admin/kyc-review

3. You should see the KYC Review Panel (empty if no pending KYC submissions)

## Features Added

### Admin KYC Review Panel (`/admin/kyc-review`)

**Features:**
- View all pending KYC submissions
- Display user information and documents
- Preview ID front/back and selfie photos
- Approve KYC with one click
- Reject KYC with reason input
- Automatic notification to users on approve/reject
- Update user KYC status in database

**Backend Procedures:**
- `kyc.getPending` - Get all pending KYC submissions (admin only)
- `kyc.approve` - Approve a KYC submission (admin only)
- `kyc.reject` - Reject a KYC submission with reason (admin only)

**Notifications:**
- Users receive in-app notification when KYC is approved
- Users receive in-app notification when KYC is rejected (with reason)

## Testing

### Test KYC Approval Flow

1. Create a test user account
2. Submit KYC documents as test user
3. Login as admin
4. Go to `/admin/kyc-review`
5. Review the submission
6. Click "Approve"
7. Verify:
   - KYC status updated to "approved" in database
   - User receives notification
   - KYC disappears from pending list

### Test KYC Rejection Flow

1. Submit another KYC as test user
2. Login as admin
3. Go to `/admin/kyc-review`
4. Click "Reject"
5. Enter rejection reason (e.g., "Document not clear")
6. Verify:
   - KYC status updated to "rejected" in database
   - User receives notification with reason
   - KYC disappears from pending list

## Troubleshooting

### KYC Review Page Shows "Admin access required"
- Make sure you're logged in as admin
- Check user role in database: `SELECT role FROM users WHERE email = 'admin@bitchange.com';`
- Should return `admin`

### No Pending KYC Submissions
- This is normal if no users have submitted KYC yet
- Create a test submission to verify the flow

### Documents Not Loading
- Check that `frontImageUrl`, `backImageUrl`, `selfieUrl` are valid URLs
- Verify S3 bucket permissions (if using S3)
- Check browser console for CORS errors

## Database Queries

### Check Pending KYC Submissions
```sql
SELECT * FROM kycDocuments WHERE status = 'pending';
```

### Check User KYC Status
```sql
SELECT id, email, kycStatus, kycApprovedAt FROM users WHERE kycStatus IS NOT NULL;
```

### Manually Approve KYC (if needed)
```sql
UPDATE kycDocuments SET status = 'approved' WHERE id = <kyc_id>;
UPDATE users SET kycStatus = 'approved', kycApprovedAt = NOW() WHERE id = <user_id>;
```

---

**Deployment Date**: 2025-12-19  
**Feature**: Admin KYC Review Panel  
**Version**: d4800b8
