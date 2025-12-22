# Automatic Sweep Monitoring - Cron Job Setup

## Overview

The automatic sweep monitoring system runs every 10 minutes to:
1. **Auto-sweep deposits** - Move new deposits from user deposit addresses to hot wallets
2. **Monitor hot wallet balances** - Check if balances are within configured thresholds
3. **Auto-sweep to cold storage** - Move excess funds from hot wallets to cold storage when above max threshold
4. **Send email alerts** - Notify admins when hot wallet balance is too low (requires manual refill)

## Prerequisites

- ✅ Database migration completed (`coldWallets`, `sweepTransactions`, `walletThresholds` tables exist)
- ✅ Wallet thresholds configured for each network
- ✅ Cold wallet addresses added via admin panel
- ✅ Email configuration working (for alerts)

## Installation

### 1. Make Script Executable

```bash
chmod +x /home/ubuntu/bitchange-pro/scripts/sweep-monitor-cron.mjs
```

### 2. Test Script Manually

Run the script once to verify it works:

```bash
cd /home/ubuntu/bitchange-pro
node scripts/sweep-monitor-cron.mjs
```

**Expected Output:**
```
[2025-12-21T14:30:00.000Z] 🔄 Starting automatic sweep monitoring...
[2025-12-21T14:30:00.100Z] 📥 Checking for new deposits...
[2025-12-21T14:30:00.200Z] ℹ️  No new deposits to sweep
[2025-12-21T14:30:00.300Z] 💰 Checking hot wallet balances...
[2025-12-21T14:30:00.400Z] ✅ All hot wallet balances are healthy
[2025-12-21T14:30:00.500Z] ✅ Sweep monitoring completed successfully
[2025-12-21T14:30:00.600Z] 👋 Sweep monitoring finished
```

### 3. Setup Cron Job

Edit crontab:

```bash
crontab -e
```

Add this line (runs every 10 minutes):

```cron
*/10 * * * * cd /home/ubuntu/bitchange-pro && /usr/bin/node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1
```

**Explanation:**
- `*/10 * * * *` - Run every 10 minutes
- `cd /home/ubuntu/bitchange-pro` - Change to project directory
- `/usr/bin/node` - Full path to Node.js (use `which node` to find yours)
- `scripts/sweep-monitor-cron.mjs` - Script to run
- `>> /var/log/sweep-monitor.log` - Append output to log file
- `2>&1` - Redirect errors to same log file

### 4. Create Log Directory

```bash
sudo mkdir -p /var/log
sudo touch /var/log/sweep-monitor.log
sudo chown $USER:$USER /var/log/sweep-monitor.log
```

### 5. Verify Cron Job is Running

Check cron status:

```bash
sudo systemctl status cron
```

View crontab:

```bash
crontab -l
```

Check logs:

```bash
tail -f /var/log/sweep-monitor.log
```

## Configuration

### Wallet Thresholds

Configure balance thresholds via Admin Panel → Wallet Management → Thresholds:

| Network | Min Balance | Target Balance | Max Balance | Alert Email |
|---------|-------------|----------------|-------------|-------------|
| BTC | 0.1 BTC | 1.0 BTC | 2.0 BTC | admin@example.com |
| ETH | 1.0 ETH | 10.0 ETH | 20.0 ETH | admin@example.com |
| BNB | 5.0 BNB | 50.0 BNB | 100.0 BNB | admin@example.com |
| SOL | 10.0 SOL | 100.0 SOL | 200.0 SOL | admin@example.com |
| MATIC | 100.0 MATIC | 1000.0 MATIC | 2000.0 MATIC | admin@example.com |
| TRX | 1000.0 TRX | 10000.0 TRX | 20000.0 TRX | admin@example.com |

**Threshold Logic:**
- **Below Min** → 🚨 Critical alert, send email to request manual refill from cold storage
- **Below Target** → ⚠️ Warning alert, monitor closely
- **At Target** → ✅ Healthy, no action needed
- **Above Max** → 🔄 Auto-sweep excess to cold storage

### Email Alerts

Update alert email in database:

```sql
UPDATE walletThresholds 
SET alertEmail = 'admin@bitchangemoney.xyz' 
WHERE network = 'BTC';
```

Or via Admin Panel → Wallet Management → Update Threshold

## Monitoring

### View Real-time Logs

```bash
tail -f /var/log/sweep-monitor.log
```

### View Recent Activity

```bash
tail -n 100 /var/log/sweep-monitor.log
```

### Search for Errors

```bash
grep "❌" /var/log/sweep-monitor.log
```

### Check Sweep History

Via Admin Panel → Wallet Management → History tab

Or via database:

```sql
SELECT * FROM sweepTransactions 
ORDER BY createdAt DESC 
LIMIT 50;
```

