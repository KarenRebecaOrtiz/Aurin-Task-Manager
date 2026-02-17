/**
 * Unified Notification Module
 *
 * Orchestrates both email (mailer) and push notification channels.
 * Each channel is independent and non-throwing — if one fails,
 * the other still succeeds.
 *
 * Drop-in replacement for direct `mailer` imports in trigger points.
 *
 * Usage:
 * ```typescript
 * import { notifier } from '@/modules/notifications';
 *
 * await notifier.notifyTaskCreated({
 *   recipientIds: ['user1', 'user2'],
 *   taskId: 'task123',
 *   actorId: 'currentUser'
 * });
 * ```
 */

import 'server-only';

import { mailer } from '@/modules/mailer';
import { pushNotifier } from '@/modules/push-notifications';

/**
 * Unified notifier — dispatches to both email and push channels.
 * Method signatures are identical to mailer facade.
 */
export const notifier = {
  // =========================================================================
  // TASK NOTIFICATIONS
  // =========================================================================

  notifyTaskCreated: async (params: Parameters<typeof mailer.notifyTaskCreated>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskCreated(params),
      pushNotifier.notifyTaskCreated(params),
    ]);
    return { email, push };
  },

  notifyTaskUpdated: async (params: Parameters<typeof mailer.notifyTaskUpdated>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskUpdated(params),
      pushNotifier.notifyTaskUpdated(params),
    ]);
    return { email, push };
  },

  notifyTaskStatusChanged: async (params: Parameters<typeof mailer.notifyTaskStatusChanged>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskStatusChanged(params),
      pushNotifier.notifyTaskStatusChanged(params),
    ]);
    return { email, push };
  },

  notifyTaskPriorityChanged: async (params: Parameters<typeof mailer.notifyTaskPriorityChanged>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskPriorityChanged(params),
      pushNotifier.notifyTaskPriorityChanged(params),
    ]);
    return { email, push };
  },

  notifyTaskDatesChanged: async (params: Parameters<typeof mailer.notifyTaskDatesChanged>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskDatesChanged(params),
      pushNotifier.notifyTaskDatesChanged(params),
    ]);
    return { email, push };
  },

  notifyTaskAssignmentChanged: async (params: Parameters<typeof mailer.notifyTaskAssignmentChanged>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskAssignmentChanged(params),
      pushNotifier.notifyTaskAssignmentChanged(params),
    ]);
    return { email, push };
  },

  notifyTaskArchived: async (params: Parameters<typeof mailer.notifyTaskArchived>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskArchived(params),
      pushNotifier.notifyTaskArchived(params),
    ]);
    return { email, push };
  },

  notifyTaskUnarchived: async (params: Parameters<typeof mailer.notifyTaskUnarchived>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskUnarchived(params),
      pushNotifier.notifyTaskUnarchived(params),
    ]);
    return { email, push };
  },

  notifyTaskDeleted: async (params: Parameters<typeof mailer.notifyTaskDeleted>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskDeleted(params),
      pushNotifier.notifyTaskDeleted(params),
    ]);
    return { email, push };
  },

  notifyTaskNewMessage: async (params: Parameters<typeof mailer.notifyTaskNewMessage>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskNewMessage(params),
      pushNotifier.notifyTaskNewMessage(params),
    ]);
    return { email, push };
  },

  notifyTaskTimeLogged: async (params: Parameters<typeof mailer.notifyTaskTimeLogged>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTaskTimeLogged(params),
      pushNotifier.notifyTaskTimeLogged(params),
    ]);
    return { email, push };
  },

  // =========================================================================
  // TEAM NOTIFICATIONS
  // =========================================================================

  notifyTeamMemberAddedYou: async (params: Parameters<typeof mailer.notifyTeamMemberAddedYou>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTeamMemberAddedYou(params),
      pushNotifier.notifyTeamMemberAddedYou(params),
    ]);
    return { email, push };
  },

  notifyTeamMemberAdded: async (params: Parameters<typeof mailer.notifyTeamMemberAdded>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTeamMemberAdded(params),
      pushNotifier.notifyTeamMemberAdded(params),
    ]);
    return { email, push };
  },

  notifyTeamNewMessage: async (params: Parameters<typeof mailer.notifyTeamNewMessage>[0]) => {
    const [email, push] = await Promise.allSettled([
      mailer.notifyTeamNewMessage(params),
      pushNotifier.notifyTeamNewMessage(params),
    ]);
    return { email, push };
  },
};

export default notifier;
