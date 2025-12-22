# WebAuthn Production Testing Guide

## Overview

WebAuthn (Web Authentication) requires **HTTPS** to function in production. This guide covers testing biometric authentication (Face ID, Touch ID, Windows Hello) on real devices once deployed to a secure domain.

## Prerequisites

✅ **HTTPS Domain Required**
- WebAuthn API only works on `https://` URLs or `localhost`
- Deploy BitChange Pro to your production domain with SSL certificate
- Recommended: Use Cloudflare or Let's Encrypt for free SSL

✅ **Supported Devices**
- **iOS (Face ID)**: iPhone X or newer with iOS 14+
- **iOS (Touch ID)**: iPhone 5s - 8, iPad with Touch ID
- **Android (Fingerprint)**: Android 7.0+ with fingerprint sensor
- **Windows (Windows Hello)**: Windows 10+ with biometric hardware or PIN
- **macOS (Touch ID)**: MacBook Pro with Touch Bar, M1/M2/M3 Macs

## Testing Scenarios

### 1. Registration Flow

**Test on each device type:**

1. Navigate to Account Settings → Biometric Authentication
2. Click "Register New Device"
3. Enter device name (e.g., "iPhone 14 Pro")
4. System should prompt for biometric authentication:
   - **iOS**: Face ID or Touch ID prompt
   - **Android**: Fingerprint scanner prompt
   - **Windows**: Windows Hello face/fingerprint/PIN prompt
5. Complete biometric verification
6. Device should appear in "Your Registered Devices" list

**Expected Results:**
- ✅ Biometric prompt appears immediately
- ✅ Registration completes within 2-3 seconds
- ✅ Device appears in list with correct name and type
- ✅ "Last used" timestamp shows "Never"

**Error Cases to Test:**
- ❌ User cancels biometric prompt → Show "Registration cancelled" message
- ❌ Biometric verification fails → Show "Verification failed, please try again"
- ❌ Browser doesn't support WebAuthn → Show compatibility warning

### 2. Authentication Flow (Future Implementation)

Once login flow is implemented:

1. Navigate to login page
2. Enter email
3. Click "Use Biometric Authentication" instead of password
4. System prompts for biometric verification
5. User completes biometric verification
6. User is logged in without password

**Expected Results:**
- ✅ Login completes in 1-2 seconds
- ✅ "Last used" timestamp updates after successful login
- ✅ No password required

### 3. Device Management

**Test deletion:**

1. Navigate to Account Settings → Biometric Authentication
2. Click "Delete" on a registered device
3. Confirm deletion
4. Device should be removed from list

**Expected Results:**
- ✅ Device disappears immediately
- ✅ Cannot use deleted device for authentication
- ✅ Can re-register same device with new name

### 4. Browser Compatibility

**Test on multiple browsers:**

- ✅ **Chrome/Edge (Chromium)**: Full support
- ✅ **Safari (iOS/macOS)**: Full support with platform authenticators
- ✅ **Firefox**: Supported on Windows/macOS/Linux
- ❌ **Older browsers**: Should show compatibility warning

**Compatibility Detection:**
- Component checks for `window.PublicKeyCredential`
- Shows warning message if not supported
- Gracefully degrades to password-only authentication

## Production Deployment Checklist

### Backend Configuration

- [ ] Verify `@simplewebauthn/server` is installed (currently using mock implementation)
- [ ] Update `webauthn.generateRegistrationOptions` to use real WebAuthn server
- [ ] Update `webauthn.verifyRegistration` to properly verify attestation
- [ ] Configure Relying Party (RP) ID to match your domain (e.g., `bitchangemoney.xyz`)
- [ ] Set up proper challenge generation and storage (Redis recommended)

### Frontend Configuration

- [ ] Verify `@simplewebauthn/browser` is installed and imported
- [ ] Update WebAuthnSetup component to handle real registration options
- [ ] Add proper error handling for all WebAuthn error codes
- [ ] Test on HTTPS domain (not localhost)

### Database

- [x] `webAuthnCredentials` table exists (already in schema)
- [ ] Verify indexes on `userId` and `credentialId` for performance

### Security Considerations

