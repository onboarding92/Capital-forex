# Authentication System

## Overview

BitChange Pro implements a robust authentication system with multiple security layers including email/password authentication, JWT sessions, and two-factor authentication (2FA).

## Features

### Implemented Authentication Methods

1. **Email/Password Authentication**
   - User registration with email verification
   - Secure password hashing using bcrypt
   - Password reset flow with email tokens
   - Session management with JWT

2. **Two-Factor Authentication (2FA)**
   - Google Authenticator integration
   - TOTP-based verification
   - Backup codes for account recovery
   - Optional 2FA enforcement for admin accounts

3. **Session Management**
   - JWT-based authentication
   - Secure HTTP-only cookies
   - Token expiration and refresh
   - Role-based access control (RBAC)

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(320) UNIQUE NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  password VARCHAR(255),
  emailVerified TIMESTAMP,
  twoFactorSecret VARCHAR(255),
  twoFactorEnabled BOOLEAN DEFAULT false,
  twoFactorBackupCodes TEXT,
  accountStatus ENUM('active', 'suspended') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Registration

**POST** `/api/trpc/auth.register`

```typescript
{
  name: string;
  email: string;
  password: string; // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
}
```

### Login

**POST** `/api/trpc/auth.login`

```typescript
{
  email: string;
  password: string;
  twoFactorCode?: string; // Required if 2FA enabled
}
```

### Password Reset

**POST** `/api/trpc/auth.requestPasswordReset`

```typescript
{
  email: string;
}
```

**POST** `/api/trpc/auth.resetPassword`

```typescript
{
  token: string;
  newPassword: string;
}
```

### Two-Factor Authentication

**POST** `/api/trpc/auth.enable2FA`

Returns QR code and secret for Google Authenticator setup.

**POST** `/api/trpc/auth.verify2FA`

```typescript
{
  code: string; // 6-digit TOTP code
}
```

**POST** `/api/trpc/auth.disable2FA`

```typescript
{
  password: string;
  code: string;
}
```

## Security Features

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Password Hashing

Passwords are hashed using bcrypt with a salt round of 10:

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

### JWT Token

JWT tokens are signed with a secret key and include:

```typescript
{
  userId: number;
  email: string;
  role: 'user' | 'admin';
  iat: number; // Issued at
  exp: number; // Expiration (7 days)
}
```

### Session Cookie

- HTTP-only cookie
- Secure flag in production
- SameSite=Strict
- 7-day expiration

## Role-Based Access Control

### User Roles

1. **User** (default)
   - Access to trading, wallet, deposits, withdrawals
   - Can submit KYC documents
   - Can create support tickets
   - Can view own transaction history

2. **Admin**
   - All user permissions
   - Access to admin dashboard
   - User management
   - KYC verification
   - Withdrawal approval
   - Support ticket management
   - System configuration

### Protected Procedures

```typescript
// Public - no authentication required
publicProcedure

// Protected - requires authentication
protectedProcedure

// Admin only - requires admin role
adminProcedure
```

## Implementation Details

### Backend (server/routers.ts)

```typescript
// Registration
auth: {
  register: publicProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(8)
    }))
    .mutation(async ({ input }) => {
      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      // Create user
      const user = await db.insert(users).values({
        ...input,
        password: hashedPassword
      });
      
      // Send verification email
      await sendVerificationEmail(user.email);
      
      return { success: true };
    }),

  // Login
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
      twoFactorCode: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email)
      });
      
      if (!user || !user.password) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      
      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!input.twoFactorCode) {
          return { requires2FA: true };
        }
        
        const isValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: input.twoFactorCode
        });
        
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid 2FA code' });
        }
      }
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Set cookie
      ctx.res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return { success: true, user };
    })
}
```

### Frontend (client/src/lib/auth.ts)

```typescript
import { trpc } from './trpc';

export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };
}

export function getLoginUrl() {
  return '/auth/login';
}
```

## Testing

### Test Credentials

See `test-users.sql` for pre-configured test accounts:

- **Admin**: admin@bitchangemoney.xyz / Admin123!
- **User**: user@bitchange.test / User123!

### Manual Testing

1. **Registration Flow**
   ```bash
   curl -X POST http://localhost:3000/api/trpc/auth.register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"Test123!"}'
   ```

2. **Login Flow**
   ```bash
   curl -X POST http://localhost:3000/api/trpc/auth.login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}'
   ```

3. **2FA Setup**
   - Login to account
   - Navigate to Settings → Security
   - Click "Enable 2FA"
   - Scan QR code with Google Authenticator
   - Enter 6-digit code to verify

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify email and password are correct
   - Check if account is suspended
   - Ensure password meets requirements

2. **2FA code not working**
   - Ensure device time is synchronized
   - Try using backup codes
   - Contact admin to disable 2FA

3. **Session expired**
   - JWT tokens expire after 7 days
   - Login again to refresh session

## Security Best Practices

1. **Never store passwords in plain text**
2. **Use HTTPS in production**
3. **Implement rate limiting on auth endpoints**
4. **Enable 2FA for admin accounts**
5. **Regularly rotate JWT secrets**
6. **Monitor failed login attempts**
7. **Implement account lockout after multiple failed attempts**

## Future Enhancements

- [ ] OAuth integration (Google, GitHub)
- [ ] WebAuthn/FIDO2 support
- [ ] Biometric authentication
- [ ] IP whitelisting for admin accounts
- [ ] Device fingerprinting
- [ ] Email verification reminders
- [ ] Password strength meter
- [ ] Account activity logs
