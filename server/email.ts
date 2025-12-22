import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import sgMail from "@sendgrid/mail";

// Initialize SendGrid if API key is provided
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@bitchangemoney.xyz";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("[email] SendGrid initialized");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !port || !user || !pass) {
    console.warn(
      "[email] SMTP not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS missing). Emails will not be sent."
    );
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: secure ?? false,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Base function to send emails.
 * If SMTP not configured, logs and returns without throwing errors.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  // Try SendGrid first if configured
  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        from: SENDGRID_FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html ?? params.text,
      });
      console.log(`[email] Sent via SendGrid to ${params.to}: ${params.subject}`);
      return;
    } catch (err) {
      console.error("[email] SendGrid failed, falling back to SMTP:", err);
    }
  }

  // Fallback to SMTP
  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      "[email] Email sending skipped (no SMTP/SendGrid config). Intended email:",
      {
        to: params.to,
        subject: params.subject,
      }
    );
    return;
  }

  const from = process.env.SMTP_FROM || 'BitChange <no-reply@bitchangemoney.xyz>';

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    });
    console.log(`[email] Sent via SMTP to ${params.to}: ${params.subject}`);
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}

/**
 * Welcome email for new users
 */
export async function sendWelcomeEmail(to: string) {
  const subject = "Welcome to BitChange";
  const text = `Welcome to BitChange!

Your account has been created successfully.

If you did not create this account, please contact support immediately.

BitChange Team`;

  const html = `
    <h2>Welcome to BitChange 👋</h2>
    <p>Your account has been created successfully.</p>
    <p>If you did not create this account, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Team</p>
  `;

  return sendEmail({ to: to, subject: subject, text: text, html: html });
}

/**
 * Email verification code
 */
export async function sendVerificationEmail(to: string, code: string) {
  const subject = "Verify your BitChange account";
  const text = `Your BitChange Verification Code

Enter this code to verify your email:

${code}

This code expires in 10 minutes.

BitChange Team`;

  const html = `
    <h2>Your BitChange Verification Code</h2>
    <p>Enter this code to verify your email:</p>
    <h1 style="font-size: 32px; letter-spacing: 4px; color: #6366f1;">${code}</h1>
    <p>This code expires in 10 minutes.</p>
    <p>Best regards,<br/>BitChange Team</p>
  `;

  return sendEmail({ to: to, subject: subject, text: text, html: html });
}

/**
 * Login alert email
 */
export async function sendLoginAlertEmail(params: {
  to: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}) {
  const subject = "New login to your BitChange account";
  const text = `Hello,

A new login to your BitChange account was detected.

IP address: ${params.ip}
Device / Browser: ${params.userAgent}
Time: ${params.timestamp}

If this was you, you can ignore this message.
If you do not recognize this login, please change your password immediately and contact support.

BitChange Security Team`;

  const html = `
    <h2>New login detected</h2>
    <p>A new login to your <strong>BitChange</strong> account was detected.</p>
    <ul>
      <li><strong>IP address:</strong> ${escapeHtml(params.ip)}</li>
      <li><strong>Device / Browser:</strong> ${escapeHtml(params.userAgent)}</li>
      <li><strong>Time:</strong> ${escapeHtml(params.timestamp)}</li>
    </ul>
    <p>If this was you, you can ignore this message.</p>
    <p>If you do not recognize this login, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({ to: params.to, subject: subject, text: text, html: html });
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetLink: string;
  expiresAt?: string;
}) {
  const subject = "Reset your BitChange password";

  const text = `Hello,

We received a request to reset the password of your BitChange account.

You can reset your password by visiting this link:
${params.resetLink}

${params.expiresAt ? `This link will expire on ${params.expiresAt}.\n\n` : ""}If you did not request this, you can safely ignore this email.

BitChange Security Team`;

  const html = `
    <h2>Password reset request</h2>
    <p>We received a request to reset the password of your BitChange account.</p>
    <p><a href="${escapeHtml(params.resetLink)}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
    ${
      params.expiresAt
        ? `<p>This link will expire on ${escapeHtml(params.expiresAt)}.</p>`
        : ""
    }
    <p>If you did not request this, you can safely ignore this email.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({ to: params.to, subject: subject, text: text, html: html });
}

/**
 * Withdrawal request email
 */
export async function sendWithdrawalRequestEmail(params: {
  to: string;
  asset: string;
  amount: string;
  address: string;
}) {
  const subject = "Withdrawal request received";
  const text = `Hello,

We have received your withdrawal request:

Asset: ${params.asset}
Amount: ${params.amount}
Destination address: ${params.address}

We will process this request according to our standard verification and security checks.

If you did not initiate this withdrawal, please contact support immediately.

BitChange Security Team`;

  const html = `
    <h2>Withdrawal request received</h2>
    <p>We have received a new withdrawal request from your <strong>BitChange</strong> account:</p>
    <ul>
      <li><strong>Asset:</strong> ${escapeHtml(params.asset)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(params.amount)}</li>
      <li><strong>Destination address:</strong> ${escapeHtml(params.address)}</li>
    </ul>
    <p>We will process this request according to our standard verification and security checks.</p>
    <p>If you did not initiate this withdrawal, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;

  return sendEmail({ to: params.to, subject: subject, text: text, html: html });
}

/**
 * KYC status email
 */
export async function sendKycStatusEmail(params: {
  to: string;
  status: "approved" | "rejected";
  reason?: string | null;
}) {
  const subject =
    params.status === "approved" ? "KYC approved" : "KYC review completed";

  const textApproved = `Hello,

Your KYC verification has been approved.

You can now access all features that require verified status.

BitChange Compliance Team`;

  const textRejected = `Hello,

Your KYC verification has been reviewed and was not approved.

Reason: ${params.reason || "no specific reason provided"}

You may update your documents and try again, or contact support for more information.

BitChange Compliance Team`;

  const htmlApproved = `
    <h2>KYC approved ✅</h2>
    <p>Your KYC verification has been approved.</p>
    <p>You can now access all features that require verified status.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;

  const htmlRejected = `
    <h2>KYC review completed</h2>
    <p>Your KYC verification has been reviewed and was <strong>not approved</strong>.</p>
    <p><strong>Reason:</strong> ${escapeHtml(
      params.reason || "no specific reason provided"
    )}</p>
    <p>You may update your documents and try again, or contact support for more information.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;

  const isApproved = params.status === "approved";

  return sendEmail({
    to: params.to,
    subject,
    text: isApproved ? textApproved : textRejected,
    html: isApproved ? htmlApproved : htmlRejected,
  });
}
