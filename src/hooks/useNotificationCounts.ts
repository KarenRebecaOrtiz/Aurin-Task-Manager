import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NotificationCounts {
  total: number;
  byType: {
    group_message: number;
    private_message: number;
    task_status_changed: number;
    task_created: number;
    task_deleted: number;
    task_archived: number;
    task_unarchived: number;
    time_log: number;
  };
  byTask: { [taskId: string]: number };
  byConversation: { [conversationId: string]: number };
}

export const useNotificationCounts = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    byType: {
      group_message: 0,
      private_message: 0,
      task_status_changed: 0,
      task_created: 0,
      task_deleted: 0,
      task_archived: 0,
      task_unarchived: 0,
      time_log: 0,
    },
    byTask: {},
    byConversation: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener conteo por tipo
  const getCountByType = useCallback((type: keyof NotificationCounts['byType']) => {
    return counts.byType[type] || 0;
  }, [counts.byType]);

  // Función para obtener conteo por tarea
  const getCountByTask = useCallback((taskId: string) => {
    return counts.byTask[taskId] || 0;
  }, [counts.byTask]);

  // Función para obtener conteo por conversación
  const getCountByConversation = useCallback((conversationId: string) => {
    return counts.byConversation[conversationId] || 0;
  }, [counts.byConversation]);

  // Función para verificar si hay notificaciones urgentes
  const hasUrgentNotifications = useMemo(() => {
    return counts.byType.task_deleted > 0 || 
           counts.byType.task_archived > 0 || 
           counts.byType.task_status_changed > 0;
  }, [counts.byType]);

  // Función para verificar si hay notificaciones de mensajes
  const hasMessageNotifications = useMemo(() => {
    return counts.byType.group_message > 0 || 
           counts.byType.private_message > 0;
  }, [counts.byType]);

  useEffect(() => {
    if (!userId) {
      setCounts({
        total: 0,
        byType: {
          group_message: 0,
          private_message: 0,
          task_status_changed: 0,
          task_created: 0,
          task_deleted: 0,
          task_archived: 0,
          task_unarchived: 0,
          time_log: 0,
        },
        byTask: {},
        byConversation: {},
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const newCounts: NotificationCounts = {
        total: 0,
        byType: {
          group_message: 0,
          private_message: 0,
          task_status_changed: 0,
          task_created: 0,
          task_deleted: 0,
          task_archived: 0,
          task_unarchived: 0,
          time_log: 0,
        },
        byTask: {},
        byConversation: {},
      };

      snapshot.docs.forEach((doc) => {
        const notification = doc.data();
        const type = notification.type as keyof NotificationCounts['byType'];
        
        if (type && newCounts.byType.hasOwnProperty(type)) {
          newCounts.byType[type]++;
          newCounts.total++;
        }

        // Conteo por tarea
        if (notification.taskId) {
          newCounts.byTask[notification.taskId] = 
            (newCounts.byTask[notification.taskId] || 0) + 1;
        }

        // Conteo por conversación
        if (notification.conversationId) {
          newCounts.byConversation[notification.conversationId] = 
            (newCounts.byConversation[notification.conversationId] || 0) + 1;
        }
      });

      setCounts(newCounts);
      setIsLoading(false);
    }, (error) => {
      console.error('[useNotificationCounts] Error fetching counts:', error);
      setError('Error al cargar conteos de notificaciones');
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return {
    counts,
    getCountByType,
    getCountByTask,
    getCountByConversation,
    hasUrgentNotifications,
    hasMessageNotifications,
    isLoading,
    error,
  };
}; 