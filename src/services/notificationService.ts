import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, writeBatch, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { notificationQueue } from './notificationQueue';
import { emailService } from '@/lib/emailService';
import { getUserEmails, getUserBasicInfo } from '@/lib/userUtils';
import { config } from '@/lib/config';
import { emailTemplateService, EmailTemplateData } from './emailTemplates';

export type NotificationType = 
  | 'group_message'
  | 'task_deleted'
  | 'task_archived'
  | 'task_unarchived'
  | 'task_status_changed'
  | 'task_priority_changed'
  | 'task_dates_changed'
  | 'task_assignment_changed'
  | 'private_message'
  | 'time_log'
  | 'task_created';

// Mapeo de tipos de notificación a categorías para preferencias de email
const categoryMap: Record<NotificationType, 'messages' | 'creation' | 'edition' | 'timers' | null> = {
  'group_message': 'messages',
  'private_message': 'messages',
  'task_created': 'creation',
  'task_status_changed': 'edition',
  'task_priority_changed': 'edition',
  'task_dates_changed': 'edition',
  'task_assignment_changed': 'edition',
  'time_log': 'timers',
  'task_deleted': 'edition',
  'task_archived': 'edition',
  'task_unarchived': 'edition',
};

interface NotificationParams {
  userId: string;  // Quién genera la acción
  recipientId: string;  // Quién recibe
  message: string;
  type: NotificationType;
  taskId?: string;
  conversationId?: string;
  expiresInDays?: number;  // Default 7
}

export interface Notification {
  id: string;
  userId: string;
  recipientId: string;
  message: string;
  type: NotificationType;
  taskId?: string;
  conversationId?: string;
  timestamp: Timestamp;
  read: boolean;
  expiresAt: Timestamp;
}

