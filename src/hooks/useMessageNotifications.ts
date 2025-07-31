import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot, doc, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text?: string;
    timestamp: Timestamp;
    senderId: string;
  };
  lastViewedBy?: { [userId: string]: Timestamp };
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

export const useMessageNotifications = () => {
  const { user } = useUser();
  const userId = user?.id || '';
  const [messageNotifications, setMessageNotifications] = useState<MessageNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMessageNotifications([]);
      setIsLoading(false);
      return;
    }

    // Setting up listener
    setIsLoading(true);

    // Obtener todas las conversaciones donde el usuario es participante
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const notifications: MessageNotification[] = [];

      for (const conversationDoc of snapshot.docs) {
        const conversationData = conversationDoc.data() as Conversation;
        
        // Obtener el otro participante (no el usuario actual)
        const otherParticipant = conversationData.participants.find(p => p !== userId);
        if (!otherParticipant) continue;

        // Verificar si hay mensajes no leídos
        const lastViewed = conversationData.lastViewedBy?.[userId];
        const lastMessage = conversationData.lastMessage;
        
        // Validar que lastMessage existe y tiene un timestamp válido
        if (lastMessage && 
            lastMessage.senderId !== userId && 
            isValidTimestamp(lastMessage.timestamp)) {
          
          // Validar que lastViewed existe y es un timestamp válido
          const lastViewedValid = isValidTimestamp(lastViewed);
          
          // Si no hay lastViewed o el último mensaje es más reciente que la última vista
          if (!lastViewedValid || lastMessage.timestamp.toMillis() > lastViewed.toMillis()) {
            // Contar mensajes no leídos
            const messagesQuery = query(
              collection(db, 'conversations', conversationDoc.id, 'messages'),
              where('senderId', '==', otherParticipant),
              where('timestamp', '>', lastViewedValid ? lastViewed : new Date(0))
            );

            try {
              const messagesSnapshot = await getDocs(messagesQuery);
              const unreadCount = messagesSnapshot.size;

              if (unreadCount > 0) {
                notifications.push({
                  conversationId: conversationDoc.id,
                  senderId: otherParticipant,
                  unreadCount,
                  lastMessage: lastMessage.text,
                  lastMessageTime: lastMessage.timestamp,
                });
              }
            } catch (error) {
              console.error('[useMessageNotifications] Error counting unread messages:', error);
            }
          }
        }
      }

      // Ordenar por último mensaje (más reciente primero)
      const sortedNotifications = notifications.sort((a, b) => {
        // Verificar que ambos lastMessageTime existan y sean timestamps válidos antes de llamar toMillis()
        if (!isValidTimestamp(a.lastMessageTime) || !isValidTimestamp(b.lastMessageTime)) {
          return 0; // Si alguno no es válido, mantener el orden original
        }
        return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
      });

      // Solo actualizar si realmente cambió el estado
      setMessageNotifications(prev => {
        const prevLength = prev.length;
        const newLength = sortedNotifications.length;
        
        // Comparar arrays para evitar actualizaciones innecesarias
        if (prevLength !== newLength) {
          console.log('[useMessageNotifications] Notifications count changed:', prevLength, '->', newLength);
          return sortedNotifications;
        }
        
        // Comparar contenido si la longitud es la misma
        const hasChanged = prev.some((prevNotif, index) => {
          const newNotif = sortedNotifications[index];
          return !newNotif || 
                 prevNotif.conversationId !== newNotif.conversationId ||
                 prevNotif.unreadCount !== newNotif.unreadCount;
        });
        
        if (hasChanged) {
          console.log('[useMessageNotifications] Notifications content changed');
          return sortedNotifications;
        }
        
        // No changes detected
        return prev; // No actualizar si no hay cambios
      });
      
      setIsLoading(false);
    }, (error) => {
      console.error('[useMessageNotifications] Error fetching conversations:', error);
      setMessageNotifications([]);
      setIsLoading(false);
    });

    return () => {
      // Cleaning up listener
      unsubscribe();
    };
  }, [userId]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!userId) return;
    
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`lastViewedBy.${userId}`]: Timestamp.now(),
      });
      console.log('[useMessageNotifications] Conversation marked as read:', conversationId);
    } catch (error) {
      console.error('[useMessageNotifications] Error marking conversation as read:', error);
    }
  }, [userId]);

  const getUnreadCountForUser = useCallback((senderId: string): number => {
    const notification = messageNotifications.find(n => n.senderId === senderId);
    return notification?.unreadCount || 0;
  }, [messageNotifications]);

  // Memoizar el objeto de retorno para evitar re-renders
  const memoizedReturn = useMemo(() => ({
    messageNotifications,
    getUnreadCountForUser,
    markConversationAsRead,
    isLoading,
  }), [messageNotifications, getUnreadCountForUser, markConversationAsRead, isLoading]);

  return memoizedReturn;
}; 