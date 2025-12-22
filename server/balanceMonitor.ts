/**
 * Balance Monitor
 * 
 * Monitors hot wallet balances and sends alerts when:
 * - Balance below minimum threshold (needs refill from cold storage)
 * - Balance above maximum threshold (needs sweep to cold storage)
 */

import { getDb } from "./db";
import { masterWallets, walletThresholds } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./email";

/**
 * Check all hot wallet balances against thresholds
 * Called by background job every 5 minutes
 */
export async function checkHotWalletBalances() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  console.log("[BalanceMonitor] Checking hot wallet balances...");
  
  // Get all active hot wallets
  const hotWallets = await db.select()
    .from(masterWallets)
    .where(eq(masterWallets.isActive, true));
  
  const alerts = [];
  
  for (const wallet of hotWallets) {
    try {
      // Get threshold configuration for this network
      const [threshold] = await db.select()
        .from(walletThresholds)
        .where(eq(walletThresholds.network, wallet.network))
        .limit(1);
      
      if (!threshold) {
        console.log(`[BalanceMonitor] No threshold configured for ${wallet.network}, skipping`);
        continue;
      }
      
      const currentBalance = parseFloat(wallet.balance || "0");
      const minBalance = parseFloat(threshold.minBalance || "0");
      const maxBalance = parseFloat(threshold.maxBalance || "0");
      const targetBalance = parseFloat(threshold.targetBalance || "0");
      
      // Check if balance is below minimum
      if (currentBalance < minBalance) {
        const alert = await sendLowBalanceAlert(
          wallet.network,
          wallet.asset,
          currentBalance,
          minBalance,
          targetBalance,
          threshold.alertEmail || "admin@bitchangemoney.xyz"
        );
        alerts.push(alert);
      }
      
      // Check if balance is above maximum
      if (currentBalance > maxBalance) {
        const alert = await sendHighBalanceAlert(
          wallet.network,
          wallet.asset,
          currentBalance,
          maxBalance,
          targetBalance,
          threshold.alertEmail || "admin@bitchangemoney.xyz"
        );
        alerts.push(alert);
      }
      
      // Update last alert sent timestamp
      if (alerts.length > 0) {
        await db.update(walletThresholds)
          .set({ lastAlertSent: new Date() })
          .where(eq(walletThresholds.network, wallet.network));
      }
      
    } catch (error: any) {
      console.error(`[BalanceMonitor] Error checking wallet ${wallet.network}:`, error.message);
    }
  }
  
  console.log(`[BalanceMonitor] Check completed. ${alerts.length} alerts sent.`);
  
  return { alertsSent: alerts.length, alerts };
}

/**
 * Send low balance alert email to admin
 */
