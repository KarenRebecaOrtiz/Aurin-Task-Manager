/**
 * Push Notifications Module - Entry Point (Facade Pattern)
 *
 * ⚠️ SERVER-ONLY MODULE - Do not import in client components!
 *
 * Mirrors the mailer module's facade with identical method signatures.
 * This allows trigger points to call both channels with the same params.
 *
 * Example usage:
 * ```typescript
 * import { pushNotifier } from '@/modules/push-notifications';
 *
 * await pushNotifier.notifyTaskCreated({
 *   recipientIds: ['user1', 'user2'],
 *   taskId: 'task123',
 *   actorId: 'currentUser'
 * });
 * ```
 */

import 'server-only';

import { PushNotificationService } from './services/notification.service';
import { isPushConfigured, validatePushConfig } from './config';

// Re-export types
export type {
  NotificationType,
  TaskNotificationData,
  TeamNotificationData,
} from './services/notification.service';

/**
 * Push Notifier Facade - Same API as mailer facade
 */
export const pushNotifier = {
  // =========================================================================
  // TASK NOTIFICATIONS
  // =========================================================================

  notifyTaskCreated: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_created',
    });
  },

  notifyTaskUpdated: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_updated',
    });
  },

  notifyTaskStatusChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    oldStatus: string;
    newStatus: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      recipientIds: params.recipientIds,
      taskId: params.taskId,
      actorId: params.actorId,
      type: 'task_status_changed',
      oldValue: params.oldStatus,
      newValue: params.newStatus,
    });
  },

  notifyTaskPriorityChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    oldPriority: string;
    newPriority: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      recipientIds: params.recipientIds,
      taskId: params.taskId,
      actorId: params.actorId,
      type: 'task_priority_changed',
      oldValue: params.oldPriority,
      newValue: params.newPriority,
    });
  },

  notifyTaskDatesChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_dates_changed',
    });
  },

  notifyTaskAssignmentChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_assignment_changed',
    });
  },

  notifyTaskArchived: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_archived',
    });
  },

  notifyTaskUnarchived: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_unarchived',
    });
  },

  notifyTaskDeleted: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_deleted',
    });
  },

  notifyTaskNewMessage: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    messageSummary?: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_new_message',
    });
  },

  notifyTaskTimeLogged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    timeEntry?: string;
    comment?: string;
  }) => {
    return PushNotificationService.sendTaskNotification({
      ...params,
      type: 'task_time_logged',
    });
  },

  // =========================================================================
  // TEAM NOTIFICATIONS
  // =========================================================================

  notifyTeamMemberAddedYou: async (params: {
    recipientIds: string[];
    teamId: string;
    actorId: string;
  }) => {
    return PushNotificationService.sendTeamNotification({
      ...params,
      type: 'team_member_added_you',
    });
  },

  notifyTeamMemberAdded: async (params: {
    recipientIds: string[];
    teamId: string;
    actorId: string;
    newMemberName: string;
    newMemberId: string;
  }) => {
    return PushNotificationService.sendTeamNotification({
      recipientIds: params.recipientIds,
      teamId: params.teamId,
      actorId: params.actorId,
      type: 'team_member_added',
      newMemberName: params.newMemberName,
      newMemberId: params.newMemberId,
    });
  },

  notifyTeamNewMessage: async (params: {
    recipientIds: string[];
    teamId: string;
    actorId: string;
    messageSummary?: string;
  }) => {
    return PushNotificationService.sendTeamNotification({
      recipientIds: params.recipientIds,
      teamId: params.teamId,
      actorId: params.actorId,
      type: 'team_new_message',
      messageSummary: params.messageSummary,
    });
  },

  // =========================================================================
  // UTILITY
  // =========================================================================

  isConfigured: () => isPushConfigured(),
  validate: () => validatePushConfig(),
};

export default pushNotifier;
