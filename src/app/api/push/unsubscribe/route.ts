/**
 * POST /api/push/unsubscribe
 *
 * Remove a push notification subscription for the authenticated user.
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, handleApiError } from '@/lib/api/response';
import { SubscriptionService } from '@/modules/push-notifications/services/subscription.service';

// @ts-expect-error - withAuth type inference issue
export const POST = withAuth(async (userId: string, request: NextRequest) => {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return apiBadRequest('Missing endpoint');
    }

    await SubscriptionService.removeSubscription(userId, endpoint);

    return apiSuccess({ unsubscribed: true });
  } catch (error) {
    return handleApiError(error, 'POST /api/push/unsubscribe');
  }
});