export class NotificationService {
  private static instance: NotificationService | null = null;
  private emailLimitPerUser = 50; // Límite diario de emails por usuario
  private emailLimitDuration = 24 * 60 * 60 * 1000; // 24 horas en ms

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    // Inicialización privada (e.g., conectar a queue si se expande)
  }

  /**
   * Verifica si un usuario puede recibir más emails (límite diario)
   * @param recipientId - ID del usuario destinatario
   * @returns true si puede recibir emails, false si alcanzó el límite
   */
  private async checkEmailLimit(recipientId: string): Promise<boolean> {
    try {
      const limitDocRef = doc(db, 'emailLimits', recipientId);
      const limitDoc = await getDoc(limitDocRef);

      const now = Date.now();
      if (limitDoc.exists()) {
        const { count, lastReset } = limitDoc.data();
        const lastResetTime = lastReset instanceof Timestamp ? lastReset.toMillis() : now;

        // Resetear contador si ha pasado el período
        if (now - lastResetTime > this.emailLimitDuration) {
          await setDoc(limitDocRef, { count: 0, lastReset: Timestamp.now() });
          console.log(`[NotificationService] Reset email limit for user ${recipientId}`);
          return true;
        }

        // Verificar límite
        if (count >= this.emailLimitPerUser) {
          console.warn(`[NotificationService] Email limit reached for user ${recipientId} (${count}/${this.emailLimitPerUser})`);
          return false;
        }

        // Incrementar contador
        await updateDoc(limitDocRef, { count: count + 1 });
        console.log(`[NotificationService] Email count for user ${recipientId}: ${count + 1}/${this.emailLimitPerUser}`);
        return true;
      } else {
        // Crear nuevo documento
        await setDoc(limitDocRef, { count: 1, lastReset: Timestamp.now() });
        console.log(`[NotificationService] Created email limit tracking for user ${recipientId}`);
        return true;
      }
    } catch (error) {
      console.error(`[NotificationService] Error checking email limit for user ${recipientId}:`, error);
      // En caso de error, permitir el envío para no bloquear el sistema
      return true;
    }
  }

  async createNotification(params: NotificationParams): Promise<string> {
    const { expiresInDays = 7 } = params;
    const notification = {
      ...params,
      timestamp: Timestamp.now(),
      read: false,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)),
    };

    try {
      const docRef = await addDoc(collection(db, 'notifications'), notification);
      return docRef.id;
    } catch (error) {
      
      // Si falla, intentar con la cola
      try {
        await notificationQueue.addCreateNotification(notification);
        return 'queued'; // ID temporal para operaciones en cola
      } catch {
        throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async createBatchNotifications(notifications: NotificationParams[]): Promise<string[]> {
    if (notifications.length === 0) return [];

    const batch = writeBatch(db);
    const ids: string[] = [];

    notifications.forEach(params => {
      const docRef = doc(collection(db, 'notifications'));
      const { expiresInDays = 7 } = params;
      batch.set(docRef, {
        ...params,
        timestamp: Timestamp.now(),
        read: false,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)),
      });
      ids.push(docRef.id);
    });

    try {
      await batch.commit();
      console.log(`[NotificationService] Successfully created ${notifications.length} notifications in batch`);
      return ids;
    } catch (error) {
      console.error('[NotificationService] Batch failed, adding to queue:', error);
      
      // Fallback to queue if batch fails
      try {
        const notificationData = notifications.map(params => {
          const { expiresInDays = 7 } = params;
          return {
            ...params,
            timestamp: Timestamp.now(),
            read: false,
            expiresAt: Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)),
          };
        });
        
        await notificationQueue.addCreateBatchNotifications(notificationData);
        console.log('[NotificationService] Notifications added to queue as fallback');
        return notifications.map(() => 'queued'); // IDs temporales para operaciones en cola
      } catch (queueError) {
        console.error('[NotificationService] Both batch and queue failed:', queueError);
        throw new Error(`Failed to create batch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async createNotificationsForRecipients(
    params: Omit<NotificationParams, 'recipientId'>,
    recipientIds: string[]
  ): Promise<string[]> {
    if (recipientIds.length === 0) return [];

    const notifications: NotificationParams[] = recipientIds.map(recipientId => ({
      ...params,
      recipientId,
    }));

    try {
      const ids = await this.createBatchNotifications(notifications);
      console.log('[NotificationService] Notifications created successfully for recipients:', recipientIds);

      // Enviar emails a los destinatarios (excluyendo al trigger creator)
      await this.sendEmailNotificationsToRecipients(params, recipientIds);

      return ids;
    } catch (error) {
      console.error('[NotificationService] Error creating batch:', error);
      // Fallback to queue if batch fails
      await notificationQueue.addCreateBatchNotifications(notifications.map(n => ({ ...n, timestamp: Timestamp.now() })));
      return recipientIds.map(() => 'queued');
    }
  }

  /**
   * Envía notificaciones por email a los destinatarios
   * @param params - Parámetros de la notificación
   * @param recipientIds - IDs de los destinatarios
   */
  private async sendEmailNotificationsToRecipients(
    params: Omit<NotificationParams, 'recipientId'>,
    recipientIds: string[]
  ): Promise<void> {
    try {
      // Obtener emails de los destinatarios desde la API
      const userEmails = await getUserEmails(recipientIds);

      // Filtrar usuarios con email válido, verificar límite y preferencias
      const validEmails = [];
      for (const user of userEmails) {
        if (user.email) {
          // Verificar límite de emails (temporalmente deshabilitado por permisos)
          try {
            if (!(await this.checkEmailLimit(user.userId))) {
              console.log(`[NotificationService] Email limit reached for user ${user.userId}`);
              continue;
            }
          } catch (limitError) {
            console.log(`[NotificationService] Email limit check disabled for user ${user.userId} (permissions not configured)`);
            // Continuar sin verificar límite por ahora
          }

          // Verificar preferencias de email del usuario
          try {
            const userDoc = await getDoc(doc(db, 'users', user.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const emailPrefs = userData.emailPreferences || {};
              const category = categoryMap[params.type];
              
              // Si no hay preferencias definidas, por defecto enviar (true)
              if (category && (emailPrefs[category] ?? true)) {
                validEmails.push(user);
                console.log(`[NotificationService] User ${user.userId} will receive ${params.type} email (${category}: ${emailPrefs[category] ?? true})`);
              } else if (category) {
                console.log(`[NotificationService] User ${user.userId} has disabled ${category} emails (${emailPrefs[category]})`);
              }
            } else {
              // Usuario no existe en Firestore, enviar por defecto
              validEmails.push(user);
              console.log(`[NotificationService] User ${user.userId} not found in Firestore, sending email by default`);
            }
          } catch (prefError) {
            console.error(`[NotificationService] Error checking preferences for user ${user.userId}:`, prefError);
            // En caso de error, enviar por defecto para no bloquear el sistema
            validEmails.push(user);
          }
        }
      }

      if (validEmails.length === 0) {
        console.log('[NotificationService] No valid emails found, all recipients reached email limit, or all disabled email preferences');
        return;
      }

            // Preparar emails para envío en batch usando plantillas
      const emailData = await Promise.all(validEmails.map(async user => {
        const templateData = await this.prepareEmailTemplateData(params, user.userId);
        const template = emailTemplateService.generateTemplate(params.type, templateData);
        
        return {
          email: user.email,
          subject: template.subject,
          body: template.html,
        };
      }));

      // Enviar emails en batch con reintentos
      let retries = 0;
      const maxRetries = config.notifications.maxRetries;
      while (retries < maxRetries) {
        try {
          await emailService.sendBatchNotificationEmails(emailData);
          console.log(`[NotificationService] Email notifications sent to ${validEmails.length} recipients (respecting preferences)`);
          return;
        } catch (error) {
          retries++;
          console.error(`[NotificationService] Email send attempt ${retries}/${maxRetries} failed:`, error);
          if (retries === maxRetries) {
            console.error('[NotificationService] Max retries reached for email notifications');
            return;
          }
          const delay = config.notifications.retryDelayMs * Math.pow(2, retries - 1);
          console.log(`[NotificationService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('[NotificationService] Error preparing email notifications:', error);
      // No fallar la operación principal por errores de email
    }
  }

  /**
   * Genera el asunto del email basado en el tipo de notificación
   */
  private getEmailSubject(type: NotificationType, taskId?: string): string {
    const baseSubject = 'Sodio Task App - Notificación';

    switch (type) {
      case 'task_created':
        return `${baseSubject}: Nueva tarea asignada`;
      case 'task_status_changed':
        return `${baseSubject}: Estado de tarea actualizado`;
      case 'task_priority_changed':
        return `${baseSubject}: Prioridad de tarea cambiada`;
      case 'task_dates_changed':
        return `${baseSubject}: Fechas de tarea actualizadas`;
      case 'task_assignment_changed':
        return `${baseSubject}: Asignación de tarea modificada`;
      case 'task_deleted':
        return `${baseSubject}: Tarea eliminada`;
      case 'task_archived':
        return `${baseSubject}: Tarea archivada`;
      case 'task_unarchived':
        return `${baseSubject}: Tarea desarchivada`;
      case 'group_message':
        return `${baseSubject}: Nuevo mensaje en tarea`;
      case 'private_message':
        return `${baseSubject}: Mensaje privado`;
      case 'time_log':
        return `${baseSubject}: Registro de tiempo`;
      default:
        return baseSubject;
    }
  }

  /**
   * Genera el cuerpo del email basado en el mensaje y tipo
   */
  private getEmailBody(message: string, type: NotificationType, taskId?: string): string {
    const taskLink = taskId ? `<a href="${config.app.url}/dashboard/task/${taskId}">Ver tarea</a>` : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Sodio Task App</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;">${message}</p>
        </div>
        ${taskLink ? `<p style="text-align: center; margin: 20px 0;">${taskLink}</p>` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="text-align: center; color: #999; font-size: 12px;">
          Este es un email automático del sistema Sodio Task App.
        </p>
      </div>
    `;
  }

  /**
   * Prepara los datos para la plantilla de email
   */
  private async prepareEmailTemplateData(
    params: Omit<NotificationParams, 'recipientId'>,
    recipientId: string
  ): Promise<EmailTemplateData> {
    try {
      // Obtener datos de la tarea si existe
      let taskData: any = {};
      if (params.taskId) {
        const taskDoc = await getDoc(doc(db, 'tasks', params.taskId));
        if (taskDoc.exists()) {
          taskData = taskDoc.data();
        }
      }

      // Obtener datos del usuario creador
      let creatorName = 'Usuario';
      if (params.userId) {
        try {
          const creatorInfo = await getUserBasicInfo(params.userId);
          if (creatorInfo) {
            creatorName = creatorInfo.fullName || creatorInfo.firstName || 'Usuario';
          }
        } catch (error) {
          console.warn('[NotificationService] Error getting creator name:', error);
        }
      }

      // Obtener datos del usuario destinatario
      let recipientName = 'Usuario';
      try {
        const recipientInfo = await getUserBasicInfo(recipientId);
        if (recipientInfo) {
          recipientName = recipientInfo.fullName || recipientInfo.firstName || 'Usuario';
        }
      } catch (error) {
        console.warn('[NotificationService] Error getting recipient name:', error);
      }

      // Preparar URLs
      const taskUrl = params.taskId ? `${config.app.url}/dashboard/tasks/${params.taskId}` : `${config.app.url}/dashboard/tasks`;
      const configPageUrl = `${config.app.url}/dashboard/config`;

      // Preparar datos base
      const templateData: EmailTemplateData = {
        recipientName,
        taskName: taskData.name || 'Tarea',
        taskUrl,
        configPageUrl,
      };

      // Agregar datos específicos según el tipo de notificación
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
          
          // Preparar listas de equipo
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
          
          // Si es un timelog, agregar información adicional
          if (taskData.hours) {
            templateData.timelogHours = taskData.hours;
          }
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
      console.error('[NotificationService] Error preparing email template data:', error);
      
      // Retornar datos mínimos en caso de error
      return {
        recipientName: 'Usuario',
        taskName: 'Tarea',
        taskUrl: `${config.app.url}/dashboard/tasks`,
        configPageUrl: `${config.app.url}/dashboard/config`,
      };
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      
      // Si falla, intentar con la cola
      try {
        await notificationQueue.addMarkAsRead(notificationId);
      } catch {
        throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      
      // Si falla, intentar con la cola
      try {
        await notificationQueue.addDelete(notificationId);
      } catch {
        throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}

// Exportar instancia singleton para uso directo
export const notificationService = NotificationService.getInstance(); 