import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc, runTransaction, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Define types
export type TaskNotificationType = 'group_message' | 'time_log' | 'task_created' | 'task_status_changed' | 'task_deleted' | 'task_archived' | 'task_unarchived';

export interface TaskNotification {
  id: string;
  taskId: string;
  type: TaskNotificationType;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
  senderId: string;
}

const DEBUG = false; // Disabled for production

class TaskNotificationsManager {
  private static instance: TaskNotificationsManager | null = null;
  private listeners: Map<string, () => void> = new Map(); // userId -> unsubscribe
  private subscribers: Map<string, Set<(notifications: TaskNotification[]) => void>> = new Map(); // userId -> callbacks
  private currentNotifications: Map<string, TaskNotification[]> = new Map(); // userId -> notifs
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pausedListeners: Set<string> = new Set(); // userId -> paused state

  static getInstance(): TaskNotificationsManager {
    if (!this.instance) {
      this.instance = new TaskNotificationsManager();
    }
    return this.instance;
  }

  subscribe(userId: string, callback: (notifications: TaskNotification[]) => void): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    
    const userSubscribers = this.subscribers.get(userId)!;
    userSubscribers.add(callback);

    // Setup listener if not exists (persistent)
    if (!this.listeners.has(userId)) {
      this.setupListener(userId);
    }

    // Send current state
    callback(this.currentNotifications.get(userId) || []);

