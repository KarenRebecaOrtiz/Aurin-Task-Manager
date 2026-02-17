/**
 * Push Notifications Module - Notification Service (Application Layer)
 *
 * Mirrors the mailer's NotificationService pattern:
 * - Same recipient filtering (dedup, actor exclusion)
 * - Same preference checking (independent push preferences)
 * - Same data fetching helpers
 * - Non-throwing design
 *
 * Generates short text payloads instead of HTML templates.
 */

import 'server-only';
import { getAdminDb } from '@/lib/firebase-admin';
import { isPushConfigured, pushAppConfig } from '../config';
import { sendPushToUser, type PushPayload } from './sender.service';
import type {
  NotificationType,
  TaskNotificationData,
  TeamNotificationData,
} from '@/modules/mailer/services/notification.service';

// Re-export types for convenience
export type { NotificationType, TaskNotificationData, TeamNotificationData };

// --- Preference Types (mirrors mailer but for push channel) ---

interface TaskPushPreferences {
  updated: boolean;
  statusChanged: boolean;
  priorityChanged: boolean;
  datesChanged: boolean;
  assignmentChanged: boolean;
  archived: boolean;
  unarchived: boolean;
  deleted: boolean;
  newMessage: boolean;
  timeLogged: boolean;
}

interface TeamPushPreferences {
  newMessage: boolean;
  memberAdded: boolean;
}

const DEFAULT_TASK_PUSH_PREFS: TaskPushPreferences = {
  updated: true,
  statusChanged: true,
  priorityChanged: true,
  datesChanged: true,
  assignmentChanged: true,
  archived: true,
  unarchived: true,
  deleted: true,
  newMessage: true,
  timeLogged: true,
};

const DEFAULT_TEAM_PUSH_PREFS: TeamPushPreferences = {
  newMessage: true,
  memberAdded: true,
};

const TASK_TYPE_TO_PREF: Partial<Record<NotificationType, keyof TaskPushPreferences>> = {
  task_updated: 'updated',
  task_status_changed: 'statusChanged',
  task_priority_changed: 'priorityChanged',
  task_dates_changed: 'datesChanged',
  task_assignment_changed: 'assignmentChanged',
  task_archived: 'archived',
  task_unarchived: 'unarchived',
  task_deleted: 'deleted',
  task_new_message: 'newMessage',
  task_time_logged: 'timeLogged',
};

const TEAM_TYPE_TO_PREF: Partial<Record<NotificationType, keyof TeamPushPreferences>> = {
  team_new_message: 'newMessage',
  team_member_added: 'memberAdded',
};

// --- Helper Functions ---

interface UserBasicInfo {
  email?: string;
  emailAddress?: string;
  fullName?: string;
  firstName?: string;
  imageUrl?: string;
}

async function getUserInfo(userId: string): Promise<UserBasicInfo | null> {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    return userDoc.exists ? (userDoc.data() as UserBasicInfo) : null;
  } catch (error) {
    console.error(`[Push] Error fetching user ${userId}:`, error);
    return null;
  }
}

function getUserDisplayName(userInfo: UserBasicInfo | null): string {
  if (!userInfo) return 'Usuario';
  return userInfo.fullName || userInfo.firstName || 'Usuario';
}

function getTaskUrl(taskId: string): string {
  return `${pushAppConfig.dashboardUrl}/tasks/${taskId}`;
}

function getTeamUrl(teamId: string): string {
  return `${pushAppConfig.dashboardUrl}/teams/${teamId}`;
}

async function getTaskInfo(taskId: string): Promise<Record<string, any> | null> {
  try {
    const adminDb = getAdminDb();
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
    return taskDoc.exists ? (taskDoc.data() as Record<string, any>) : null;
  } catch (error) {
    console.error(`[Push] Error fetching task ${taskId}:`, error);
    return null;
  }
}