## Troubleshooting

### Cron Job Not Running

**Check if cron service is running:**
```bash
sudo systemctl status cron
```

**Start cron if stopped:**
```bash
sudo systemctl start cron
```

**Check cron logs:**
```bash
grep CRON /var/log/syslog
```

### Script Errors

**Check Node.js path:**
```bash
which node
# Update crontab with correct path
```

**Check environment variables:**
```bash
# Cron doesn't load .env automatically
# Make sure DATABASE_URL and other vars are set
```

**Test script manually:**
```bash
cd /home/ubuntu/bitchange-pro
node scripts/sweep-monitor-cron.mjs
```

### Database Connection Issues

**Verify DATABASE_URL:**
```bash
echo $DATABASE_URL
```

**Test database connection:**
```bash
cd /home/ubuntu/bitchange-pro
node scripts/apply-wallet-migration.mjs
```

### No Deposits Being Swept

**Check deposit addresses exist:**
```sql
SELECT * FROM depositAddresses LIMIT 10;
```

**Check for pending deposits:**
```sql
SELECT * FROM deposits WHERE status = 'pending';
```

**Verify hot wallet addresses configured:**
```sql
SELECT * FROM masterWallets;
```

## Advanced Configuration

### Change Cron Interval

**Every 5 minutes:**
```cron
*/5 * * * * cd /home/ubuntu/bitchange-pro && node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1
```

**Every 30 minutes:**
```cron
*/30 * * * * cd /home/ubuntu/bitchange-pro && node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1
```

**Every hour:**
```cron
0 * * * * cd /home/ubuntu/bitchange-pro && node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1
```

### Log Rotation

Create `/etc/logrotate.d/sweep-monitor`:

```
/var/log/sweep-monitor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
```

Apply log rotation:

```bash
sudo logrotate -f /etc/logrotate.d/sweep-monitor
```

### Email Notifications on Failure

Add to crontab:

```cron
MAILTO=admin@bitchangemoney.xyz
*/10 * * * * cd /home/ubuntu/bitchange-pro && node scripts/sweep-monitor-cron.mjs >> /var/log/sweep-monitor.log 2>&1 || echo "Sweep monitoring failed" | mail -s "BitChange Sweep Alert" $MAILTO
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Log File Permissions** - Ensure log files are not world-readable (may contain sensitive info)
   ```bash
   chmod 640 /var/log/sweep-monitor.log
   ```

2. **Script Permissions** - Ensure script is not writable by others
   ```bash
   chmod 750 /home/ubuntu/bitchange-pro/scripts/sweep-monitor-cron.mjs
   ```

3. **Environment Variables** - Never log sensitive environment variables
   - DATABASE_URL contains credentials
   - API keys should never appear in logs

4. **Cold Wallet Security** - Script only reads cold wallet addresses, never private keys
   - Cold wallets remain offline
   - Manual intervention required for cold → hot transfers

5. **Rate Limiting** - 10-minute interval prevents excessive blockchain API calls
   - Adjust if you have high deposit volume
   - Monitor API rate limits

## Performance Metrics

Monitor these metrics in Admin Panel → Wallet Management:

- **Sweep Success Rate** - Should be > 95%
- **Average Sweep Time** - Should be < 30 seconds
- **Hot Wallet Health** - Should be "Healthy" or "Warning" (never "Critical")
- **Cold Storage Value** - Should be ~95% of total funds
- **Alert Response Time** - How quickly admins respond to refill alerts

## Maintenance

### Weekly Tasks

- [ ] Review sweep transaction history
- [ ] Verify all hot wallet balances are healthy
- [ ] Check cold storage balances on blockchain
- [ ] Review email alert logs

### Monthly Tasks

- [ ] Analyze sweep patterns and adjust thresholds if needed
- [ ] Review log files for errors or anomalies
- [ ] Verify cron job is still running correctly
- [ ] Update documentation with any changes

### Quarterly Tasks

- [ ] Full security audit of wallet system
- [ ] Test manual refill process from cold storage
- [ ] Verify backup procedures
- [ ] Review and update thresholds based on trading volume

## Support

For issues with automatic sweep monitoring:

1. Check logs: `/var/log/sweep-monitor.log`
2. Test script manually: `node scripts/sweep-monitor-cron.mjs`
3. Verify cron is running: `sudo systemctl status cron`
4. Check database connectivity
5. Review Admin Panel → Wallet Management → History

## Next Steps

After setting up cron job:

1. ✅ Monitor logs for first 24 hours
2. ✅ Verify deposits are being swept automatically
3. ✅ Test email alerts by manually adjusting thresholds
4. ✅ Add cold wallet addresses via Admin Panel
5. ✅ Configure alert emails for each network
6. ✅ Document any custom configurations
