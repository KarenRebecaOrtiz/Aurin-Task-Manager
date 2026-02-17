/**
 * Push Notifications - Subscription Storage Service
 *
 * Manages push subscription CRUD in Firestore.
 * Firestore path: users/{userId}/pushSubscriptions/{docId}
 */

import 'server-only';
import { getAdminDb } from '@/lib/firebase-admin';

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  lastUsed?: string;
}

/**
 * Generate a stable document ID from an endpoint URL.
 * Uses base64url encoding, truncated to 128 chars (Firestore doc ID limit is 1500).
 */
function endpointToDocId(endpoint: string): string {
  return Buffer.from(endpoint).toString('base64url').slice(0, 128);
}

export class SubscriptionService {
  /**
   * Save a push subscription for a user.
   * Uses endpoint hash as document ID for idempotency (same endpoint = same doc).
   */
  static async saveSubscription(
    userId: string,
    subscription: PushSubscriptionRecord
  ): Promise<void> {
    const adminDb = getAdminDb();
    const docId = endpointToDocId(subscription.endpoint);

    await adminDb
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .doc(docId)
      .set(
        {
          ...subscription,
          createdAt: subscription.createdAt || new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
        { merge: true }
      );
  }

  /**
   * Get all active push subscriptions for a user (multi-device support).
   */
  static async getSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .get();

    return snapshot.docs.map((doc) => doc.data() as PushSubscriptionRecord);
  }

  /**
   * Remove a subscription by endpoint (expired or unsubscribed).
   */
  static async removeSubscription(userId: string, endpoint: string): Promise<void> {
    const adminDb = getAdminDb();
    const docId = endpointToDocId(endpoint);

    await adminDb
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .doc(docId)
      .delete();
  }

  /**
   * Remove all subscriptions for a user.
   */
  static async removeAllSubscriptions(userId: string): Promise<void> {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('pushSubscriptions')
      .get();

    if (snapshot.empty) return;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
