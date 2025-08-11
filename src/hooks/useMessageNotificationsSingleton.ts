// src/hooks/useMessageNotificationsSingleton.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, doc, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Debug mode
const DEBUG = process.env.NODE_ENV === 'development';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text?: string;
    timestamp: Timestamp;
    senderId: string;
  };
  lastViewedBy?: { [userId: string]: Timestamp };
  unreadCountByUser?: { [userId: string]: number };
  lastMessageTime?: Timestamp; // Added for sorting
  unreadCount?: number; // Added for denormalized count
}

interface MessageNotification {
  conversationId: string;
  senderId: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime: Timestamp;
}

// Función helper para validar si un timestamp es válido
const isValidTimestamp = (timestamp: unknown): timestamp is Timestamp => {
  return timestamp && 
         typeof timestamp === 'object' && 
         typeof (timestamp as Timestamp).toMillis === 'function' &&
         typeof (timestamp as Timestamp).toDate === 'function';
};

// Singleton para manejar listeners globalmente
export class MessageNotificationsManager {
  private static instance: MessageNotificationsManager | null = null;
  private listeners: Map<string, () => void> = new Map();
  private subscribers: Map<string, Set<(notifications: MessageNotification[]) => void>> = new Map();
  private notifications: Map<string, MessageNotification[]> = new Map(); // Changed from currentNotifications
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): MessageNotificationsManager {
    if (!MessageNotificationsManager.instance) {
      MessageNotificationsManager.instance = new MessageNotificationsManager();
    }
    return MessageNotificationsManager.instance;
  }

  private constructor() {}

  subscribe(userId: string, callback: (notifications: MessageNotification[]) => void): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    
    const userSubscribers = this.subscribers.get(userId)!;
    userSubscribers.add(callback);

    // Setup listener on first subscribe (PERSISTENTE)
    if (!this.listeners.has(userId)) {
      if (DEBUG) {
        // Debug logging disabled
      }
      this.setupListener(userId);
    }

    // Enviar estado actual inmediatamente
    const currentNotifications = this.notifications.get(userId) || []; // Changed from currentNotifications
    callback(currentNotifications);

    // Retornar función de unsubscribe (NO CLEANUP LISTENER)
    return () => {
      userSubscribers.delete(callback);
      if (userSubscribers.size === 0) {
        this.subscribers.delete(userId);
        // NO cleanupListener aquí - mantener listener vivo
        if (DEBUG) {
          // Debug logging disabled
        }
      }
    };
  }

  private cleanupListener(userId: string) {
    const unsubscribe = this.listeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(userId);
      this.notifications.delete(userId); // Changed from currentNotifications
      
      // Limpiar debounce timeout
      const timeout = this.debounceTimeouts.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        this.debounceTimeouts.delete(userId);
      }
      
      if (DEBUG) {
        // Debug logging disabled
      }
    }
  }

  setupListener(userId: string) {
    if (this.listeners.has(userId)) {
      if (DEBUG) {
        // Debug logging disabled
      }
      return;
    }

    if (DEBUG) {
      // Debug logging disabled
    }

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(conversationsQuery, { includeMetadataChanges: true }, async (snapshot) => {
      // IGNORAR CACHE SNAPSHOTS - solo procesar cambios reales
      if (snapshot.metadata.fromCache) {
        if (DEBUG) {
          // Debug logging disabled
        }
        return;
      }

      // Limpiar timeout anterior
      const existingTimeout = this.debounceTimeouts.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Debounce el procesamiento
      const timeoutId = setTimeout(async () => {
        const notifications: MessageNotification[] = [];

        for (const conversationDoc of snapshot.docs) {
          const conversationData = conversationDoc.data() as Conversation;
          
          const otherParticipant = conversationData.participants.find(p => p !== userId);
          if (!otherParticipant) continue;

          const lastMessage = conversationData.lastMessage;
          
          if (lastMessage && 
              lastMessage.senderId !== userId && 
              isValidTimestamp(lastMessage.timestamp)) {
            
            // Usar denormalized unread count en lugar de recalcular
            const unreadCount = conversationData.unreadCountByUser?.[userId] || 0;

          if (unreadCount > 0) {
            notifications.push({
              conversationId: conversationDoc.id,
              senderId: otherParticipant,
              unreadCount,
              lastMessage: lastMessage.text,
              lastMessageTime: lastMessage.timestamp,
            });
          }
          }
        }

        const sortedNotifications = notifications.sort((a, b) => {
          if (!isValidTimestamp(a.lastMessageTime) || !isValidTimestamp(b.lastMessageTime)) {
            return 0;
          }
          return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
        });

        // Actualizar estado global
        this.notifications.set(userId, sortedNotifications); // Changed from currentNotifications

        // Notificar a todos los subscribers
        const userSubscribers = this.subscribers.get(userId);
        if (userSubscribers) {
          userSubscribers.forEach(callback => {
            try {
              callback(sortedNotifications);
            } catch {
              // Silently handle error
            }
          });
        }

        if (DEBUG) {
          // Debug logging disabled
        }
      }, 500); // 500ms debounce

      this.debounceTimeouts.set(userId, timeoutId);
    }, () => {
      // Silently handle error
      this.notifications.set(userId, []);
    });

    this.listeners.set(userId, unsubscribe);
  }

  async markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      // OPTIMISTIC UPDATE PRIMERO: Remover localmente antes de Firestore
      const currentNotifications = this.notifications.get(userId) || []; // Changed from currentNotifications
      const updatedNotifications = currentNotifications.filter(n => n.conversationId !== conversationId);
      
      this.notifications.set(userId, updatedNotifications); // Changed from currentNotifications
      
      // Notificar subscribers inmediatamente
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.forEach(callback => {
          try {
            callback(updatedNotifications);
          } catch {
            // Silently handle error
          }
        });
      }
      if (DEBUG) {
        // Debug logging disabled
      }

      // Luego update Firestore con transaction (atomic)
      const conversationRef = doc(db, 'conversations', conversationId);
      await runTransaction(db, async (transaction) => {
        const convSnap = await transaction.get(conversationRef);
        if (convSnap.exists()) {
          transaction.update(conversationRef, {
            [`lastViewedBy.${userId}`]: Timestamp.now(),
            [`unreadCountByUser.${userId}`]: 0, // Reset unread count
          });
        }
      });
      if (DEBUG) {
        // Debug logging disabled
      }
    } catch {
      // Silently handle error
      this.setupListener(userId);
    }
  }

  // Método público para refrescar notificaciones
  refreshNotifications(userId: string): void {
    this.setupListener(userId);
  }

  // Método público para verificar si existe listener
  hasListener(userId: string): boolean {
    return this.listeners.has(userId);
  }

  // Método público para cleanup global (solo en logout/app close)
  cleanupAllListeners(): void {
    if (DEBUG) {
      // Debug logging disabled
    }
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.subscribers.clear();
    this.notifications.clear(); // Changed from currentNotifications
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
  }
}

// Hook que usa el singleton
export const useMessageNotificationsSingleton = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [messageNotifications, setMessageNotifications] = useState<MessageNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const managerRef = useRef<MessageNotificationsManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) {
      setMessageNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    managerRef.current = MessageNotificationsManager.getInstance();

    // Setup listener si no existe
    if (!managerRef.current.hasListener(userId)) {
      managerRef.current.setupListener(userId);
    }

    // Subscribe to updates
    unsubscribeRef.current = managerRef.current.subscribe(userId, (notifications) => {
      setMessageNotifications(notifications);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId || !managerRef.current) return;
    await managerRef.current.markConversationAsRead(userId, conversationId);
  }, [userId]);

  const getUnreadCountForUser = useCallback((senderId: string): number => {
    const notification = messageNotifications.find(n => n.senderId === senderId);
    return notification?.unreadCount || 0;
  }, [messageNotifications]);

  const memoizedReturn = useMemo(() => ({
    messageNotifications,
    getUnreadCountForUser,
    markConversationAsRead,
    isLoading,
  }), [messageNotifications, getUnreadCountForUser, markConversationAsRead, isLoading]);

  return memoizedReturn;
}; 