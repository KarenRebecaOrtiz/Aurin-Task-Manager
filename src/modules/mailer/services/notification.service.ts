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
import {
  getTeamMemberAddedYouTemplate,
  getTeamMemberAddedOtherTemplate,
  type TeamMemberAddedYouTemplateData,
  type TeamMemberAddedOtherTemplateData,
} from '../templates/team-member-added';
import {
  getTeamNewMessageTemplate,
  type TeamNewMessageTemplateData,
} from '../templates/team-new-message';

// --- Type Definitions ---

export type NotificationType =
  // Task notifications
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_priority_changed'
  | 'task_dates_changed'
  | 'task_assignment_changed'
  | 'task_archived'
  | 'task_unarchived'
  | 'task_deleted'
  // Team notifications
  | 'team_member_added_you'   // Cuando te agregan a un equipo (siempre se envía)
  | 'team_new_message'        // Nuevo mensaje en equipo (configurable)
  | 'team_member_added';      // Alguien más fue agregado al equipo (configurable)

/**
 * Data for task notifications
 */
export interface TaskNotificationData {
  recipientIds: string[];
  taskId: string;
  actorId: string;
  type: Extract<NotificationType, `task_${string}`>;
  oldValue?: string;
  newValue?: string;
}

/**
 * Data for team notifications
 */
export interface TeamNotificationData {
  recipientIds: string[];
  teamId: string;
  actorId: string;
  type: Extract<NotificationType, `team_${string}`>;
  /** Nombre del nuevo miembro (para team_member_added) */
  newMemberName?: string;
  /** ID del nuevo miembro */
  newMemberId?: string;
  /** Resumen del mensaje (para team_new_message) */
  messageSummary?: string;
}

/**
 * @deprecated Use TaskNotificationData or TeamNotificationData
 */
export interface NotificationData {
  recipientIds: string[];
  taskId: string;
  actorId: string;
  type: NotificationType;
  oldValue?: string;
  newValue?: string;
}

interface UserBasicInfo {
  email?: string;
  emailAddress?: string;
  fullName?: string;
  firstName?: string;
}

/**
 * Task notification preferences structure
 * Stored in: tasks/{taskId}/notificationPreferences/{userId}
 */
interface TaskNotificationPreferences {
  updated: boolean;
  statusChanged: boolean;
  priorityChanged: boolean;
  datesChanged: boolean;
  assignmentChanged: boolean;
  archived: boolean;
  unarchived: boolean;
  deleted: boolean;
}

/**
 * Team notification preferences structure
 * Stored in: teams/{teamId}/notificationPreferences/{userId}
 */
interface TeamNotificationPreferences {
  newMessage: boolean;
  memberAdded: boolean;
}

/**
 * Default preferences for TASKS: all notifications enabled
 */
const DEFAULT_TASK_PREFERENCES: TaskNotificationPreferences = {
  updated: true,
  statusChanged: true,
  priorityChanged: true,
  datesChanged: true,
  assignmentChanged: true,
  archived: true,
  unarchived: true,
  deleted: true,
};

/**
 * Default preferences for TEAMS: all notifications enabled
 */
const DEFAULT_TEAM_PREFERENCES: TeamNotificationPreferences = {
  newMessage: true,
  memberAdded: true,
};

/**
 * Map task NotificationType to the preference key
 * Note: task_created is NOT mapped because user hasn't set preferences yet
 */
const TASK_NOTIFICATION_TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof TaskNotificationPreferences>> = {
  task_updated: 'updated',
  task_status_changed: 'statusChanged',
  task_priority_changed: 'priorityChanged',
  task_dates_changed: 'datesChanged',
  task_assignment_changed: 'assignmentChanged',
  task_archived: 'archived',
  task_unarchived: 'unarchived',
  task_deleted: 'deleted',
};

/**
 * Map team NotificationType to the preference key
 * Note: team_member_added_you is NOT mapped because it always sends
 */
const TEAM_NOTIFICATION_TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof TeamNotificationPreferences>> = {
  team_new_message: 'newMessage',
  team_member_added: 'memberAdded',
};

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
 * Fetch user's notification preferences for a specific task
 * Stored in: tasks/{taskId}/notificationPreferences/{userId}
 */