- ⚠️ **Challenge Storage**: Store challenges server-side with expiration (5 minutes)
- ⚠️ **RP ID Validation**: Must match domain exactly (no subdomains unless configured)
- ⚠️ **User Verification**: Always require `userVerification: "required"`
- ⚠️ **Credential Counter**: Track and verify counter to prevent replay attacks
- ⚠️ **Backup Authentication**: Always keep password authentication as fallback

## Testing Matrix

| Device | Browser | Authenticator Type | Status |
|--------|---------|-------------------|--------|
| iPhone 14 Pro | Safari | Face ID | ⏳ Pending |
| iPhone 8 | Safari | Touch ID | ⏳ Pending |
| Samsung Galaxy S23 | Chrome | Fingerprint | ⏳ Pending |
| Google Pixel 7 | Chrome | Fingerprint | ⏳ Pending |
| MacBook Pro M2 | Chrome | Touch ID | ⏳ Pending |
| MacBook Pro M2 | Safari | Touch ID | ⏳ Pending |
| Windows 11 PC | Edge | Windows Hello Face | ⏳ Pending |
| Windows 11 PC | Edge | Windows Hello Fingerprint | ⏳ Pending |
| Windows 11 PC | Edge | Windows Hello PIN | ⏳ Pending |

## Common Issues & Solutions

### Issue: "WebAuthn not supported"

**Cause**: Browser doesn't support WebAuthn API or not on HTTPS

**Solution**:
- Ensure site is served over HTTPS
- Update browser to latest version
- Check browser compatibility at [caniuse.com/webauthn](https://caniuse.com/webauthn)

### Issue: "Registration failed: NotAllowedError"

**Cause**: User cancelled biometric prompt or verification failed

**Solution**:
- User should try again
- Ensure biometric sensor is clean and working
- Check device biometric settings are enabled

### Issue: "Registration failed: InvalidStateError"

**Cause**: Credential already registered for this user

**Solution**:
- Delete existing credential first
- Or use different device name
- Check database for duplicate `credentialId`

### Issue: "RP ID mismatch"

**Cause**: Relying Party ID doesn't match domain

**Solution**:
- Update `rp.id` in `generateRegistrationOptions` to match domain
- For `bitchangemoney.xyz`, use `bitchangemoney.xyz` (not `www.bitchangemoney.xyz`)
- For subdomains, configure parent domain

## Implementation Status

### ✅ Completed

- [x] Database schema (`webAuthnCredentials` table)
- [x] Frontend component (`WebAuthnSetup.tsx`)
- [x] tRPC endpoints (list, register, verify, delete)
- [x] Browser compatibility detection
- [x] Device management UI
- [x] Integration into Account Settings

### ⏳ Pending

- [ ] Replace mock WebAuthn implementation with real `@simplewebauthn/server`
- [ ] Implement challenge generation and storage
- [ ] Add WebAuthn login flow to login page
- [ ] Test on production HTTPS domain
- [ ] Test on all device types (iOS, Android, Windows, macOS)
- [ ] Add comprehensive error handling
- [ ] Implement credential counter tracking
- [ ] Add backup codes for account recovery

## Next Steps

1. **Deploy to HTTPS Domain**
   - Set up SSL certificate
   - Deploy BitChange Pro to production
   - Verify HTTPS is working

2. **Install Real WebAuthn Server**
   ```bash
   pnpm add @simplewebauthn/server
   ```

3. **Update Backend Implementation**
   - Replace mock implementation in `server/routers.ts`
   - Use `generateRegistrationOptions` from `@simplewebauthn/server`
   - Use `verifyRegistrationResponse` for verification

4. **Test on Real Devices**
   - Follow testing scenarios above
   - Fill in testing matrix
   - Document any issues found

5. **Add Login Flow**
   - Create WebAuthn login component
   - Add "Use Biometric" button to login page
   - Implement `generateAuthenticationOptions` endpoint
   - Implement `verifyAuthentication` endpoint

## Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [MDN WebAuthn API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [FIDO Alliance](https://fidoalliance.org/)
- [Can I Use WebAuthn](https://caniuse.com/webauthn)

## Support

For issues or questions about WebAuthn implementation:
1. Check browser console for detailed error messages
2. Verify HTTPS is properly configured
3. Test on multiple devices/browsers
4. Review SimpleWebAuthn documentation
5. Check WebAuthn spec for error codes
