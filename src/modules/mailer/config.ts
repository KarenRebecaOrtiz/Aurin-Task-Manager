/**
 * Mailer Module - Configuration
 *
 * Centralized email configuration with environment variables validation.
 * Follows Single Responsibility Principle.
 */

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Email configuration from environment variables
 * Using Gmail SMTP as default but can be easily swapped
 */
export const mailConfig = {
  service: 'gmail', // Gmail SMTP service
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || '"Aurin Task Manager" <no-reply@aurin.com>',
};

/**
 * Application URLs for email templates
 */
export const appConfig = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    : 'http://localhost:3000/dashboard',
};

/**
 * Validate that required environment variables are set
 * Throws error if configuration is invalid
 */
export function validateMailConfig(): void {
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASS'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required email configuration: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }
}

/**
 * Check if email service is configured (non-throwing)
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}
