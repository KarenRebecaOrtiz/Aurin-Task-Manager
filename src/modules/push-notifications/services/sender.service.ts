/**
 * Push Notifications - Sender Service (Transport Layer)
 *
 * Mirrors the pattern from mailer/transporter.ts.
 * This is the ONLY file that knows about the web-push library.
 * Handles VAPID-based push delivery and expired subscription cleanup.
 */

import 'server-only';
import webpush from 'web-push';
import { pushConfig, isPushConfigured } from '../config';
import { SubscriptionService, type PushSubscriptionRecord } from './subscription.service';

// Singleton initialization flag
let initialized = false;

/**
 * Lazy-initialize web-push with VAPID details (singleton pattern).
 */
function ensureInitialized(): void {
  if (!initialized && isPushConfigured()) {
    webpush.setVapidDetails(
      pushConfig.vapidSubject,
      pushConfig.vapidPublicKey,
      pushConfig.vapidPrivateKey
    );
    initialized = true;
    console.log('[Push] web-push initialized with VAPID');
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a single subscription.
 * Handles 410 Gone / 404 (expired subscription cleanup).
 * Non-throwing — returns result object.
 */
export async function sendPushToSubscription(
  userId: string,
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<{ success: boolean; expired?: boolean }> {
  ensureInitialized();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60, // 1 hour
        urgency: 'normal',
      }
    );
    return { success: true };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    // 410 Gone or 404 = subscription expired, clean up
    if (statusCode === 410 || statusCode === 404) {
      console.log(`[Push] Subscription expired for user ${userId}, removing`);
      await SubscriptionService.removeSubscription(userId, subscription.endpoint);
      return { success: false, expired: true };
    }

    console.error(`[Push] Error sending to user ${userId}:`, error);
    return { success: false };
  }
}

/**
 * Send push notification to ALL subscriptions for a user (multi-device).
 * Non-throwing — returns aggregate result.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await SubscriptionService.getSubscriptions(userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(userId, sub, payload))
  );

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;
  const failed = results.length - sent;

  return { sent, failed };
}