export async function sendLowBalanceAlert(
  network: string,
  asset: string,
  currentBalance: number,
  minBalance: number,
  targetBalance: number,
  alertEmail: string
) {
  const deficit = targetBalance - currentBalance;
  
  const subject = `🔴 URGENT: ${network} Hot Wallet Balance Below Minimum`;
  
  const text = `
URGENT: Hot Wallet Balance Alert

Network: ${network}
Asset: ${asset}
Current Balance: ${currentBalance.toFixed(8)} ${asset}
Minimum Threshold: ${minBalance.toFixed(8)} ${asset}
Target Balance: ${targetBalance.toFixed(8)} ${asset}
Deficit: ${deficit.toFixed(8)} ${asset}

ACTION REQUIRED:
Please refill the hot wallet from cold storage immediately to avoid withdrawal delays.

Recommended transfer amount: ${deficit.toFixed(8)} ${asset}
  `.trim();
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔴 URGENT: Hot Wallet Balance Alert</h2>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Network:</td>
            <td style="padding: 8px;">${network}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Asset:</td>
            <td style="padding: 8px;">${asset}</td>
          </tr>
          <tr style="background: #fee2e2;">
            <td style="padding: 8px; font-weight: bold;">Current Balance:</td>
            <td style="padding: 8px; color: #dc2626; font-weight: bold;">${currentBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Minimum Threshold:</td>
            <td style="padding: 8px;">${minBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Target Balance:</td>
            <td style="padding: 8px;">${targetBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr style="background: #fef3c7;">
            <td style="padding: 8px; font-weight: bold;">Deficit:</td>
            <td style="padding: 8px; color: #d97706; font-weight: bold;">${deficit.toFixed(8)} ${asset}</td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #991b1b;">ACTION REQUIRED:</p>
          <p style="margin: 8px 0 0 0;">Please refill the hot wallet from cold storage immediately to avoid withdrawal delays.</p>
          <p style="margin: 8px 0 0 0;">Recommended transfer amount: <strong>${deficit.toFixed(8)} ${asset}</strong></p>
        </div>
        
        <div style="margin-top: 20px; padding: 12px; background: #e0e7ff; border-radius: 4px; font-size: 12px; color: #3730a3;">
          <strong>Note:</strong> This is an automated alert from the Balance Monitor system.
        </div>
      </div>
    </div>
  `;
  
  try {
    await sendEmail({
      to: alertEmail,
      subject,
      text,
      html,
    });
    
    console.log(`[BalanceMonitor] Low balance alert sent for ${network}`);
    
    return {
      type: "low_balance",
      network,
      asset,
      currentBalance,
      minBalance,
      deficit,
      sent: true,
    };
  } catch (error: any) {
    console.error(`[BalanceMonitor] Failed to send low balance alert for ${network}:`, error.message);
    return {
      type: "low_balance",
      network,
      asset,
      currentBalance,
      minBalance,
      deficit,
      sent: false,
      error: error.message,
    };
  }
}

/**
 * Send high balance alert email to admin
 */
export async function sendHighBalanceAlert(
  network: string,
  asset: string,
  currentBalance: number,
  maxBalance: number,
  targetBalance: number,
  alertEmail: string
) {
  const excess = currentBalance - targetBalance;
  
  const subject = `⚠️ ${network} Hot Wallet Balance Above Maximum`;
  
  const text = `
Hot Wallet Balance Alert

Network: ${network}
Asset: ${asset}
Current Balance: ${currentBalance.toFixed(8)} ${asset}
Maximum Threshold: ${maxBalance.toFixed(8)} ${asset}
Target Balance: ${targetBalance.toFixed(8)} ${asset}
Excess: ${excess.toFixed(8)} ${asset}

RECOMMENDED ACTION:
Consider sweeping excess funds to cold storage for better security.

Recommended sweep amount: ${excess.toFixed(8)} ${asset}
  `.trim();
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">⚠️ Hot Wallet Balance Alert</h2>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Network:</td>
            <td style="padding: 8px;">${network}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Asset:</td>
            <td style="padding: 8px;">${asset}</td>
          </tr>
          <tr style="background: #fef3c7;">
            <td style="padding: 8px; font-weight: bold;">Current Balance:</td>
            <td style="padding: 8px; color: #d97706; font-weight: bold;">${currentBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Maximum Threshold:</td>
            <td style="padding: 8px;">${maxBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Target Balance:</td>
            <td style="padding: 8px;">${targetBalance.toFixed(8)} ${asset}</td>
          </tr>
          <tr style="background: #dbeafe;">
            <td style="padding: 8px; font-weight: bold;">Excess:</td>
            <td style="padding: 8px; color: #1d4ed8; font-weight: bold;">${excess.toFixed(8)} ${asset}</td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 16px; background: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #92400e;">RECOMMENDED ACTION:</p>
          <p style="margin: 8px 0 0 0;">Consider sweeping excess funds to cold storage for better security.</p>
          <p style="margin: 8px 0 0 0;">Recommended sweep amount: <strong>${excess.toFixed(8)} ${asset}</strong></p>
        </div>
        
        <div style="margin-top: 20px; padding: 12px; background: #e0e7ff; border-radius: 4px; font-size: 12px; color: #3730a3;">
          <strong>Note:</strong> This is an automated alert from the Balance Monitor system.
        </div>
      </div>
    </div>
  `;
  
  try {
    await sendEmail({
      to: alertEmail,
      subject,
      text,
      html,
    });
    
    console.log(`[BalanceMonitor] High balance alert sent for ${network}`);
    
    return {
      type: "high_balance",
      network,
      asset,
      currentBalance,
      maxBalance,
      excess,
      sent: true,
    };
  } catch (error: any) {
    console.error(`[BalanceMonitor] Failed to send high balance alert for ${network}:`, error.message);
    return {
      type: "high_balance",
      network,
      asset,
      currentBalance,
      maxBalance,
      excess,
      sent: false,
      error: error.message,
    };
  }
}

/**
 * Get hot wallet balance status for dashboard
 */
export async function getHotWalletStatus() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const hotWallets = await db.select()
    .from(masterWallets)
    .where(eq(masterWallets.isActive, true));
  
  const status = [];
  
  for (const wallet of hotWallets) {
    const [threshold] = await db.select()
      .from(walletThresholds)
      .where(eq(walletThresholds.network, wallet.network))
      .limit(1);
    
    if (!threshold) continue;
    
    const currentBalance = parseFloat(wallet.balance || "0");
    const minBalance = parseFloat(threshold.minBalance || "0");
    const maxBalance = parseFloat(threshold.maxBalance || "0");
    const targetBalance = parseFloat(threshold.targetBalance || "0");
    
    let healthStatus: "healthy" | "low" | "high" | "critical";
    
    if (currentBalance < minBalance * 0.5) {
      healthStatus = "critical";
    } else if (currentBalance < minBalance) {
      healthStatus = "low";
    } else if (currentBalance > maxBalance) {
      healthStatus = "high";
    } else {
      healthStatus = "healthy";
    }
    
    status.push({
      network: wallet.network,
      asset: wallet.asset,
      currentBalance,
      minBalance,
      maxBalance,
      targetBalance,
      healthStatus,
      percentOfTarget: (currentBalance / targetBalance) * 100,
    });
  }
  
  return status;
}
