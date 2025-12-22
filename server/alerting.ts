import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email";
import { logger } from "./logger";


// Alert thresholds
const THRESHOLDS = {
  ERROR_RATE: 5, // 5% error rate
  RESPONSE_TIME: 1000, // 1000ms average response time
  EXCHANGE_FAILURE_RATE: 10, // 10% exchange API failure rate
  DB_QUERY_TIME: 500, // 500ms average DB query time
};

// Check interval (5 minutes)
const CHECK_INTERVAL = 5 * 60 * 1000;

interface AlertCheck {
  shouldAlert: boolean;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, any>;
}

/**
 * Check API error rate
 */
async function checkErrorRate(): Promise<AlertCheck> {
  const db = await getDb();
  if (!db) {
    return { shouldAlert: false, message: "", severity: "low" };
  }

  const { apiLogs } = await import("../drizzle/schema");
  
  // Check last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      errors: sql<number>`SUM(CASE WHEN ${apiLogs.statusCode} >= 400 THEN 1 ELSE 0 END)`,
    })
    .from(apiLogs)
    .where(sql`${apiLogs.createdAt} >= ${oneHourAgo}`);

  const { total, errors } = stats[0] || { total: 0, errors: 0 };
  
  if (total === 0) {
    return { shouldAlert: false, message: "", severity: "low" };
  }

  const errorRate = (errors / total) * 100;

  if (errorRate > THRESHOLDS.ERROR_RATE) {
    return {
      shouldAlert: true,
      message: `High error rate detected: ${errorRate.toFixed(2)}% (${errors}/${total} requests failed in the last hour)`,
      severity: errorRate > 15 ? "critical" : errorRate > 10 ? "high" : "medium",
      metadata: { errorRate, total, errors },
    };
  }

  return { shouldAlert: false, message: "", severity: "low" };
}

/**
 * Check API response time
 */
async function checkResponseTime(): Promise<AlertCheck> {
  const db = await getDb();
  if (!db) {
    return { shouldAlert: false, message: "", severity: "low" };
  }

  const { apiLogs } = await import("../drizzle/schema");
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const stats = await db
    .select({
      avgResponseTime: sql<number>`AVG(${apiLogs.duration})`,
      maxResponseTime: sql<number>`MAX(${apiLogs.duration})`,
    })
    .from(apiLogs)
    .where(sql`${apiLogs.createdAt} >= ${oneHourAgo}`);

  const { avgResponseTime, maxResponseTime } = stats[0] || { avgResponseTime: 0, maxResponseTime: 0 };

  if (avgResponseTime > THRESHOLDS.RESPONSE_TIME) {
    return {
      shouldAlert: true,
      message: `Slow API response time detected: ${Math.round(avgResponseTime)}ms average (max: ${Math.round(maxResponseTime)}ms) in the last hour`,
      severity: avgResponseTime > 3000 ? "critical" : avgResponseTime > 2000 ? "high" : "medium",
      metadata: { avgResponseTime: Math.round(avgResponseTime), maxResponseTime: Math.round(maxResponseTime) },
    };
  }

  return { shouldAlert: false, message: "", severity: "low" };
}

/**
 * Check exchange API failures
 */
