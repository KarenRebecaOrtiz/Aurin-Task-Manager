import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { get, set, del } from 'idb-keyval';

interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  type?: string;
  expiresAt?: Timestamp;
}

// Queue para acciones offline
interface OfflineAction {
  id: string;
  type: 'mark-read' | 'delete';
  notificationId: string;
  timestamp: number;
}

export const useNotifications = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener cache key
  const getCacheKey = (userId: string) => `notifications_${userId}`;
  const getQueueKey = (userId: string) => `notifications_queue_${userId}`;

  // Función para cargar desde cache
  const loadFromCache = useCallback(async (userId: string): Promise<Notification[]> => {
    try {
      const cached = await get(getCacheKey(userId));
      if (cached && Array.isArray(cached)) {
        console.log('[useNotifications] Loaded from cache:', cached.length, 'notifications');
        return cached;
      }
    } catch (error) {
      console.error('[useNotifications] Error loading from cache:', error);
    }
    return [];
  }, []);

  // Función para guardar en cache
  const saveToCache = useCallback(async (userId: string, notifications: Notification[]) => {
    try {
      await set(getCacheKey(userId), notifications);
      console.log('[useNotifications] Saved to cache:', notifications.length, 'notifications');
    } catch (error) {
      console.error('[useNotifications] Error saving to cache:', error);
    }
  }, []);

  // Función para procesar queue offline
  const processOfflineQueue = useCallback(async (userId: string) => {
    try {
      const queue: OfflineAction[] = await get(getQueueKey(userId)) || [];
      if (queue.length === 0) return;

      console.log('[useNotifications] Processing offline queue:', queue.length, 'actions');

      for (const action of queue) {
        try {
          if (action.type === 'mark-read') {
            await updateDoc(doc(db, 'notifications', action.notificationId), { read: true });
          } else if (action.type === 'delete') {
            await deleteDoc(doc(db, 'notifications', action.notificationId));
          }
        } catch (error) {
          console.error('[useNotifications] Error processing offline action:', action, error);
        }
      }

      // Limpiar queue después de procesar
      await del(getQueueKey(userId));
      console.log('[useNotifications] Offline queue processed and cleared');
    } catch (error) {
      console.error('[useNotifications] Error processing offline queue:', error);
    }
  }, []);

  // Función para agregar acción a queue offline
  const addToOfflineQueue = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    try {
      const queue: OfflineAction[] = await get(getQueueKey(userId)) || [];
      const newAction: OfflineAction = {
        ...action,
        id: `${action.type}_${action.notificationId}_${Date.now()}`,
        timestamp: Date.now()
      };
      queue.push(newAction);
      await set(getQueueKey(userId), queue);
      console.log('[useNotifications] Added to offline queue:', newAction);
    } catch (error) {
      console.error('[useNotifications] Error adding to offline queue:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      setError('Usuario no autenticado.');
      return;
    }

    console.log('[useNotifications] Setting up listener for user:', userId);
    setIsLoading(true);
    setError(null);

    // Cargar desde cache si está offline
    const loadCachedData = async () => {
      if (!navigator.onLine) {
        const cachedNotifications = await loadFromCache(userId);
        setNotifications(cachedNotifications);
        setIsLoading(false);
        setError('Modo offline - usando datos en cache');
        return;
      }
    };

    loadCachedData();

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
      const notificationsData: Notification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Notification));
      
      setNotifications(notificationsData);
      setIsLoading(false);
      setError(null);
      
      // Guardar en cache
      await saveToCache(userId, notificationsData);
      
      // Procesar queue offline si hay conexión
      if (navigator.onLine) {
        await processOfflineQueue(userId);
      }
      
      console.log('[useNotifications] Fetched notifications:', notificationsData.length);
    }, (error) => {
      console.error('[useNotifications] Error fetching notifications:', error);
      
      // Si hay error y no hay datos en cache, cargar desde cache
      if (notifications.length === 0) {
        loadFromCache(userId).then(cached => {
          setNotifications(cached);
          setIsLoading(false);
          setError('Error de conexión - usando datos en cache');
        });
      } else {
        setIsLoading(false);
        setError('Error al actualizar notificaciones');
      }
    });

    return () => {
      console.log('[useNotifications] Cleaning up listener');
      unsubscribe();
    };
  }, [userId, loadFromCache, saveToCache, processOfflineQueue, notifications.length]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      if (navigator.onLine) {
        await updateDoc(doc(db, 'notifications', notificationId), { read: true });
        console.log('[useNotifications] Notification marked as read:', notificationId);
      } else {
        // Si está offline, agregar a queue
        await addToOfflineQueue({ type: 'mark-read', notificationId });
        console.log('[useNotifications] Added mark-read to offline queue:', notificationId);
      }
    } catch (error) {
      console.error('[useNotifications] Error marking notification as read:', error);
      // Fallback a queue offline
      await addToOfflineQueue({ type: 'mark-read', notificationId });
    }
  }, [addToOfflineQueue]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      if (navigator.onLine) {
        await deleteDoc(doc(db, 'notifications', notificationId));
        console.log('[useNotifications] Notification deleted:', notificationId);
      } else {
        // Si está offline, agregar a queue
        await addToOfflineQueue({ type: 'delete', notificationId });
        console.log('[useNotifications] Added delete to offline queue:', notificationId);
      }
    } catch (error) {
      console.error('[useNotifications] Error deleting notification:', error);
      // Fallback a queue offline
      await addToOfflineQueue({ type: 'delete', notificationId });
    }
  }, [addToOfflineQueue]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { 
    notifications, 
    markNotificationAsRead, 
    deleteNotification, 
    unreadCount,
    isLoading,
    error,
  };
}; 