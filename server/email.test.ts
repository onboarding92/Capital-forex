import { describe, it, expect } from 'vitest';
import { sendEmail } from './email';

describe('SendGrid Email Integration', () => {
  it('should validate SendGrid API key is configured', () => {
    expect(process.env.SENDGRID_API_KEY).toBeDefined();
    expect(process.env.SENDGRID_API_KEY).toMatch(/^SG\./);
    expect(process.env.SENDGRID_FROM_EMAIL).toBeDefined();
    expect(process.env.SENDGRID_FROM_NAME).toBeDefined();
  });

  it('should send a test email successfully', async () => {
    // sendEmail returns void, so we just check it doesn't throw
    await expect(
      sendEmail({
        to: process.env.SENDGRID_FROM_EMAIL!, // Send to self for testing
        subject: 'BitChange Pro - SendGrid Integration Test',
        html: '<h1>Test Email</h1><p>This is a test email to verify SendGrid integration.</p>',
      })
    ).resolves.toBeUndefined();
  }, 10000); // 10 second timeout for email API call
});