async function getTeamInfo(teamId: string): Promise<Record<string, any> | null> {
  try {
    const adminDb = getAdminDb();
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    return teamDoc.exists ? (teamDoc.data() as Record<string, any>) : null;
  } catch (error) {
    console.error(`[Push] Error fetching team ${teamId}:`, error);
    return null;
  }
}

// --- Push Preference Checking ---

async function getTaskPushPreferences(
  taskId: string,
  userId: string
): Promise<TaskPushPreferences> {
  try {
    const adminDb = getAdminDb();
    const prefsDoc = await adminDb
      .collection('tasks')
      .doc(taskId)
      .collection('pushNotificationPreferences')
      .doc(userId)
      .get();

    if (prefsDoc.exists) {
      return { ...DEFAULT_TASK_PUSH_PREFS, ...(prefsDoc.data() as Partial<TaskPushPreferences>) };
    }
    return DEFAULT_TASK_PUSH_PREFS;
  } catch (error) {
    console.error(`[Push] Error fetching task push prefs for user ${userId}:`, error);
    return DEFAULT_TASK_PUSH_PREFS;
  }
}

async function getTeamPushPreferences(
  teamId: string,
  userId: string
): Promise<TeamPushPreferences> {
  try {
    const adminDb = getAdminDb();
    const prefsDoc = await adminDb
      .collection('teams')
      .doc(teamId)
      .collection('pushNotificationPreferences')
      .doc(userId)
      .get();

    if (prefsDoc.exists) {
      return { ...DEFAULT_TEAM_PUSH_PREFS, ...(prefsDoc.data() as Partial<TeamPushPreferences>) };
    }
    return DEFAULT_TEAM_PUSH_PREFS;
  } catch (error) {
    console.error(`[Push] Error fetching team push prefs for user ${userId}:`, error);
    return DEFAULT_TEAM_PUSH_PREFS;
  }
}

async function shouldSendTaskPush(
  taskId: string,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  if (type === 'task_created') return true;

  // Check user-level push master toggle
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.pushNotificationsEnabled === false) {
      return false;
    }
  } catch {
    // If we can't check, default to sending
  }

  const prefKey = TASK_TYPE_TO_PREF[type];
  if (!prefKey) return true;

  const prefs = await getTaskPushPreferences(taskId, userId);
  return prefs[prefKey] ?? true;
}

async function shouldSendTeamPush(
  teamId: string,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  if (type === 'team_member_added_you') return true;

  // Check user-level push master toggle
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.pushNotificationsEnabled === false) {
      return false;
    }
  } catch {
    // If we can't check, default to sending
  }

  const prefKey = TEAM_TYPE_TO_PREF[type];
  if (!prefKey) return true;

  const prefs = await getTeamPushPreferences(teamId, userId);
  return prefs[prefKey] ?? true;
}

// --- Constants ---

const APP_NAME = 'Aurin Task Manager';

// --- Push Content Generators ---

/**
 * Truncate text for push body (mobile notifications cut off around 100 chars)
 */
function truncate(text: string, max = 90): string {
  return text.length > max ? text.slice(0, max - 1) + '...' : text;
}

/**
 * Format status labels for human readability
 */
function formatStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    in_review: 'En revision',
    completed: 'Finalizada',
    cancelled: 'Cancelada',
    blocked: 'Bloqueada',
  };
  return map[status] || status;
}

function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
    critical: 'Critica',
  };
  return map[priority] || priority;
}