    return () => {
      userSubscribers.delete(callback);
      if (userSubscribers.size === 0) {
        this.subscribers.delete(userId);
        // NO cleanup listener here - keep alive
      }
    };
  }

  private setupListener(userId: string) {
    console.log('[TaskNotificationsManager] Setting up listener for user:', userId);

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('type', 'in', ['group_message', 'time_log', 'task_created', 'task_status_changed', 'task_deleted', 'task_archived', 'task_unarchived'])
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('[TaskNotificationsManager] Snapshot received for user:', userId, 'docs count:', snapshot.docs.length, 'fromCache:', snapshot.metadata.fromCache);
        
        // Skip if listener is paused
        if (this.pausedListeners.has(userId)) {
          console.log('[TaskNotificationsManager] Listener paused for user:', userId);
          return;
        }

        // Process all notifications, not just changes
        const notifications: TaskNotification[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<TaskNotification, 'id'>
        }));

        console.log('[TaskNotificationsManager] Processed notifications for user:', userId, 'count:', notifications.length);

        // Debounce
        const timeout = this.debounceTimeouts.get(userId);
        if (timeout) clearTimeout(timeout);

        const newTimeout = setTimeout(() => {
          this.currentNotifications.set(userId, notifications);
          
          const subscribers = this.subscribers.get(userId);
          if (subscribers) {
            console.log('[TaskNotificationsManager] Notifying subscribers for user:', userId, 'subscriber count:', subscribers.size);
            subscribers.forEach(cb => {
              try {
                cb(notifications);
              } catch (error) {
                console.error('[TaskNotificationsManager] Error in subscriber callback:', error);
              }
            });
          } else {
            console.log('[TaskNotificationsManager] No subscribers for user:', userId);
          }

        }, 1000); // ✅ OPTIMIZACIÓN: Aumentar debounce de 300ms a 1000ms para reducir re-renders

        this.debounceTimeouts.set(userId, newTimeout);
      },
      (error) => {
        console.error('[TaskNotificationsManager] Error in task notifications listener:', error);
      }
    );

    this.listeners.set(userId, unsubscribe);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // Optimistic update
      const currentNotifications = this.currentNotifications.get(userId) || [];
      const updatedNotifications = currentNotifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      
      this.currentNotifications.set(userId, updatedNotifications);
      
      // Notify subscribers immediately
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.forEach(callback => {
          try {
            callback(updatedNotifications);
          } catch (error) {
            console.error('[TaskNotificationsManager] Error in subscriber callback after optimistic update:', error);
          }
        });
      }



      // Firestore update
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      

    } catch (error) {
      console.error('[TaskNotificationsManager] Error marking notification as read:', error);
      // Rollback optimistic if fails
      if (DEBUG) console.log('[TaskNotificationsManager] Rolling back optimistic update due to error');
      this.setupListener(userId);
    }
  }

  async markTaskAsViewed(userId: string, taskId: string): Promise<void> {
    try {
      // PAUSE LISTENER to prevent new notifications during mark
      this.pausedListeners.add(userId);
      
      // OPTIMISTIC UPDATE: Remove task notifications locally first
      const currentNotifications = this.currentNotifications.get(userId) || [];
      const updatedNotifications = currentNotifications.filter(n => n.taskId !== taskId);
      
      this.currentNotifications.set(userId, updatedNotifications);
      
      // Notify subscribers immediately
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.forEach(callback => {
          try {
            callback(updatedNotifications);
          } catch (error) {
            console.error('[TaskNotificationsManager] Error in subscriber callback after optimistic update:', error);
          }
        });
      }

      // ✅ OPTIMIZACIÓN: Usar batch para updates atómicos y reducir re-renders
      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', taskId);
      
      try {
        // Batch update task document
        batch.update(taskRef, {
          [`lastViewedBy.${userId}`]: Timestamp.now(),
          hasUnreadUpdates: false,
          [`unreadCountByUser.${userId}`]: 0, // Reset unread count
        });
        
        // Batch delete all notifications for this task and user
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('taskId', '==', taskId),
          where('recipientId', '==', userId)
        );
        
        const snapshot = await getDocs(notificationsQuery);
        if (snapshot.docs.length > 0) {
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        }
        
        // ✅ Commit batch atómico
        await batch.commit();
        
      } catch (error) {
        console.error('[TaskNotificationsManager] Error updating task in Firestore:', error);
        // Don't throw, just log - optimistic update already applied
      }
      
      // RESUME LISTENER after a longer delay to allow Firestore to settle
      setTimeout(() => {
        this.pausedListeners.delete(userId);
      }, 3000); // Increased from 1000ms to 3000ms
      
    } catch (error) {
      console.error('[TaskNotificationsManager] Error marking task as viewed:', error);
      // Rollback optimistic if fails
      this.setupListener(userId);
      // Resume listener on error too
      this.pausedListeners.delete(userId);
    }
  }

  cleanupAllListeners() {
    this.listeners.forEach(unsub => unsub());
    this.listeners.clear();
    this.subscribers.clear();
    this.currentNotifications.clear();
    this.debounceTimeouts.forEach(t => clearTimeout(t));
    this.debounceTimeouts.clear();
    this.pausedListeners.clear();
  }

  hasListener(userId: string): boolean {
    return this.listeners.has(userId);
  }
}

// Hook
export const useTaskNotificationsSingleton = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([]);
  const managerRef = useRef<TaskNotificationsManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      console.log('[useTaskNotificationsSingleton] No userId provided');
      return;
    }

    console.log('[useTaskNotificationsSingleton] Setting up for user:', userId);
    managerRef.current = TaskNotificationsManager.getInstance();

    unsubscribeRef.current = managerRef.current.subscribe(userId, (notifications) => {
      console.log('[useTaskNotificationsSingleton] Received notifications for user:', userId, 'count:', notifications.length);
      setTaskNotifications(notifications);
    });

    return () => {
      console.log('[useTaskNotificationsSingleton] Cleaning up for user:', userId);
      unsubscribeRef.current?.();
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    await managerRef.current?.markAsRead(userId, notificationId);
  }, [userId]);

  const markTaskAsViewed = useCallback(async (taskId: string) => {
    if (!userId) return;
    await managerRef.current?.markTaskAsViewed(userId, taskId);
  }, [userId]);

  return { 
    taskNotifications, 
    markAsRead, 
    markTaskAsViewed 
  };
};

export { TaskNotificationsManager }; 