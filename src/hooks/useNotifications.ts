import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

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
}

export const useNotifications = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData: Notification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Notification));
      
      setNotifications(notificationsData);
      setIsLoading(false);
      setError(null);
      console.log('[useNotifications] Fetched notifications:', notificationsData.length);
    }, (error) => {
      console.error('[useNotifications] Error fetching notifications:', error);
      setNotifications([]);
      setIsLoading(false);
      
      // Manejar errores específicos de Firestore
      if (error.code === 'failed-precondition') {
        setError('Error de configuración de Firestore. Contacta al administrador.');
      } else if (error.code === 'unavailable') {
        setError('Servicio no disponible. Verifica tu conexión.');
      } else {
        setError('No se pudieron cargar las notificaciones. Intenta de nuevo.');
      }
    });

    return () => {
      console.log('[useNotifications] Cleaning up listener');
      unsubscribe();
    };
  }, [userId]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      console.log('[useNotifications] Notification marked as read:', notificationId);
    } catch (error) {
      console.error('[useNotifications] Error marking notification as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      console.log('[useNotifications] Notification deleted:', notificationId);
    } catch (error) {
      console.error('[useNotifications] Error deleting notification:', error);
    }
  }, []);

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