import { useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTaskNotificationsSingleton } from '@/hooks/useTaskNotificationsSingleton';
import { useTaskNotificationsStore } from '@/stores/taskNotificationsStore';
import { Timestamp } from 'firebase/firestore';

interface Task {
  id: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: Timestamp | string };
  lastActivity?: Timestamp | string;
  createdAt: Timestamp | string;
  unreadCountByUser?: { [userId: string]: number };
}

export const useTaskNotifications = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const { taskNotifications, markTaskAsViewed } = useTaskNotificationsSingleton();
  const { unreadByTask, markTaskAsRead, setNotifications } = useTaskNotificationsStore();
  const markAsViewedRef = useRef<Set<string>>(new Set());

  // Subscribe to singleton and update store
  useEffect(() => {
    setNotifications(taskNotifications);
  }, [taskNotifications, setNotifications]);

  const getUnreadCount = useCallback((task: Task): number => {
    if (!userId) return 0;
    
    // Use denormalized counter if available (O(1) performance)
    if (task.unreadCountByUser && task.unreadCountByUser[userId] !== undefined) {
      return task.unreadCountByUser[userId];
    }
    
    // Fallback to store-based count
    return unreadByTask[task.id] || 0;
  }, [userId, unreadByTask]);

  const markAsViewed = useCallback(async (taskId: string) => {
    if (!userId) return;

    // Prevent multiple calls for same task
    const callKey = `${taskId}_${userId}`;
    if (markAsViewedRef.current.has(callKey)) {
      return;
    }
    
    markAsViewedRef.current.add(callKey);
    
    try {
      // OPTIMISTIC UPDATE: Mark task as read locally first
      markTaskAsRead(taskId);
      
      // Then update Firestore with transaction (atomic)
      await markTaskAsViewed(taskId);
      
      // Force store update after singleton update
      setTimeout(() => {
        const store = useTaskNotificationsStore.getState();
        store.markTaskAsRead(taskId);
      }, 100);
      
    } catch (error) {
      console.error('[useTaskNotifications] Error marking task as viewed:', error);
      // Rollback optimistic update on error
      // The singleton will handle rollback automatically
    } finally {
      // Remove from tracking after delay
      setTimeout(() => {
        markAsViewedRef.current.delete(callKey);
      }, 1000);
    }
  }, [userId, markTaskAsRead, markTaskAsViewed]);

  return {
    getUnreadCount,
    markAsViewed,
    userId,
  };
}; 