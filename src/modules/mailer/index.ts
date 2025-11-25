/**
 * Mailer Module - Entry Point (Facade Pattern)
 *
 * ⚠️ SERVER-ONLY MODULE - Do not import in client components!
 *
 * This is the ONLY file you should import from the mailer module.
 * It provides a clean, simple API for the rest of your application.
 *
 * Example usage:
 * ```typescript
 * import { mailer } from '@/modules/mailer';
 *
 * await mailer.notifyTaskCreated({
 *   recipientIds: ['user1', 'user2'],
 *   taskId: 'task123',
 *   actorId: 'currentUser'
 * });
 * ```
 *
 * Benefits of Facade Pattern:
 * - Simple, consistent API
 * - Hides internal complexity
 * - Easy to mock for testing
 * - Easy to refactor internals without breaking consumers
 */

import 'server-only';

import { NotificationService, type NotificationData, type NotificationType } from './services/notification.service';
import { isMailConfigured, validateMailConfig } from './config';
import { verifyTransporter } from './transporter';

// --- Public API ---

/**
 * Mailer Facade - Simple, type-safe API for sending notifications
 */
export const mailer = {
  /**
   * Send task created notification
   */
  notifyTaskCreated: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_created',
    });
  },

  /**
   * Send task updated notification (general)
   */
  notifyTaskUpdated: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_updated',
    });
  },

  /**
   * Send task status changed notification
   */
  notifyTaskStatusChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    oldStatus: string;
    newStatus: string;
  }) => {
    return NotificationService.sendTaskNotification({
      recipientIds: params.recipientIds,
      taskId: params.taskId,
      actorId: params.actorId,
      type: 'task_status_changed',
      oldValue: params.oldStatus,
      newValue: params.newStatus,
    });
  },

  /**
   * Send task priority changed notification
   */
  notifyTaskPriorityChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
    oldPriority: string;
    newPriority: string;
  }) => {
    return NotificationService.sendTaskNotification({
      recipientIds: params.recipientIds,
      taskId: params.taskId,
      actorId: params.actorId,
      type: 'task_priority_changed',
      oldValue: params.oldPriority,
      newValue: params.newPriority,
    });
  },

  /**
   * Send task dates changed notification
   */
  notifyTaskDatesChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_dates_changed',
    });
  },

  /**
   * Send task assignment changed notification
   */
  notifyTaskAssignmentChanged: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_assignment_changed',
    });
  },

  /**
   * Send task archived notification
   */
  notifyTaskArchived: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_archived',
    });
  },

  /**
   * Send task unarchived notification
   */
  notifyTaskUnarchived: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_unarchived',
    });
  },

  /**
   * Send task deleted notification
   */
  notifyTaskDeleted: async (params: {
    recipientIds: string[];
    taskId: string;
    actorId: string;
  }) => {
    return NotificationService.sendTaskNotification({
      ...params,
      type: 'task_deleted',
    });
  },

  /**
   * Generic method for custom notification types
   * (Advanced usage - prefer specific methods above)
   */
  notify: async (data: NotificationData) => {
    return NotificationService.sendTaskNotification(data);
  },

  /**
   * Check if mailer is configured and ready
   */
  isConfigured: () => {
    return isMailConfigured();
  },

  /**
   * Validate mailer configuration (throws if invalid)
   */
  validate: () => {
    return validateMailConfig();
  },

  /**
   * Verify transporter connection (for health checks)
   */
  verify: async () => {
    return verifyTransporter();
  },
};

// --- Re-export types for convenience ---
export type { NotificationData, NotificationType } from './services/notification.service';

// --- Default Export ---
export default mailer;