async function getTaskNotificationPreferences(
  taskId: string,
  userId: string
): Promise<TaskNotificationPreferences> {
  try {
    const adminDb = getAdminDb();
    const prefsDoc = await adminDb
      .collection('tasks')
      .doc(taskId)
      .collection('notificationPreferences')
      .doc(userId)
      .get();

    if (prefsDoc.exists) {
      const data = prefsDoc.data() as Partial<TaskNotificationPreferences>;
      return {
        ...DEFAULT_TASK_PREFERENCES,
        ...data,
      };
    }

    return DEFAULT_TASK_PREFERENCES;
  } catch (error) {
    console.error(`[Mailer] Error fetching task notification preferences for user ${userId} in task ${taskId}:`, error);
    return DEFAULT_TASK_PREFERENCES;
  }
}

/**
 * Fetch user's notification preferences for a specific team
 * Stored in: teams/{teamId}/notificationPreferences/{userId}
 */
async function getTeamNotificationPreferences(
  teamId: string,
  userId: string
): Promise<TeamNotificationPreferences> {
  try {
    const adminDb = getAdminDb();
    const prefsDoc = await adminDb
      .collection('teams')
      .doc(teamId)
      .collection('notificationPreferences')
      .doc(userId)
      .get();

    if (prefsDoc.exists) {
      const data = prefsDoc.data() as Partial<TeamNotificationPreferences>;
      return {
        ...DEFAULT_TEAM_PREFERENCES,
        ...data,
      };
    }

    return DEFAULT_TEAM_PREFERENCES;
  } catch (error) {
    console.error(`[Mailer] Error fetching team notification preferences for user ${userId} in team ${teamId}:`, error);
    return DEFAULT_TEAM_PREFERENCES;
  }
}

/**
 * Fetch team information from Firestore using Admin SDK
 */
