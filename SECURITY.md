# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: security@bitchange.pro

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Preferred Languages

We prefer all communications to be in English.

## Security Update Process

1. **Report received** - We acknowledge receipt within 48 hours
2. **Assessment** - We assess the vulnerability and determine severity
3. **Fix development** - We develop and test a fix
4. **Release** - We release a security patch
5. **Disclosure** - We publicly disclose the vulnerability after the patch is released

## Security Best Practices

### For Users

* **Keep your installation up to date** - Always use the latest version
* **Use strong passwords** - Enable 2FA and WebAuthn when possible
* **Secure your environment variables** - Never commit `.env` files
* **Use HTTPS** - Always access the platform over HTTPS
* **Monitor your wallets** - Regularly check for unauthorized transactions
* **Enable email alerts** - Configure balance and withdrawal alerts

### For Developers

* **Never commit secrets** - Use environment variables for all sensitive data
* **Validate all inputs** - Use Zod schemas for input validation
* **Use parameterized queries** - Prevent SQL injection
* **Sanitize outputs** - Prevent XSS attacks
* **Implement rate limiting** - Protect against brute force attacks
* **Use HTTPS everywhere** - Enforce SSL/TLS for all connections
* **Keep dependencies updated** - Regularly update npm packages
* **Follow principle of least privilege** - Limit access rights

## Security Features

### Authentication & Authorization

* **JWT-based authentication** - Secure session management
* **2FA (TOTP)** - Time-based one-time passwords
* **WebAuthn** - Biometric authentication (Face ID, Touch ID, Windows Hello)
* **Role-based access control** - Admin and user roles
* **Session expiration** - Automatic logout after inactivity

### Data Protection

* **Password hashing** - bcrypt with 10+ rounds
* **Database encryption** - SSL/TLS connections
* **No private keys in database** - Cold wallet addresses only
* **Environment variable encryption** - Secure secrets management
* **HTTPS enforcement** - All traffic encrypted

### Infrastructure Security

* **Firewall (UFW)** - Only necessary ports open (22, 80, 443)
* **Fail2ban** - Protection against brute force attacks
* **Security headers** - X-Frame-Options, CSP, etc.
* **Rate limiting** - API and authentication endpoints
* **Log monitoring** - Automated alert system
* **Automatic security updates** - Ubuntu unattended-upgrades

### Wallet Security

* **Cold/hot wallet separation** - 95% cold storage, 5% hot
* **No private keys stored** - Only addresses in database
* **Automatic sweep system** - Deposits moved to hot wallet
* **Balance monitoring** - Email alerts for threshold violations
* **Withdrawal approval** - Manual approval for large amounts
* **Address validation** - Prevent sending to invalid addresses

### API Security

* **Input validation** - Zod schemas for all endpoints
* **SQL injection prevention** - Parameterized queries with Drizzle ORM
* **XSS prevention** - Input sanitization and CSP headers
* **CSRF protection** - Session-based tokens
* **CORS configuration** - Restricted origins
* **Rate limiting** - Per-IP and per-user limits

## Known Security Considerations

### Cold Wallet Management

* Cold wallet private keys must be stored offline (hardware wallets recommended)
* Never expose cold wallet private keys to the server
* Use multi-signature wallets for additional security
* Regularly verify cold wallet balances on blockchain

### Hot Wallet Security

* Hot wallet holds only 5% of total funds
* Automatic sweep keeps hot wallet balance within thresholds
* Email alerts for balance anomalies
* Manual approval required for large withdrawals

### WebAuthn Limitations

* Requires HTTPS (won't work on HTTP)
* Browser and device support varies
* Users should register multiple authenticators as backup
* Fallback to 2FA if WebAuthn unavailable

### Database Security

* Use strong database passwords (20+ characters)
* Enable SSL/TLS for database connections
* Restrict database access to application server only
* Regular backups with encryption
* Point-in-time recovery capability

## Compliance

### Data Protection

* **GDPR compliance** - User data rights and deletion
* **Data retention** - 7-year retention for financial records
* **Data encryption** - At rest and in transit
* **Privacy policy** - Clear disclosure of data usage

### Financial Regulations

* **KYC/AML procedures** - Identity verification required
* **Transaction monitoring** - Automated suspicious activity detection
* **Audit trail** - Complete transaction history
* **Regulatory reporting** - Compliance with local regulations

## Security Audits

We recommend regular security audits:

* **Code review** - Before each major release
* **Penetration testing** - Annually or after major changes
* **Dependency audit** - Monthly with `pnpm audit`
* **SSL/TLS testing** - Quarterly with SSLLabs
* **Load testing** - Before production deployment

## Incident Response

In case of a security incident:

1. **Isolate** - Immediately isolate affected systems
2. **Assess** - Determine scope and impact
3. **Contain** - Prevent further damage
4. **Eradicate** - Remove the threat
5. **Recover** - Restore normal operations
6. **Learn** - Post-incident review and improvements

## Contact

* **Security issues**: security@bitchange.pro
* **General inquiries**: support@bitchange.pro
* **GitHub**: https://github.com/yourusername/bitchange-pro

## Acknowledgments

We appreciate the security research community and will acknowledge researchers who responsibly disclose vulnerabilities (with their permission).

---

**Last updated**: December 21, 2025
