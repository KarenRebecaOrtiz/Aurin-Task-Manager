// src/hooks/usePrivateMessageActions.ts
import { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';

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

interface UsePrivateMessageActionsProps {
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  encryptMessage: (text: string) => Promise<{ encryptedData: string; nonce: string; tag: string; salt: string }>;
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (clientId: string, updates: Partial<Message>) => void;
}

export const usePrivateMessageActions = ({
  conversationId,
  senderId,
  receiverId,
  senderName,
  encryptMessage,
  addOptimisticMessage,
  updateOptimisticMessage,
}: UsePrivateMessageActionsProps) => {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (
    messageData: Partial<Message>,
    isAudio = false,
    audioUrl?: string,
  ) => {
    if (!senderId || isSending || !conversationId || conversationId === '') return;
    setIsSending(true);

    const clientId = messageData.clientId || crypto.randomUUID();
    const tempId = `temp-${clientId}`;

    const optimisticMessage: Message = {
      id: tempId,
      senderId,
      receiverId,
      senderName,
      text: messageData.text || null,
      timestamp: new Date(),
      read: false,
      imageUrl: messageData.imageUrl || null,
      fileUrl: messageData.fileUrl || audioUrl || null,
      fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
      fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
      filePath: messageData.filePath || null,
      isPending: true,
      hasError: false,
      clientId,
      replyTo: messageData.replyTo || null,
    };

    addOptimisticMessage(optimisticMessage);

    try {
      const encrypted = messageData.text ? await encryptMessage(messageData.text.trim()) : null;

      const docRef = await addDoc(collection(db, `conversations/${conversationId}/messages`), {
        senderId,
        receiverId,
        senderName,
        encrypted,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
        clientId,
        replyTo: messageData.replyTo || null,
      });

      // Update conversation last message
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: {
          text: messageData.text,
          timestamp: serverTimestamp(),
          senderId,
        },
        [`lastViewedBy.${senderId}`]: serverTimestamp(),
      });

      updateOptimisticMessage(clientId, {
        id: docRef.id,
        isPending: false,
        timestamp: Timestamp.now(),
      });

      // Create notification
      try {
        const notificationText = messageData.text 
          ? `${senderName} te escribió: ${messageData.text.length > 50 ? messageData.text.substring(0, 50) + '...' : messageData.text}`
          : `${senderName} te ha enviado un mensaje privado`;
          
        await addDoc(collection(db, 'notifications'), {
          userId: senderId,
          message: notificationText,
          timestamp: Timestamp.now(),
          read: false,
          recipientId: receiverId,
          conversationId,
          type: 'private_message',
        });
      } catch (error) {
        console.error('[usePrivateMessageActions] Failed to create notification:', error);
      }
    } catch (error) {
      console.error('Send message error:', error);
      updateOptimisticMessage(clientId, {
        isPending: false,
        hasError: true,
      });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, senderId, receiverId, senderName, isSending, encryptMessage, addOptimisticMessage, updateOptimisticMessage]);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim()) {
      throw new Error('El mensaje no puede estar vacío.');
    }
    
    if (!conversationId || conversationId === '') {
      throw new Error('Conversación no válida.');
    }

    try {
      const encrypted = await encryptMessage(newText.trim());
      const now = Timestamp.now();
      
      const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('El mensaje no existe.');
      }
      
      await updateDoc(messageRef, {
        encrypted,
        lastModified: now,
      });

      // Update conversation last message if this was the last message
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      if (conversationDoc.exists()) {
        const conversationData = conversationDoc.data() as Conversation;
        if (conversationData.lastMessage?.senderId === senderId) {
          await updateDoc(conversationRef, {
            lastMessage: {
              text: newText,
              timestamp: now,
              senderId,
            },
          });
        }
      }

      // OPTIMISTIC UPDATE: Actualizar optimistamente en el store
      // Esto se maneja en MessageSidebar.tsx para mejor control
      console.log('[PrivateMessageActions] Message edited successfully in Firestore:', messageId);
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  }, [conversationId, senderId, encryptMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!conversationId || conversationId === '') {
      throw new Error('Conversación no válida.');
    }
    
    try {
      console.log('[PrivateMessageActions] Deleting message', messageId);
      const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        
        if (messageData.filePath) {
          try {
            const response = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            if (!response.ok) {
              console.error('[PrivateMessageActions] Failed to delete GCS file', await response.json());
            } else {
              console.log('[PrivateMessageActions] GCS file deleted successfully');
            }
          } catch (error) {
            console.error('[PrivateMessageActions] Error deleting GCS file', error);
          }
        }
      }
      
      await deleteDoc(messageRef);
      console.log('[PrivateMessageActions] Message deleted successfully');
    } catch (error) {
      console.error('[PrivateMessageActions] Error deleting message', error);
      throw error;
    }
  }, [conversationId]);

  const resendMessage = useCallback(async (message: Message) => {
    if (isSending) {
      return;
    }

    setIsSending(true);
    const newTempId = `temp-${Date.now()}-${Math.random()}`;
    const newClientId = crypto.randomUUID();
    const resendMessage: Message = {
      ...message,
      id: newTempId,
      clientId: newClientId,
      timestamp: Timestamp.fromDate(new Date()),
      isPending: true,
      hasError: false,
    };

    addOptimisticMessage(resendMessage);

    try {
      const encrypted = message.text ? await encryptMessage(message.text) : null;
      
      const docRef = await addDoc(collection(db, `conversations/${conversationId}/messages`), {
        senderId: message.senderId,
        receiverId: message.receiverId,
        senderName: message.senderName,
        encrypted,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: message.imageUrl,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        filePath: message.filePath,
        clientId: newClientId,
        replyTo: message.replyTo || null,
      });

      updateOptimisticMessage(newClientId, {
        id: docRef.id,
        isPending: false,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Resend message error', error);
      updateOptimisticMessage(newClientId, {
        isPending: false,
        hasError: true,
      });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, isSending, encryptMessage, addOptimisticMessage, updateOptimisticMessage]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await updateDoc(doc(db, `conversations/${conversationId}/messages`, messageId), {
        read: true,
      });
    } catch (error) {
      console.error('[PrivateMessageActions] Error marking message as read:', error);
    }
  }, [conversationId]);

  const sendTimeMessage = useCallback(async (hours: number) => {
    if (!senderId || isSending) return;
    setIsSending(true);

    const clientId = crypto.randomUUID();
    const tempId = `temp-${clientId}`;

    const optimisticMessage: Message = {
      id: tempId,
      senderId,
      receiverId,
      senderName,
      text: null,
      timestamp: new Date(),
      read: false,
      hours,
      isPending: true,
      hasError: false,
      clientId,
      replyTo: null,
    };

    addOptimisticMessage(optimisticMessage);

    try {
      const docRef = await addDoc(collection(db, `conversations/${conversationId}/messages`), {
        senderId,
        receiverId,
        senderName,
        hours,
        timestamp: serverTimestamp(),
        read: false,
        clientId,
      });

      updateOptimisticMessage(clientId, {
        id: docRef.id,
        isPending: false,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Send time message error:', error);
      updateOptimisticMessage(clientId, {
        isPending: false,
        hasError: true,
      });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, senderId, receiverId, senderName, isSending, addOptimisticMessage, updateOptimisticMessage]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    markAsRead,
    sendTimeMessage,
    isSending,
  };
}; 