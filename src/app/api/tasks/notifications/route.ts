/**
 * Task Notifications API Route
 *
 * POST /api/tasks/notifications - Send task chat notifications
 *
 * Handles:
 * - task_new_message: New message in task chat (configurable)
 * - task_time_logged: Time logged on task (configurable)
 *
 * Requires authentication for all operations.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, handleApiError } from '@/lib/api/response';
import { mailer } from '@/modules/mailer';

const taskNotificationSchema = z.object({
  type: z.enum(['task_new_message', 'task_time_logged']),
  taskId: z.string().min(1, 'Task ID is required'),
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required'),
  messageSummary: z.string().optional(),
  timeEntry: z.string().optional(),
  comment: z.string().optional(),
});

/**
 * POST /api/tasks/notifications
 *
 * Send task notifications based on the event type.
 */
// @ts-expect-error - withAuth type inference issue
export const POST = withAuth(async (userId: string, request: NextRequest) => {
  try {
    const body = await request.json();
    const validationResult = taskNotificationSchema.safeParse(body);

    if (!validationResult.success) {
      return apiBadRequest('Invalid notification data', validationResult.error.errors);
    }

    const { type, taskId, recipientIds, messageSummary, timeEntry, comment } = validationResult.data;

    let result;

    switch (type) {
      case 'task_new_message':
        result = await mailer.notifyTaskNewMessage({
          recipientIds,
          taskId,
          actorId: userId,
          messageSummary,
        });
        break;

      case 'task_time_logged':
        result = await mailer.notifyTaskTimeLogged({
          recipientIds,
          taskId,
          actorId: userId,
          timeEntry,
          comment,
        });
        break;

      default:
        return apiBadRequest(`Unknown notification type: ${type}`);
    }

    return apiSuccess({
      type,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/tasks/notifications');
  }
});