async function getTeamInfo(teamId: string): Promise<any | null> {
  try {
    const adminDb = getAdminDb();
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (teamDoc.exists) {
      return teamDoc.data();
    }
    return null;
  } catch (error) {
    console.error(`[Mailer] Error fetching team ${teamId}:`, error);
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
 * Check if user has enabled notifications for this type in a specific TASK
 *
 * @param taskId - The task ID to check preferences for
 * @param userId - The user ID to check preferences for
 * @param notificationType - The type of notification
 * @returns Promise<boolean> - Whether to send the notification
 */
async function shouldSendTaskNotification(
  taskId: string,
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  // task_created always sends - user hasn't set per-task preferences yet
  if (notificationType === 'task_created') {
    return true;
  }

  // Get the preference key for this notification type
  const prefKey = TASK_NOTIFICATION_TYPE_TO_PREF_KEY[notificationType];

  // If no mapping exists for this type, default to sending
  if (!prefKey) {
    return true;
  }

  // Fetch user's preferences for this task
  const prefs = await getTaskNotificationPreferences(taskId, userId);

  // Return the preference value (default true if not found)
  return prefs[prefKey] ?? true;
}

/**
 * Check if user has enabled notifications for this type in a specific TEAM
 *
 * @param teamId - The team ID to check preferences for
 * @param userId - The user ID to check preferences for
 * @param notificationType - The type of notification
 * @returns Promise<boolean> - Whether to send the notification
 */
async function shouldSendTeamNotification(
  teamId: string,
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  // team_member_added_you always sends - you need to know you were added!
  if (notificationType === 'team_member_added_you') {
    return true;
  }

  // Get the preference key for this notification type
  const prefKey = TEAM_NOTIFICATION_TYPE_TO_PREF_KEY[notificationType];

  // If no mapping exists for this type, default to sending
  if (!prefKey) {
    return true;
  }

  // Fetch user's preferences for this team
  const prefs = await getTeamNotificationPreferences(teamId, userId);

  // Return the preference value (default true if not found)
  return prefs[prefKey] ?? true;
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
 * Get team URL
 */
function getTeamUrl(teamId: string): string {
  return `${appConfig.dashboardUrl}/teams/${teamId}`;
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

          // Check user's notification preferences for this task
          const shouldSend = await shouldSendTaskNotification(data.taskId, recipientId, data.type);
          if (!shouldSend) {
            console.log(`[Mailer] User ${recipientId} has disabled ${data.type} notifications for task ${data.taskId}. Skipping.`);
            return { success: true, skipped: true, reason: 'preference_disabled' };
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
   * Send team-related notification emails
   *
   * This handles all team notifications including:
   * - team_member_added_you: When you're added to a team (always sent)
   * - team_member_added: When someone else is added to your team (configurable)
   * - team_new_message: New message in team (configurable)
   *
   * @param data - Team notification data including recipients, team, and type
   * @returns Promise with success status
   */
  public static async sendTeamNotification(
    data: TeamNotificationData
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    // Check if email is configured
    if (!isMailConfigured()) {
      console.warn('[Mailer] Email service not configured. Skipping team notification.');
      return { success: false, sent: 0, failed: 0 };
    }

    // Validate input
    if (!data.recipientIds || data.recipientIds.length === 0) {
      console.warn('[Mailer] No recipients specified. Skipping team notification.');
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      // Fetch required data
      const [actorInfo, teamInfo] = await Promise.all([
        getUserInfo(data.actorId),
        getTeamInfo(data.teamId),
      ]);

      if (!teamInfo) {
        console.error('[Mailer] Team not found:', data.teamId);
        return { success: false, sent: 0, failed: 0 };
      }

      const actorName = getUserDisplayName(actorInfo);
      const teamUrl = getTeamUrl(data.teamId);

      // Send emails to all recipients
      const results = await Promise.allSettled(
        data.recipientIds.map(async (recipientId) => {
          // Skip sending to the actor (except for team_member_added_you)
          if (recipientId === data.actorId && data.type !== 'team_member_added_you') {
            return { success: true, skipped: true };
          }

          // Check user's notification preferences for this team
          const shouldSend = await shouldSendTeamNotification(data.teamId, recipientId, data.type);
          if (!shouldSend) {
            console.log(`[Mailer] User ${recipientId} has disabled ${data.type} notifications for team ${data.teamId}. Skipping.`);
            return { success: true, skipped: true, reason: 'preference_disabled' };
          }

          const recipientInfo = await getUserInfo(recipientId);
          const recipientEmail = getUserEmail(recipientInfo);

          if (!recipientEmail) {
            console.warn(`[Mailer] No email found for user ${recipientId}`);
            return { success: false, error: 'No email' };
          }

          const recipientName = getUserDisplayName(recipientInfo);

          // Generate email based on notification type
          const emailResult = await this.generateAndSendTeamEmail(
            data.type,
            {
              recipientName,
              actorName,
              teamInfo,
              teamUrl,
              newMemberName: data.newMemberName,
              newMemberId: data.newMemberId,
              messageSummary: data.messageSummary,
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

      console.log(`[Mailer] Team notification sent: ${sent} successful, ${failed} failed`);

      return { success: sent > 0, sent, failed };
    } catch (error) {
      console.error('[Mailer] Error sending team notifications:', error);
      return { success: false, sent: 0, failed: data.recipientIds.length };
    }
  }

  /**
   * Generate email template and send for TASKS
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

  /**
   * Generate email template and send for TEAMS
   * (Private helper method)
   */
  private static async generateAndSendTeamEmail(
    type: NotificationType,
    data: {
      recipientName: string;
      actorName: string;
      teamInfo: any;
      teamUrl: string;
      newMemberName?: string;
      newMemberId?: string;
      messageSummary?: string;
    },
    recipientEmail: string
  ): Promise<{ success: boolean; error?: unknown }> {
    try {
      let subject: string;
      let html: string;

      // Get members list for team templates
      const membersList = await getUserNamesList(data.teamInfo.memberIds || []);

      // Select template based on notification type
      switch (type) {
        case 'team_member_added_you':
          subject = `Te han agregado al equipo: ${data.teamInfo.name}`;
          html = getTeamMemberAddedYouTemplate({
            recipientName: data.recipientName,
            adderName: data.actorName,
            teamName: data.teamInfo.name,
            teamDescription: data.teamInfo.description,
            teamUrl: data.teamUrl,
            membersList,
            memberCount: data.teamInfo.memberIds?.length || 0,
          } as TeamMemberAddedYouTemplateData);
          break;

        case 'team_member_added':
          subject = `Nuevo miembro en ${data.teamInfo.name}`;
          html = getTeamMemberAddedOtherTemplate({
            recipientName: data.recipientName,
            adderName: data.actorName,
            newMemberName: data.newMemberName || 'Un nuevo miembro',
            teamName: data.teamInfo.name,
            teamUrl: data.teamUrl,
          } as TeamMemberAddedOtherTemplateData);
          break;

        case 'team_new_message':
          subject = `Nuevo mensaje en ${data.teamInfo.name}`;
          html = getTeamNewMessageTemplate({
            recipientName: data.recipientName,
            senderName: data.actorName,
            teamName: data.teamInfo.name,
            teamUrl: data.teamUrl,
            messageSummary: data.messageSummary,
          } as TeamNewMessageTemplateData);
          break;

        default:
          console.warn(`[Mailer] Unknown team notification type: ${type}`);
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
      console.error('[Mailer] Error generating/sending team email:', error);
      return { success: false, error };
    }
  }
}
