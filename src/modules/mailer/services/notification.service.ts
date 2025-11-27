/**
 * Mailer Module - Notification Service (Application Layer)
 *
 * This is the ONLY interface your application should use for sending emails.
 * It orchestrates data fetching, template generation, and email sending.
 *
 * Follows SOLID Principles:
 * - Single Responsibility: Only handles notification logic
 * - Open/Closed: Easy to extend with new notification types
 * - Dependency Inversion: Depends on abstractions (sendEmailInternal), not implementation
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { appConfig, isMailConfigured } from '../config';
import { sendEmailInternal } from '../transporter';
import {
  getTaskCreatedTemplate,
  type TaskCreatedTemplateData,
} from '../templates/task-created';
import {
  getTaskUpdatedTemplate,
  type TaskUpdatedTemplateData,
} from '../templates/task-updated';
import {
  getTaskArchivedTemplate,
  getTaskUnarchivedTemplate,
  type TaskArchivedTemplateData,
  type TaskUnarchivedTemplateData,
} from '../templates/task-archived';
import {
  getTaskDeletedTemplate,
  type TaskDeletedTemplateData,
} from '../templates/task-deleted';

// --- Type Definitions ---

export type NotificationType =
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_priority_changed'
  | 'task_dates_changed'
  | 'task_assignment_changed'
  | 'task_archived'
  | 'task_unarchived'
  | 'task_deleted';

export interface NotificationData {
  recipientIds: string[]; // Array of user IDs to notify
  taskId: string;
  actorId: string; // User who performed the action
  type: NotificationType;
  // Optional fields for specific notification types
  oldValue?: string;
  newValue?: string;
}

interface UserBasicInfo {
  email?: string;
  emailAddress?: string;
  fullName?: string;
  firstName?: string;
}

// --- Helper Functions ---

/**
 * Fetch basic user information from Firestore using Admin SDK
 */
async function getUserInfo(userId: string): Promise<UserBasicInfo | null> {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data() as UserBasicInfo;
    }
    return null;
  } catch (error) {
    console.error(`[Mailer] Error fetching user ${userId}:`, error);
    return null;
  }
}

/**
 * Fetch task information from Firestore using Admin SDK
 */
async function getTaskInfo(taskId: string): Promise<any | null> {
  try {
    const adminDb = getAdminDb();
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
    if (taskDoc.exists) {
      return taskDoc.data();
    }
    return null;
  } catch (error) {
    console.error(`[Mailer] Error fetching task ${taskId}:`, error);
    return null;
  }
}

/**
 * Get user's email address
 */
function getUserEmail(userInfo: UserBasicInfo | null): string | null {
  if (!userInfo) return null;
  return userInfo.email || userInfo.emailAddress || null;
}

/**
 * Get user's display name
 */
function getUserDisplayName(userInfo: UserBasicInfo | null): string {
  if (!userInfo) return 'Usuario';
  return userInfo.fullName || userInfo.firstName || 'Usuario';
}

/**
 * Get task URL
 */
function getTaskUrl(taskId: string): string {
  return `${appConfig.dashboardUrl}/tasks/${taskId}`;
}

/**
 * Format Firestore timestamp to readable date
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return new Date(timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Get list of user names from user IDs
 */
async function getUserNamesList(userIds: string[]): Promise<string> {
  if (!userIds || userIds.length === 0) return '';

  try {
    const names = await Promise.all(
      userIds.map(async (userId) => {
        const info = await getUserInfo(userId);
        return getUserDisplayName(info);
      })
    );
    return names.join(', ');
  } catch {
    return 'No disponible';
  }
}

// --- Notification Service Class ---

export class NotificationService {
  /**
   * Send task-related notification emails
   *
   * This is the main entry point for all task notifications.
   * Handles data fetching, template selection, and email sending.
   *
   * @param data - Notification data including recipients, task, and type
   * @returns Promise with success status
   */
public static async sendTaskNotification(
    data: NotificationData
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    // Check if email is configured
    if (!isMailConfigured()) {
      console.warn('[Mailer] Email service not configured. Skipping notification.');
      return { success: false, sent: 0, failed: 0 };
    }

    // Validate input
    if (!data.recipientIds || data.recipientIds.length === 0) {
      console.warn('[Mailer] No recipients specified. Skipping notification.');
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      // Fetch required data
      const [actorInfo, taskInfo] = await Promise.all([
        getUserInfo(data.actorId),
        getTaskInfo(data.taskId),
      ]);

      if (!taskInfo) {
        console.error('[Mailer] Task not found:', data.taskId);
        return { success: false, sent: 0, failed: 0 };
      }

      const actorName = getUserDisplayName(actorInfo);
      const taskUrl = getTaskUrl(data.taskId);

      // Send emails to all recipients
      const results = await Promise.allSettled(
        data.recipientIds.map(async (recipientId) => {
          // Skip sending to the actor
          if (recipientId === data.actorId) {
            return { success: true, skipped: true };
          }

          const recipientInfo = await getUserInfo(recipientId);
          const recipientEmail = getUserEmail(recipientInfo);

          if (!recipientEmail) {
            console.warn(`[Mailer] No email found for user ${recipientId}`);
            return { success: false, error: 'No email' };
          }

          const recipientName = getUserDisplayName(recipientInfo);

          // Generate email based on notification type
          const emailResult = await this.generateAndSendEmail(
            data.type,
            {
              recipientName,
              actorName,
              taskInfo,
              taskUrl,
              oldValue: data.oldValue,
              newValue: data.newValue,
            },
            recipientEmail
          );

          return emailResult;
        })
      );

      // Count successes and failures
      const sent = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length;

      console.log(`[Mailer] Notification sent: ${sent} successful, ${failed} failed`);

      return { success: sent > 0, sent, failed };
    } catch (error) {
      console.error('[Mailer] Error sending notifications:', error);
      return { success: false, sent: 0, failed: data.recipientIds.length };
    }
  }