async function checkExchangeApiFailures(): Promise<AlertCheck> {
  const db = await getDb();
  if (!db) {
    return { shouldAlert: false, message: "", severity: "low" };
  }

  const { exchangeApiLogs } = await import("../drizzle/schema");
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const stats = await db
    .select({
      exchange: exchangeApiLogs.exchange,
      total: sql<number>`COUNT(*)`,
      failures: sql<number>`SUM(CASE WHEN ${exchangeApiLogs.success} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(exchangeApiLogs)
    .where(sql`${exchangeApiLogs.createdAt} >= ${oneHourAgo}`)
    .groupBy(exchangeApiLogs.exchange);

  const alerts: string[] = [];
  let highestSeverity: "low" | "medium" | "high" | "critical" = "low";

  for (const stat of stats) {
    if (stat.total === 0) continue;
    
    const failureRate = (stat.failures / stat.total) * 100;
    
    if (failureRate > THRESHOLDS.EXCHANGE_FAILURE_RATE) {
      alerts.push(`${stat.exchange}: ${failureRate.toFixed(2)}% failure rate (${stat.failures}/${stat.total})`);
      
      if (failureRate > 30) highestSeverity = "critical";
      else if (failureRate > 20 && highestSeverity !== "critical") highestSeverity = "high";
      else if (highestSeverity === "low") highestSeverity = "medium";
    }
  }

  if (alerts.length > 0) {
    return {
      shouldAlert: true,
      message: `Exchange API failures detected in the last hour:\\n${alerts.join("\\n")}`,
      severity: highestSeverity,
      metadata: { exchanges: stats.map(s => ({ exchange: s.exchange, total: s.total, failures: s.failures })) },
    };
  }

  return { shouldAlert: false, message: "", severity: "low" };
}

/**
 * Create alert in database
 */
async function createAlert(
  alertType: "error_rate" | "response_time" | "exchange_failure" | "db_performance",
  severity: "low" | "medium" | "high" | "critical",
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { alerts } = await import("../drizzle/schema");

  // Check if similar alert exists in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existingAlert = await db
    .select()
    .from(alerts)
    .where(sql`${alerts.alertType} = ${alertType} AND ${alerts.createdAt} >= ${oneHourAgo} AND ${alerts.resolved} = 0`)
    .limit(1);

  if (existingAlert.length > 0) {
    // Alert already exists, don't create duplicate
    return;
  }

  await db.insert(alerts).values({
    alertType,
    severity,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
    acknowledged: false,
    resolved: false,
  });

  logger.warn(`Alert created: ${alertType} - ${message}`);
}

/**
 * Send email notification for critical alerts
 */
async function sendAlertEmail(
  alertType: string,
  severity: string,
  message: string
): Promise<void> {
  try {
    // Send to owner email
    const ownerEmail = process.env.SENDGRID_FROM_EMAIL || "admin@bitchangemoney.xyz";
    
    await sendEmail({
      to: ownerEmail,
      subject: `[${severity.toUpperCase()}] BitChange System Alert: ${alertType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${severity === "critical" ? "#dc2626" : severity === "high" ? "#ea580c" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ System Alert</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 10px 0;"><strong>Alert Type:</strong> ${alertType.replace("_", " ").toUpperCase()}</p>
            <p style="margin: 0 0 10px 0;"><strong>Severity:</strong> ${severity.toUpperCase()}</p>
            <p style="margin: 0 0 20px 0;"><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-left: 4px solid ${severity === "critical" ? "#dc2626" : severity === "high" ? "#ea580c" : "#f59e0b"}; margin-bottom: 20px;">
              ${message.replace(/\\n/g, "<br>")}
            </div>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Please check the System Health dashboard for more details: 
              <a href="https://bitchangemoney.xyz/admin/system-health" style="color: #2563eb;">View Dashboard</a>
            </p>
          </div>
        </div>
      `,
      text: `
System Alert: ${alertType.replace("_", " ").toUpperCase()}
Severity: ${severity.toUpperCase()}

${message}

Please check the System Health dashboard for more details: https://bitchangemoney.xyz/admin/system-health
      `,
    });

    logger.info(`Alert email sent for ${alertType}`);
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Failed to send alert email");
  }
}

/**
 * Run all alert checks
 */
async function runAlertChecks(): Promise<void> {
  logger.info("Running alert checks...");

  try {
    const checks = await Promise.all([
      checkErrorRate(),
      checkResponseTime(),
      checkExchangeApiFailures(),
    ]);

    const [errorRateCheck, responseTimeCheck, exchangeCheck] = checks;

    // Process error rate alert
    if (errorRateCheck.shouldAlert) {
      await createAlert("error_rate", errorRateCheck.severity, errorRateCheck.message, errorRateCheck.metadata);
      
      if (errorRateCheck.severity === "critical" || errorRateCheck.severity === "high") {
        await sendAlertEmail("error_rate", errorRateCheck.severity, errorRateCheck.message);
      }
    }

    // Process response time alert
    if (responseTimeCheck.shouldAlert) {
      await createAlert("response_time", responseTimeCheck.severity, responseTimeCheck.message, responseTimeCheck.metadata);
      
      if (responseTimeCheck.severity === "critical" || responseTimeCheck.severity === "high") {
        await sendAlertEmail("response_time", responseTimeCheck.severity, responseTimeCheck.message);
      }
    }

    // Process exchange API alert
    if (exchangeCheck.shouldAlert) {
      await createAlert("exchange_failure", exchangeCheck.severity, exchangeCheck.message, exchangeCheck.metadata);
      
      if (exchangeCheck.severity === "critical" || exchangeCheck.severity === "high") {
        await sendAlertEmail("exchange_failure", exchangeCheck.severity, exchangeCheck.message);
      }
    }

    logger.info("Alert checks completed");
  } catch (error) {
    logger.error({ error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, "Error running alert checks");
  }
}

/**
 * Start the alerting system
 */
export function startAlertingSystem(): void {
  logger.info("Starting alerting system...");
  
  // Run immediately
  runAlertChecks();
  
  // Run every 5 minutes
  setInterval(runAlertChecks, CHECK_INTERVAL);
  
  logger.info(`Alerting system started (check interval: ${CHECK_INTERVAL / 1000}s)`);
}

/**
 * Manual trigger for testing
 */
export async function triggerAlertCheck(): Promise<void> {
  await runAlertChecks();
}
