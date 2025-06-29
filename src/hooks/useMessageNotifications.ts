import { useState, useEffect, useCallback } from 'react';
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

    console.log('[useMessageNotifications] Setting up listener for user:', userId);
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
        
        if (lastMessage && lastMessage.senderId !== userId) {
          // Si no hay lastViewed o el último mensaje es más reciente que la última vista
          if (!lastViewed || lastMessage.timestamp.toMillis() > lastViewed.toMillis()) {
            // Contar mensajes no leídos
            const messagesQuery = query(
              collection(db, 'conversations', conversationDoc.id, 'messages'),
              where('senderId', '==', otherParticipant),
              where('timestamp', '>', lastViewed || new Date(0))
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
        // Verificar que ambos lastMessageTime existan antes de llamar toMillis()
        if (!a.lastMessageTime || !b.lastMessageTime) {
          return 0; // Si alguno no existe, mantener el orden original
        }
        return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
      });

      setMessageNotifications(sortedNotifications);
      setIsLoading(false);
      console.log('[useMessageNotifications] Fetched message notifications:', sortedNotifications.length);
    }, (error) => {
      console.error('[useMessageNotifications] Error fetching conversations:', error);
      setMessageNotifications([]);
      setIsLoading(false);
    });

    return () => {
      console.log('[useMessageNotifications] Cleaning up listener');
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

  return {
    messageNotifications,
    getUnreadCountForUser,
    markConversationAsRead,
    isLoading,
  };
}; 