function generateTaskPushPayload(
  type: NotificationType,
  ctx: {
    actorName: string;
    taskName: string;
    taskUrl: string;
    oldValue?: string;
    newValue?: string;
    messageSummary?: string;
    timeEntry?: string;
    comment?: string;
  }
): PushPayload {
  const base = {
    icon: '/favicon/android-chrome-192x192.png',
    badge: '/favicon/favicon-32x32.png',
    url: ctx.taskUrl,
    type,
    tag: `aurin-${type}`,
  };

  const task = truncate(ctx.taskName, 40);

  switch (type) {
    case 'task_created':
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} te asigno una nueva tarea: ${task}`,
      };

    case 'task_status_changed': {
      const from = ctx.oldValue ? formatStatus(ctx.oldValue) : null;
      const to = formatStatus(ctx.newValue || '');
      const change = from ? `${from} → ${to}` : to;
      return {
        ...base,
        title: `${task}`,
        body: `${ctx.actorName} cambio el estado a ${change}`,
      };
    }

    case 'task_priority_changed': {
      const from = ctx.oldValue ? formatPriority(ctx.oldValue) : null;
      const to = formatPriority(ctx.newValue || '');
      const change = from ? `${from} → ${to}` : to;
      return {
        ...base,
        title: `${task}`,
        body: `Prioridad actualizada: ${change}`,
      };
    }

    case 'task_dates_changed':
      return {
        ...base,
        title: `${task}`,
        body: `${ctx.actorName} modifico las fechas de esta tarea`,
      };

    case 'task_assignment_changed':
      return {
        ...base,
        title: `${task}`,
        body: `${ctx.actorName} actualizo los miembros del equipo`,
      };

    case 'task_updated':
      return {
        ...base,
        title: `${task}`,
        body: `${ctx.actorName} realizo cambios en esta tarea`,
      };

    case 'task_archived':
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} archivo la tarea "${task}"`,
      };

    case 'task_unarchived':
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} reactivo la tarea "${task}"`,
      };

    case 'task_deleted':
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} elimino la tarea "${task}"`,
      };

    case 'task_new_message': {
      const preview = ctx.messageSummary
        ? truncate(ctx.messageSummary, 70)
        : null;
      return {
        ...base,
        title: `${ctx.actorName} en ${task}`,
        body: preview || 'Te envio un nuevo mensaje',
        tag: `aurin-msg-${ctx.taskUrl}`, // Group messages per task
      };
    }

    case 'task_time_logged':
      return {
        ...base,
        title: `${task}`,
        body: `${ctx.actorName} registro ${ctx.timeEntry || 'tiempo'} en esta tarea`,
      };

    default:
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} actualizo "${task}"`,
      };
  }
}

function generateTeamPushPayload(
  type: NotificationType,
  ctx: {
    actorName: string;
    teamName: string;
    teamUrl: string;
    newMemberName?: string;
    messageSummary?: string;
  }
): PushPayload {
  const base = {
    icon: '/favicon/android-chrome-192x192.png',
    badge: '/favicon/favicon-32x32.png',
    url: ctx.teamUrl,
    type,
    tag: `aurin-${type}`,
  };

  const team = truncate(ctx.teamName, 40);

  switch (type) {
    case 'team_member_added_you':
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `${ctx.actorName} te agrego al equipo "${team}"`,
      };

    case 'team_member_added':
      return {
        ...base,
        title: `${team}`,
        body: `${ctx.newMemberName || 'Un nuevo miembro'} se unio al equipo`,
      };

    case 'team_new_message': {
      const preview = ctx.messageSummary
        ? truncate(ctx.messageSummary, 70)
        : null;
      return {
        ...base,
        title: `${ctx.actorName} en ${team}`,
        body: preview || 'Nuevo mensaje en el equipo',
        tag: `aurin-msg-${ctx.teamUrl}`, // Group messages per team
      };
    }

    default:
      return {
        ...base,
        title: `${APP_NAME}`,
        body: `Actividad en "${team}"`,
      };
  }
}

// --- Notification Service Class ---

export class PushNotificationService {
  /**
   * Send push notifications for task events.
   * Mirrors NotificationService.sendTaskNotification() from mailer.
   */
  public static async sendTaskNotification(
    data: TaskNotificationData
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    if (!isPushConfigured()) {
      return { success: false, sent: 0, failed: 0 };
    }

    if (!data.recipientIds || data.recipientIds.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // Chat notifications exclude the actor
    const chatTypes: NotificationType[] = ['task_new_message', 'task_time_logged'];
    const excludeActor = chatTypes.includes(data.type);

    const uniqueRecipients = [...new Set(data.recipientIds)].filter(
      (id) => !excludeActor || id !== data.actorId
    );

    if (uniqueRecipients.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      const [actorInfo, taskInfo] = await Promise.all([
        getUserInfo(data.actorId),
        getTaskInfo(data.taskId),
      ]);

      if (!taskInfo) {
        console.error('[Push] Task not found:', data.taskId);
        return { success: false, sent: 0, failed: 0 };
      }

      const actorName = getUserDisplayName(actorInfo);
      const taskUrl = getTaskUrl(data.taskId);

      const payload = generateTaskPushPayload(data.type, {
        actorName,
        taskName: taskInfo.name || 'Tarea',
        taskUrl,
        oldValue: data.oldValue,
        newValue: data.newValue,
        messageSummary: data.messageSummary,
        timeEntry: data.timeEntry,
        comment: data.comment,
      });

      // Send to each recipient (checks preferences per-user)
      const results = await Promise.allSettled(
        uniqueRecipients.map(async (recipientId) => {
          const shouldSend = await shouldSendTaskPush(data.taskId, recipientId, data.type);
          if (!shouldSend) {
            return { sent: 0, failed: 0 };
          }
          return sendPushToUser(recipientId, payload);
        })
      );

      let totalSent = 0;
      let totalFailed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') {
          totalSent += r.value.sent;
          totalFailed += r.value.failed;
        } else {
          totalFailed++;
        }
      }

      return { success: totalSent > 0, sent: totalSent, failed: totalFailed };
    } catch (error) {
      console.error('[Push] Error sending task notifications:', error);
      return { success: false, sent: 0, failed: data.recipientIds.length };
    }
  }

  /**
   * Send push notifications for team events.
   * Mirrors NotificationService.sendTeamNotification() from mailer.
   */
  public static async sendTeamNotification(
    data: TeamNotificationData
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    if (!isPushConfigured()) {
      return { success: false, sent: 0, failed: 0 };
    }

    if (!data.recipientIds || data.recipientIds.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    const excludeActor = data.type === 'team_new_message';

    const uniqueRecipients = [...new Set(data.recipientIds)].filter(
      (id) => !excludeActor || id !== data.actorId
    );

    if (uniqueRecipients.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      const [actorInfo, teamInfo] = await Promise.all([
        getUserInfo(data.actorId),
        getTeamInfo(data.teamId),
      ]);

      if (!teamInfo) {
        console.error('[Push] Team not found:', data.teamId);
        return { success: false, sent: 0, failed: 0 };
      }

      const actorName = getUserDisplayName(actorInfo);
      const teamUrl = getTeamUrl(data.teamId);

      const payload = generateTeamPushPayload(data.type, {
        actorName,
        teamName: teamInfo.name || 'Equipo',
        teamUrl,
        newMemberName: data.newMemberName,
        messageSummary: data.messageSummary,
      });

      const results = await Promise.allSettled(
        uniqueRecipients.map(async (recipientId) => {
          const shouldSend = await shouldSendTeamPush(data.teamId, recipientId, data.type);
          if (!shouldSend) {
            return { sent: 0, failed: 0 };
          }
          return sendPushToUser(recipientId, payload);
        })
      );

      let totalSent = 0;
      let totalFailed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') {
          totalSent += r.value.sent;
          totalFailed += r.value.failed;
        } else {
          totalFailed++;
        }
      }

      return { success: totalSent > 0, sent: totalSent, failed: totalFailed };
    } catch (error) {
      console.error('[Push] Error sending team notifications:', error);
      return { success: false, sent: 0, failed: data.recipientIds.length };
    }
  }
}
