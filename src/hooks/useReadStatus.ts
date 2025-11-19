import { useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseReadStatusOptions {
  debounceDelay?: number;
  enableBatchOperations?: boolean;
  maxBatchSize?: number;
}

interface ReadStatusState {
  isMarkingAsRead: boolean;
  lastMarkedAt: number | null;
  error: string | null;
}

export const useReadStatus = (options: UseReadStatusOptions = {}) => {
  const { user } = useUser();
  const userId = user?.id || '';
  
  const {
    debounceDelay = 1000,
    enableBatchOperations = true,
    maxBatchSize = 490, // Límite de Firestore
  } = options;

  const [state, setState] = useState<ReadStatusState>({
    isMarkingAsRead: false,
    lastMarkedAt: null,
    error: null,
  });

  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  // Función para marcar notificaciones como leídas
  const markNotificationsAsRead = useCallback(async (notificationIds: string[]) => {
    if (!userId || notificationIds.length === 0) return;

    // Debounce para evitar múltiples llamadas
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    markAsReadTimeoutRef.current = setTimeout(async () => {
      setState(prev => ({ ...prev, isMarkingAsRead: true, error: null }));

      try {
        if (enableBatchOperations && notificationIds.length > 1) {
          // Usar batch para múltiples notificaciones
          const batch = writeBatch(db);
          let operationsCount = 0;

          notificationIds.forEach(notificationId => {
            if (operationsCount < maxBatchSize) {
              batch.update(doc(db, 'notifications', notificationId), { read: true });
              operationsCount++;
            }
          });

          if (operationsCount > 0) {
            await batch.commit();
            console.log('[useReadStatus] Marked', operationsCount, 'notifications as read via batch');
          }
        } else {
          // Marcar individualmente
          for (const notificationId of notificationIds) {
            await updateDoc(doc(db, 'notifications', notificationId), { read: true });
          }
          console.log('[useReadStatus] Marked', notificationIds.length, 'notifications as read individually');
        }

        setState(prev => ({
          ...prev,
          isMarkingAsRead: false,
          lastMarkedAt: Date.now(),
        }));
      } catch (error) {
        console.error('[useReadStatus] Error marking notifications as read:', error);
        setState(prev => ({
          ...prev,
          isMarkingAsRead: false,
          error: 'Error al marcar como leído',
        }));
      }
    }, debounceDelay);
  }, [userId, enableBatchOperations, maxBatchSize, debounceDelay]);

  // Función para marcar tarea como vista
  const markTaskAsViewed = useCallback(async (taskId: string) => {
    if (!userId || !taskId) return;

    // Evitar operaciones duplicadas
    const operationKey = `task_${taskId}`;
    if (pendingOperationsRef.current.has(operationKey)) return;
    pendingOperationsRef.current.add(operationKey);

    try {
      // Actualizar lastViewedBy en la tarea
      await updateDoc(doc(db, 'tasks', taskId), {
        [`lastViewedBy.${userId}`]: Timestamp.now(),
        hasUnreadUpdates: false,
      });

      // Marcar notificaciones relacionadas como leídas
      const taskNotificationsQuery = {
        taskId,
        recipientId: userId,
        types: ['group_message', 'task_status_changed', 'task_created'],
      };

      // Aquí podrías implementar la lógica para obtener y marcar notificaciones
      // Por ahora, solo actualizamos la tarea
      console.log('[useReadStatus] Marked task as viewed:', taskId);
    } catch (error) {
      console.error('[useReadStatus] Error marking task as viewed:', error);
      setState(prev => ({
        ...prev,
        error: 'Error al marcar tarea como vista',
      }));
    } finally {
      pendingOperationsRef.current.delete(operationKey);
    }
  }, [userId]);

  // Función para marcar conversación como vista
  const markConversationAsViewed = useCallback(async (conversationId: string) => {
    if (!userId || !conversationId) return;

    // Evitar operaciones duplicadas
    const operationKey = `conversation_${conversationId}`;
    if (pendingOperationsRef.current.has(operationKey)) return;
    pendingOperationsRef.current.add(operationKey);

    try {
      // Actualizar lastViewedBy en la conversación
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`lastViewedBy.${userId}`]: Timestamp.now(),
      });

      // Marcar notificaciones relacionadas como leídas
      const conversationNotificationsQuery = {
        conversationId,
        recipientId: userId,
        types: ['private_message'],
      };

      // Aquí podrías implementar la lógica para obtener y marcar notificaciones
      console.log('[useReadStatus] Marked conversation as viewed:', conversationId);
    } catch (error) {
      console.error('[useReadStatus] Error marking conversation as viewed:', error);
      setState(prev => ({
        ...prev,
        error: 'Error al marcar conversación como vista',
      }));
    } finally {
      pendingOperationsRef.current.delete(operationKey);
    }
  }, [userId]);

  // Función para marcar todo como leído (notificaciones, tareas, conversaciones)
  const markAllAsRead = useCallback(async (params: {
    notificationIds?: string[];
    taskIds?: string[];
    conversationIds?: string[];
  }) => {
    const { notificationIds = [], taskIds = [], conversationIds = [] } = params;

    setState(prev => ({ ...prev, isMarkingAsRead: true, error: null }));

    try {
      const batch = writeBatch(db);
      let operationsCount = 0;

      // Marcar notificaciones
      notificationIds.forEach(notificationId => {
        if (operationsCount < maxBatchSize) {
          batch.update(doc(db, 'notifications', notificationId), { read: true });
          operationsCount++;
        }
      });

      // Marcar tareas como vistas
      taskIds.forEach(taskId => {
        if (operationsCount < maxBatchSize) {
          batch.update(doc(db, 'tasks', taskId), {
            [`lastViewedBy.${userId}`]: Timestamp.now(),
            hasUnreadUpdates: false,
          });
          operationsCount++;
        }
      });

      // Marcar conversaciones como vistas
      conversationIds.forEach(conversationId => {
        if (operationsCount < maxBatchSize) {
          batch.update(doc(db, 'conversations', conversationId), {
            [`lastViewedBy.${userId}`]: Timestamp.now(),
          });
          operationsCount++;
        }
      });

      if (operationsCount > 0) {
        await batch.commit();
        console.log('[useReadStatus] Marked all as read via batch:', {
          notifications: notificationIds.length,
          tasks: taskIds.length,
          conversations: conversationIds.length,
        });
      }

      setState(prev => ({
        ...prev,
        isMarkingAsRead: false,
        lastMarkedAt: Date.now(),
      }));
    } catch (error) {
      console.error('[useReadStatus] Error marking all as read:', error);
      setState(prev => ({
        ...prev,
        isMarkingAsRead: false,
        error: 'Error al marcar todo como leído',
      }));
    }
  }, [userId, maxBatchSize]);

  // Función para limpiar timeouts al desmontar
  const cleanup = useCallback(() => {
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    pendingOperationsRef.current.clear();
  }, []);

  return {
    markNotificationsAsRead,
    markTaskAsViewed,
    markConversationAsViewed,
    markAllAsRead,
    cleanup,
    ...state,
  };
}; 