/**
 * POST /api/push/subscribe
 *
 * Save a push notification subscription for the authenticated user.
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { apiCreated, apiBadRequest, handleApiError } from '@/lib/api/response';
import { SubscriptionService } from '@/modules/push-notifications/services/subscription.service';

// @ts-expect-error - withAuth type inference issue
export const POST = withAuth(async (userId: string, request: NextRequest) => {
  try {
    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return apiBadRequest('Invalid push subscription: missing endpoint or keys');
    }

    await SubscriptionService.saveSubscription(userId, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: userAgent || '',
      createdAt: new Date().toISOString(),
    });

    return apiCreated({ subscribed: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/push/subscribe');
  }
});
