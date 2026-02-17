/**
 * Push Notifications Module - Configuration
 *
 * Centralized push notification configuration with VAPID keys.
 * Mirrors the pattern from mailer/config.ts.
 */

import 'server-only';

/**
 * Application URLs for push notification deep links
 */
const PROD_URL = 'https://pm.aurincloud.com';

export const pushAppConfig = {
  url: process.env.NEXT_PUBLIC_APP_URL || PROD_URL,
  dashboardUrl: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    : `${PROD_URL}/dashboard`,
};

/**
 * VAPID configuration for web-push
 */
export const pushConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:soporte@aurincloud.com',
};

/**
 * Check if push service is configured (non-throwing)
 */
export function isPushConfigured(): boolean {
  return Boolean(pushConfig.vapidPublicKey && pushConfig.vapidPrivateKey);
}

/**
 * Validate that required environment variables are set
 * Throws error if configuration is invalid
 */
export function validatePushConfig(): void {
  const requiredVars = ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required push notification configuration: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }
}
