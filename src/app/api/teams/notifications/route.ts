/**
 * Team Notifications API Route
 *
 * POST /api/teams/notifications - Send team notifications
 *
 * Handles:
 * - team_member_added_you: When user is added to a team (ALWAYS sent)
 * - team_member_added: When someone else joins (configurable)
 * - team_new_message: When new message posted (configurable)
 *
 * Requires authentication for all operations.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, handleApiError } from '@/lib/api/response';
import { mailer } from '@/modules/mailer';

/**
 * Request body schema for team notifications
 */
const teamNotificationSchema = z.object({
  type: z.enum(['team_member_added_you', 'team_member_added', 'team_new_message']),
  teamId: z.string().min(1, 'Team ID is required'),
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required'),
  // Optional fields depending on notification type
  newMemberName: z.string().optional(),
  newMemberId: z.string().optional(),
  messageSummary: z.string().optional(),
});

type TeamNotificationRequest = z.infer<typeof teamNotificationSchema>;

/**
 * POST /api/teams/notifications
 *
 * Send team notifications based on the event type.
 *
 * @body type - Notification type
 * @body teamId - Team ID
 * @body recipientIds - Array of user IDs to notify
 * @body newMemberName - Name of the new member (for team_member_added)
 * @body newMemberId - ID of the new member (for team_member_added)
 * @body messageSummary - Message preview (for team_new_message)
 *
 * @returns 200 with notification results
 */
// @ts-expect-error - withAuth type inference issue
export const POST = withAuth(async (userId: string, request: NextRequest) => {
  try {
    console.log('[API] POST /api/teams/notifications - Sending team notification');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = teamNotificationSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid notification data', validationResult.error.errors);
    }

    const { type, teamId, recipientIds, newMemberName, newMemberId, messageSummary } =
      validationResult.data;

    console.log('[API] Notification type:', type);
    console.log('[API] Team ID:', teamId);
    console.log('[API] Recipients:', recipientIds.length);

    let result;

    switch (type) {
      case 'team_member_added_you':
        // This notification is ALWAYS sent (not configurable)
        result = await mailer.notifyTeamMemberAddedYou({
          recipientIds,
          teamId,
          actorId: userId,
        });
        break;

      case 'team_member_added':
        // This notification respects user preferences
        if (!newMemberName || !newMemberId) {
          return apiBadRequest('newMemberName and newMemberId are required for team_member_added');
        }
        result = await mailer.notifyTeamMemberAdded({
          recipientIds,
          teamId,
          actorId: userId,
          newMemberName,
          newMemberId,
        });
        break;

      case 'team_new_message':
        // This notification respects user preferences
        result = await mailer.notifyTeamNewMessage({
          recipientIds,
          teamId,
          actorId: userId,
          messageSummary,
        });
        break;

      default:
        return apiBadRequest(`Unknown notification type: ${type}`);
    }

    console.log('[API] Notification result - sent:', result.sent, 'failed:', result.failed);

    return apiSuccess({
      type,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: unknown) {
    console.error('[API] Error in POST /api/teams/notifications:', error);
    return handleApiError(error, 'POST /api/teams/notifications');
  }
});
