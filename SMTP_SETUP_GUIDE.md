# SMTP Email Configuration Guide

This guide explains how to configure SMTP email for BitChange Pro to send emails from `info@bitchangemoney.xyz`.

## Why SMTP Configuration is Required

The exchange needs to send emails for:
- Email verification (OTP codes)
- Password reset links
- Login alerts
- Deposit confirmations
- Withdrawal notifications
- KYC status updates
- 2FA setup codes

## Option 1: SendGrid (RECOMMENDED for Production)

SendGrid is a professional email service with high deliverability rates.

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Sign up for free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Verify Domain

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select your DNS provider
4. Add the following DNS records to your domain (bitchangemoney.xyz):

```
Type: CNAME
Host: em1234.bitchangemoney.xyz
Value: u1234567.wl123.sendgrid.net

Type: CNAME  
Host: s1._domainkey.bitchangemoney.xyz
Value: s1.domainkey.u1234567.wl123.sendgrid.net

Type: CNAME
Host: s2._domainkey.bitchangemoney.xyz  
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

**Note:** SendGrid will provide you with the exact values after you start the domain authentication process.

### Step 3: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `BitChange Production`
4. Permissions: **Full Access** (or **Mail Send** only)
5. Copy the API key (starts with `SG.`)

### Step 4: Configure Environment Variables

Add these to your `.env` file on the VPS:

```bash
# SendGrid Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_actual_api_key_here
SMTP_FROM_EMAIL=info@bitchangemoney.xyz
SMTP_FROM_NAME=BitChange Pro
```

### Step 5: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Add sender: `info@bitchangemoney.xyz`
3. Fill in the form with your business details
4. Verify the email sent to info@bitchangemoney.xyz

---

## Option 2: Gmail SMTP (Simple but Limited)

Gmail can be used for testing but has limitations (500 emails/day).

### Step 1: Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**

### Step 2: Create App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** and **Other (Custom name)**
3. Name it: `BitChange Exchange`
4. Click **Generate**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM_EMAIL=info@bitchangemoney.xyz
SMTP_FROM_NAME=BitChange Pro
```

**Note:** Emails will be sent "on behalf of" your Gmail address. Recipients may see "via gmail.com" in the sender field.

---

## Option 3: Custom Domain SMTP (cPanel/Plesk)

If your domain hosting provider offers email services (cPanel, Plesk, etc.).

### Step 1: Create Email Account

1. Log in to your hosting control panel (cPanel/Plesk)
2. Go to **Email Accounts**
3. Create new email: `info@bitchangemoney.xyz`
4. Set a strong password

### Step 2: Get SMTP Settings

Common settings (check with your provider):

```
SMTP Host: mail.bitchangemoney.xyz
SMTP Port: 587 (or 465 for SSL)
SMTP User: info@bitchangemoney.xyz
SMTP Pass: your_email_password
```

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Custom Domain SMTP
SMTP_HOST=mail.bitchangemoney.xyz
SMTP_PORT=587
SMTP_USER=info@bitchangemoney.xyz
SMTP_PASS=your_email_password_here
SMTP_FROM_EMAIL=info@bitchangemoney.xyz
SMTP_FROM_NAME=BitChange Pro
```

---

## Testing SMTP Configuration

After configuring SMTP, test it by:

1. **Register a new user** on the exchange
2. Check if you receive the email verification OTP
3. **Request password reset** and check if email arrives
4. Check spam folder if emails don't arrive

### Troubleshooting

**Emails go to spam:**
- Configure SPF, DKIM, DMARC DNS records (SendGrid does this automatically)
- Use a verified domain (not Gmail)
- Avoid spam trigger words in email content

**SMTP connection fails:**
- Check firewall allows outbound connections on port 587/465
- Verify SMTP credentials are correct
- Try different SMTP ports (587, 465, 25)

**Gmail "Less secure app" error:**
- Use App Password instead of regular password
- Enable 2-Step Verification first

---

## DNS Records for Email Deliverability

To improve email deliverability, add these DNS records to bitchangemoney.xyz:

### SPF Record (Sender Policy Framework)

```
Type: TXT
Host: @
Value: v=spf1 include:sendgrid.net ~all
```

### DKIM Record (DomainKeys Identified Mail)

SendGrid will provide this after domain verification.

### DMARC Record

```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@bitchangemoney.xyz
```

---

## Production Checklist

Before going live:

- [ ] SMTP configured and tested
- [ ] Domain verified (SendGrid)
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS
- [ ] Test email delivery to Gmail, Outlook, Yahoo
- [ ] Check spam score: https://www.mail-tester.com/
- [ ] Set up email monitoring/alerts
- [ ] Configure email rate limiting (prevent abuse)

---

## Email Rate Limits

**SendGrid Free Tier:**
- 100 emails/day
- Upgrade to Essentials: $19.95/month for 50,000 emails

**Gmail:**
- 500 emails/day
- Not recommended for production

**Custom Domain:**
- Depends on hosting provider
- Usually 500-1000 emails/day

---

## Support

If you encounter issues:

1. Check server logs: `docker logs bitchange-app`
2. Test SMTP connection: `telnet smtp.sendgrid.net 587`
3. Contact SendGrid support: https://support.sendgrid.com/
4. Check email deliverability: https://www.mail-tester.com/

---

## Security Best Practices

- **Never commit** SMTP credentials to Git
- Use **environment variables** only
- Rotate API keys every 90 days
- Enable **2FA** on SendGrid account
- Monitor email sending logs for suspicious activity
- Set up **rate limiting** to prevent email spam abuse

---

## Current Implementation

The exchange uses `nodemailer` library in `server/email.ts`. It reads SMTP configuration from environment variables:

```typescript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

No code changes needed - just configure environment variables!
