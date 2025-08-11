import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { notificationQueue } from './notificationQueue';

export type NotificationType = 
  | 'group_message'
  | 'task_deleted'
  | 'task_archived'
  | 'task_unarchived'
  | 'task_status_changed'
  | 'private_message'
  | 'time_log'
  | 'task_created';

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

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    // Inicialización privada (e.g., conectar a queue si se expande)
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
      return ids;
    } catch (error) {
      
      // Si falla, intentar con la cola
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
        return notifications.map(() => 'queued'); // IDs temporales para operaciones en cola
      } catch {
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

    return this.createBatchNotifications(notifications);
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