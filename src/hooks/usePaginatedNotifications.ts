import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, orderBy, limit, startAfter, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { get, set } from 'idb-keyval';
import { notificationService, Notification } from '@/services/notificationService';

interface UsePaginatedNotificationsOptions {
  pageSize?: number;
  enableCache?: boolean;
  enableOfflineSupport?: boolean;
}

interface PaginationState {
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastDoc: DocumentData | null;
}

export const usePaginatedNotifications = (options: UsePaginatedNotificationsOptions = {}) => {
  const { user } = useUser();
  const userId = user?.id || '';
  
  const {
    pageSize = 20,
    enableCache = true,
    enableOfflineSupport = true,
  } = options;

  // Estados de paginación
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    isLoading: true,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    lastDoc: null,
  });

  // Refs para control de listeners y cache
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitialLoadRef = useRef(true);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheKey = `notifications_${userId}`;
  const queueKey = `notifications_queue_${userId}`;

  // Función para cargar desde cache
  const loadFromCache = useCallback(async (): Promise<Notification[]> => {
    if (!enableCache || !userId) return [];
    
    try {
      const cached = await get(cacheKey);
      if (cached && Array.isArray(cached)) {
        console.log('[usePaginatedNotifications] Loaded from cache:', cached.length, 'notifications');
        return cached;
      }
    } catch (error) {
      console.error('[usePaginatedNotifications] Error loading from cache:', error);
    }
    return [];
  }, [enableCache, userId, cacheKey]);

  // Función para guardar en cache con debounce
  const saveToCache = useCallback(async (notifications: Notification[]) => {
    if (!enableCache || !userId || notifications.length === 0) return;
    
    // Limpiar timeout anterior
    if (cacheTimeoutRef.current) {
      clearTimeout(cacheTimeoutRef.current);
    }
    
    // Debounce de 1 segundo para evitar múltiples guardados
    cacheTimeoutRef.current = setTimeout(async () => {
      try {
        await set(cacheKey, notifications);
        console.log('[usePaginatedNotifications] Saved to cache:', notifications.length, 'notifications');
      } catch (error) {
        console.error('[usePaginatedNotifications] Error saving to cache:', error);
      }
    }, 1000);
  }, [enableCache, userId, cacheKey]);

  // Función para procesar snapshot de Firestore
  const processSnapshot = useCallback((snapshot: QuerySnapshot, isInitialLoad = false) => {
    const newNotifications: Notification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));

    if (isInitialLoad) {
      setNotifications(newNotifications);
      setPaginationState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: newNotifications.length === pageSize,
        lastDoc: newNotifications.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        error: null,
      }));

      // Guardar en cache solo en carga inicial
      if (enableCache) {
        saveToCache(newNotifications);
      }
    } else {
      setNotifications(prev => {
        const combined = [...prev, ...newNotifications];
        // Eliminar duplicados basado en ID
        const unique = combined.filter((notification, index, self) => 
          index === self.findIndex(n => n.id === notification.id)
        );
        return unique;
      });
      
      setPaginationState(prev => ({
        ...prev,
        isLoadingMore: false,
        hasMore: newNotifications.length === pageSize,
        lastDoc: newNotifications.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : prev.lastDoc,
      }));
    }
  }, [pageSize, enableCache, saveToCache]);

  // Función para cargar más notificaciones
  const loadMore = useCallback(async () => {
    if (!userId || paginationState.isLoadingMore || !paginationState.hasMore) return;

    setPaginationState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      // Si no es la carga inicial, usar startAfter
      if (paginationState.lastDoc) {
        const moreQuery = query(
          collection(db, 'notifications'),
          where('recipientId', '==', userId),
          orderBy('timestamp', 'desc'),
          startAfter(paginationState.lastDoc),
          limit(pageSize)
        );

        const unsubscribe = onSnapshot(moreQuery, (snapshot) => {
          processSnapshot(snapshot, false);
        }, (error) => {
          console.error('[usePaginatedNotifications] Error loading more:', error);
          setPaginationState(prev => ({
            ...prev,
            isLoadingMore: false,
            error: 'Error al cargar más notificaciones',
          }));
        });

        // Guardar unsubscribe para cleanup
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        unsubscribeRef.current = unsubscribe;
      }
    } catch (error) {
      console.error('[usePaginatedNotifications] Error in loadMore:', error);
      setPaginationState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: 'Error al cargar más notificaciones',
      }));
    }
  }, [userId, paginationState.isLoadingMore, paginationState.hasMore, paginationState.lastDoc, pageSize, processSnapshot]);

  // Función para recargar notificaciones
  const refresh = useCallback(async () => {
    if (!userId) return;

    setPaginationState(prev => ({ ...prev, isLoading: true, error: null }));
    isInitialLoadRef.current = true;

    try {
      // Cargar desde cache si está offline
      if (enableOfflineSupport && !navigator.onLine) {
        const cachedNotifications = await loadFromCache();
        setNotifications(cachedNotifications);
        setPaginationState(prev => ({
          ...prev,
          isLoading: false,
          hasMore: false,
          error: 'Modo offline - usando datos en cache',
        }));
        return;
      }

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      // Limpiar listener anterior
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        processSnapshot(snapshot, true);
        isInitialLoadRef.current = false;
      }, (error) => {
        console.error('[usePaginatedNotifications] Error fetching notifications:', error);
        
        // Si hay error y no hay datos en cache, cargar desde cache
        if (notifications.length === 0) {
          loadFromCache().then(cached => {
            setNotifications(cached);
            setPaginationState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Error de conexión - usando datos en cache',
            }));
          });
        } else {
          setPaginationState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Error al actualizar notificaciones',
          }));
        }
      });

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('[usePaginatedNotifications] Error in refresh:', error);
      setPaginationState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Error al cargar notificaciones',
      }));
    }
  }, [userId, enableOfflineSupport, loadFromCache, notifications.length, pageSize, processSnapshot]);

  // Efecto inicial para cargar notificaciones
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setPaginationState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Usuario no autenticado',
      }));
      return;
    }

    refresh();

    // Cleanup al desmontar
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [userId, refresh]);

  // Efecto para detectar cambios de conexión
  useEffect(() => {
    if (!enableOfflineSupport) return;

    const handleOnline = () => {
      if (paginationState.error?.includes('offline')) {
        refresh();
      }
    };

    const handleOffline = () => {
      console.log('[usePaginatedNotifications] Going offline, will use cache');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableOfflineSupport, paginationState.error, refresh]);

  // Métodos de utilidad
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Actualizar estado local optimistamente
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('[usePaginatedNotifications] Error marking as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Actualizar estado local optimistamente
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('[usePaginatedNotifications] Error deleting notification:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loadMore,
    refresh,
    markAsRead,
    deleteNotification,
    ...paginationState,
  };
}; 