  /**
   * Generate email template and send
   * (Private helper method)
   */
  private static async generateAndSendEmail(
    type: NotificationType,
    data: {
      recipientName: string;
      actorName: string;
      taskInfo: any;
      taskUrl: string;
      oldValue?: string;
      newValue?: string;
    },
    recipientEmail: string
  ): Promise<{ success: boolean; error?: unknown }> {
    try {
      let subject: string;
      let html: string;

      // Common template data
      const commonData = {
        recipientName: data.recipientName,
        taskName: data.taskInfo.name || 'Tarea',
        taskUrl: data.taskUrl,
        taskDescription: data.taskInfo.description || '',
        taskObjectives: data.taskInfo.objectives || '',
        priority: data.taskInfo.priority || '',
        status: data.taskInfo.status || '',
        startDate: formatDate(data.taskInfo.startDate),
        endDate: formatDate(data.taskInfo.endDate),
        leadersList: await getUserNamesList(data.taskInfo.LeadedBy || []),
        assignedList: await getUserNamesList(data.taskInfo.AssignedTo || []),
      };

      // Select template based on notification type
      switch (type) {
        case 'task_created':
          subject = `Nueva tarea asignada: ${data.taskInfo.name}`;
          html = getTaskCreatedTemplate({
            ...commonData,
            creatorName: data.actorName,
          } as TaskCreatedTemplateData);
          break;

        case 'task_status_changed':
          subject = `Actualización de tarea: ${data.taskInfo.name}`;
          html = getTaskUpdatedTemplate({
            ...commonData,
            updaterName: data.actorName,
            updateType: 'status',
            oldValue: data.oldValue,
            newValue: data.newValue,
          } as TaskUpdatedTemplateData);
          break;

        case 'task_priority_changed':
          subject = `Cambio de prioridad: ${data.taskInfo.name}`;
          html = getTaskUpdatedTemplate({
            ...commonData,
            updaterName: data.actorName,
            updateType: 'priority',
            oldValue: data.oldValue,
            newValue: data.newValue,
          } as TaskUpdatedTemplateData);
          break;

        case 'task_dates_changed':
          subject = `Fechas actualizadas: ${data.taskInfo.name}`;
          html = getTaskUpdatedTemplate({
            ...commonData,
            updaterName: data.actorName,
            updateType: 'dates',
          } as TaskUpdatedTemplateData);
          break;

        case 'task_assignment_changed':
          subject = `Asignación modificada: ${data.taskInfo.name}`;
          html = getTaskUpdatedTemplate({
            ...commonData,
            updaterName: data.actorName,
            updateType: 'assignment',
          } as TaskUpdatedTemplateData);
          break;

        case 'task_updated':
          subject = `Tarea actualizada: ${data.taskInfo.name}`;
          html = getTaskUpdatedTemplate({
            ...commonData,
            updaterName: data.actorName,
            updateType: 'general',
          } as TaskUpdatedTemplateData);
          break;

        case 'task_archived':
          subject = `Tarea archivada: ${data.taskInfo.name}`;
          html = getTaskArchivedTemplate({
            recipientName: data.recipientName,
            archiverName: data.actorName,
            taskName: data.taskInfo.name,
            taskUrl: data.taskUrl,
            archiveDate: formatDate(new Date()),
          } as TaskArchivedTemplateData);
          break;

        case 'task_unarchived':
          subject = `Tarea reactivada: ${data.taskInfo.name}`;
          html = getTaskUnarchivedTemplate({
            recipientName: data.recipientName,
            unarchiverName: data.actorName,
            taskName: data.taskInfo.name,
            taskUrl: data.taskUrl,
          } as TaskUnarchivedTemplateData);
          break;

        case 'task_deleted':
          subject = `Tarea eliminada: ${data.taskInfo.name}`;
          html = getTaskDeletedTemplate({
            recipientName: data.recipientName,
            deleterName: data.actorName,
            taskName: data.taskInfo.name,
            deletionDate: formatDate(new Date()),
            taskDescription: data.taskInfo.description,
          } as TaskDeletedTemplateData);
          break;

        default:
          console.warn(`[Mailer] Unknown notification type: ${type}`);
          return { success: false, error: 'Unknown notification type' };
      }

      // Send email
      const result = await sendEmailInternal({
        to: recipientEmail,
        subject,
        html,
      });

      return result;
    } catch (error) {
      console.error('[Mailer] Error generating/sending email:', error);
      return { success: false, error };
    }
  }
}
