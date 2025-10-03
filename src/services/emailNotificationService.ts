// Email notification service - NodeMailer integration only
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { config } from '@/lib/config';
import { emailService } from '@/lib/emailService';
import { emailTemplateService, EmailTemplateData } from './emailTemplates';

interface NotificationParams {
  userId: string;
  message: string;
  type: 'task_created' | 'task_status_changed' | 'task_priority_changed' | 'task_dates_changed' | 'task_assignment_changed' | 'group_message' | 'private_message' | 'time_log' | 'task_deleted' | 'task_archived' | 'task_unarchived';
  taskId?: string;
  conversationId?: string;
}

// Helper function to get user basic info
async function getUserBasicInfo(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.warn('[EmailNotificationService] Error getting user info:', error);
    return null;
  }
}

class EmailNotificationService {
  private static instance: EmailNotificationService;

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  /**
   * Send email notification using the proper email services
   */
  private async sendEmailNotification(templateData: EmailTemplateData, recipientEmail: string, notificationType: string): Promise<void> {
    try {
      // Generate email template using the proper template service
      const emailTemplate = emailTemplateService.generateTemplate(notificationType, templateData);
      
      // Send email using the email service
      await emailService.sendNotificationEmail(recipientEmail, emailTemplate.subject, emailTemplate.html);
      
      console.log('[EmailNotificationService] Email sent successfully to:', recipientEmail);
    } catch (error) {
      console.error('[EmailNotificationService] Error sending email:', error);
      throw error;
    }
  }

  /**
   * Create email notification for multiple recipients
   */
  async createEmailNotificationsForRecipients(
    params: Omit<NotificationParams, 'recipientId'>,
    recipientIds: string[]
  ): Promise<void> {
    if (!recipientIds || recipientIds.length === 0) {
      console.log('[EmailNotificationService] No recipients provided');
      return;
    }

    console.log('[EmailNotificationService] Sending emails to:', recipientIds.length, 'recipients');

    const emailPromises = recipientIds.map(async (recipientId) => {
      try {
        const templateData = await this.prepareEmailTemplateData(params, recipientId);
        
        // Get recipient email from user data
        const recipientInfo = await getUserBasicInfo(recipientId);
        const recipientEmail = recipientInfo?.email || recipientInfo?.emailAddress;
        
        if (!recipientEmail) {
          console.warn(`[EmailNotificationService] No email found for user ${recipientId}`);
          return;
        }
        
        await this.sendEmailNotification(templateData, recipientEmail, params.type);
      } catch (error) {
        console.error(`[EmailNotificationService] Error sending email to ${recipientId}:`, error);
        // Don't throw - continue with other recipients
      }
    });

    await Promise.allSettled(emailPromises);
  }

  /**
   * Prepare email template data
   */
  private async prepareEmailTemplateData(
    params: Omit<NotificationParams, 'recipientId'>,
    recipientId: string
  ): Promise<EmailTemplateData> {
    try {
      // Get task data if exists
      let taskData: any = {};
      if (params.taskId) {
        const taskDoc = await getDoc(doc(db, 'tasks', params.taskId));
        if (taskDoc.exists()) {
          taskData = taskDoc.data();
        }
      }

      // Get creator info
      let creatorName = 'Usuario';
      if (params.userId) {
        try {
          const creatorInfo = await getUserBasicInfo(params.userId);
          if (creatorInfo) {
            creatorName = creatorInfo.fullName || creatorInfo.firstName || 'Usuario';
          }
        } catch (error) {
          console.warn('[EmailNotificationService] Error getting creator name:', error);
        }
      }

      // Get recipient info
      let recipientName = 'Usuario';
      try {
        const recipientInfo = await getUserBasicInfo(recipientId);
        if (recipientInfo) {
          recipientName = recipientInfo.fullName || recipientInfo.firstName || 'Usuario';
        }
      } catch (error) {
        console.warn('[EmailNotificationService] Error getting recipient name:', error);
      }

      // Prepare URLs
      const taskUrl = params.taskId ? `${config.app.url}/dashboard/tasks/${params.taskId}` : `${config.app.url}/dashboard/tasks`;
      const configPageUrl = `${config.app.url}/dashboard/config`;
      
      // Base template data
      const templateData: EmailTemplateData = {
        recipientName,
        taskName: taskData.name || 'Tarea',
        taskUrl,
        configPageUrl,
      };

      // Add type-specific data
      switch (params.type) {
        case 'task_created':
        case 'task_status_changed':
        case 'task_priority_changed':
        case 'task_dates_changed':
        case 'task_assignment_changed':
          templateData.creatorName = creatorName;
          templateData.taskDescription = taskData.description || '';
          templateData.taskObjectives = taskData.objectives || '';
          templateData.startDate = taskData.startDate ? new Date(taskData.startDate.toDate()).toLocaleDateString('es-ES') : '';
          templateData.endDate = taskData.endDate ? new Date(taskData.endDate.toDate()).toLocaleDateString('es-ES') : '';
          templateData.taskStatus = taskData.status || '';
          templateData.taskPriority = taskData.priority || '';
          
          // Prepare team lists
          if (taskData.LeadedBy && Array.isArray(taskData.LeadedBy)) {
            try {
              const leaderNames = await Promise.all(
                taskData.LeadedBy.map(async (userId: string) => {
                  const info = await getUserBasicInfo(userId);
                  return info?.fullName || info?.firstName || 'Usuario';
                })
              );
              templateData.leadersList = leaderNames.join(', ');
            } catch (error) {
              templateData.leadersList = 'No disponible';
            }
          }
          
          if (taskData.AssignedTo && Array.isArray(taskData.AssignedTo)) {
            try {
              const assignedNames = await Promise.all(
                taskData.AssignedTo.map(async (userId: string) => {
                  const info = await getUserBasicInfo(userId);
                  return info?.fullName || info?.firstName || 'Usuario';
                })
              );
              templateData.assignedList = assignedNames.join(', ');
            } catch (error) {
              templateData.assignedList = 'No disponible';
            }
          }
          break;

        case 'group_message':
        case 'private_message':
          templateData.senderName = creatorName;
          templateData.messageText = params.message || '';
          break;

        case 'time_log':
          templateData.loggerName = creatorName;
          templateData.hoursLogged = taskData.hours || 0;
          templateData.logDate = new Date().toLocaleDateString('es-ES');
          templateData.comment = taskData.comment || '';
          break;
      }

      return templateData;
    } catch (error) {
      console.error('[EmailNotificationService] Error preparing email template data:', error);
      
      // Return minimal data on error
      return {
        recipientName: 'Usuario',
        taskName: 'Tarea',
        taskUrl: `${config.app.url}/dashboard/tasks`,
        configPageUrl: `${config.app.url}/dashboard/config`,
      };
    }
  }
}

// Export singleton instance
export const emailNotificationService = EmailNotificationService.getInstance();
