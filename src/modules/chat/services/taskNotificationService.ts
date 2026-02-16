/**
 * Task Notification Service
 *
 * Client-side service for sending task chat notifications via the API.
 * Mirrors the pattern of teamNotificationService.ts
 */

type TaskChatNotificationType = 'task_new_message' | 'task_time_logged';

interface TaskNotificationParams {
  type: TaskChatNotificationType;
  taskId: string;
  recipientIds: string[];
  messageSummary?: string;
  timeEntry?: string;
  comment?: string;
}

interface NotificationResult {
  sent: number;
  failed: number;
}

class TaskNotificationService {
  private async sendNotification(params: TaskNotificationParams): Promise<NotificationResult> {
    try {
      const response = await fetch('/api/tasks/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        return { sent: 0, failed: params.recipientIds.length };
      }

      const data = await response.json();
      return {
        sent: data.data?.sent || 0,
        failed: data.data?.failed || 0,
      };
    } catch (error) {
      return { sent: 0, failed: params.recipientIds.length };
    }
  }

  /**
   * Notify task members of a new message (configurable)
   */
  async notifyTaskOfNewMessage(
    taskId: string,
    memberIds: string[],
    senderId: string,
    messageSummary?: string
  ): Promise<NotificationResult> {
    const recipientIds = memberIds.filter((id) => id !== senderId);

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendNotification({
      type: 'task_new_message',
      taskId,
      recipientIds,
      messageSummary,
    });
  }

  /**
   * Notify task members of a time log entry (configurable)
   */
  async notifyTaskOfTimeLog(
    taskId: string,
    memberIds: string[],
    loggerId: string,
    timeEntry?: string,
    comment?: string
  ): Promise<NotificationResult> {
    const recipientIds = memberIds.filter((id) => id !== loggerId);

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0 };
    }

    return this.sendNotification({
      type: 'task_time_logged',
      taskId,
      recipientIds,
      timeEntry,
      comment,
    });
  }
}

export const taskNotificationService = new TaskNotificationService();
export default taskNotificationService;
