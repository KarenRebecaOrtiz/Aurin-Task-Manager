import { useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { markTaskAsViewed } from '@/lib/taskUtils';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface Task {
  id: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: Timestamp | string };
  lastActivity?: Timestamp | string;
  createdAt: Timestamp | string;
}

export const useTaskNotifications = () => {
  const { user } = useUser();
  const userId = user?.id || '';

  const getUnreadCountForTask = useCallback((task: Task): number => {
    if (!userId) return 0;
    if (!task.hasUnreadUpdates) return 0;

    // Handle cases where lastViewedBy or lastActivity might be missing
    if (!task.lastActivity || !task.lastViewedBy || !task.lastViewedBy[userId]) {
      return 1; // Task has updates and user hasn't viewed it
    }

    const lastActivityTime = task.lastActivity instanceof Timestamp
      ? task.lastActivity.toMillis()
      : new Date(task.lastActivity).getTime();
    const lastViewedTime = task.lastViewedBy[userId] instanceof Timestamp
      ? task.lastViewedBy[userId].toMillis()
      : new Date(task.lastViewedBy[userId]).getTime();

    return lastActivityTime > lastViewedTime ? 1 : 0;
  }, [userId]);

  const markTaskAsViewedForUser = useCallback(async (taskId: string) => {
    if (!userId) return;
    try {
      await markTaskAsViewed(taskId, userId);
      
      // Opcional: Actualizar notificaciones relacionadas en Firestore
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('taskId', '==', taskId),
        where('recipientId', '==', userId),
        where('read', '==', false),
        where('type', 'in', ['group_message', 'task_deleted', 'task_archived', 'task_unarchived', 'task_status_changed'])
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const updatePromises = notificationsSnapshot.docs.map((notifDoc) =>
        updateDoc(doc(db, 'notifications', notifDoc.id), { read: true })
      );
      await Promise.all(updatePromises);
      console.log('[useTaskNotifications] Marked notifications as read for task:', taskId);
    } catch (error) {
      console.error('[useTaskNotifications] Error marking task as viewed:', error);
    }
  }, [userId]);

  return {
    getUnreadCount: getUnreadCountForTask,
    markAsViewed: markTaskAsViewedForUser,
    userId,
  };
}; 