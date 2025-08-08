// src/hooks/useMessageActions.ts
import { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateTaskActivity } from '@/lib/taskUtils';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
}

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | Timestamp | null;
  endDate: string | Timestamp | null;
  LeadedBy: string[];
  AssignedTo: string[];
  CreatedBy?: string;
}

interface UseMessageActionsProps {
  task: Task;
  encryptMessage: (text: string) => Promise<{ encryptedData: string; nonce: string; tag: string; salt: string }>;
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (clientId: string, updates: Partial<Message>) => void;
}

export const useMessageActions = ({
  task,
  encryptMessage,
  addOptimisticMessage,
  updateOptimisticMessage,
}: UseMessageActionsProps) => {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (
    messageData: Partial<Message>,
    isAudio = false,
    audioUrl?: string,
  ) => {
    if (!messageData.senderId || isSending) return;
    setIsSending(true);

    const clientId = messageData.clientId || crypto.randomUUID();
    const tempId = `temp-${clientId}`;

    const optimisticMessage = {
      id: tempId,
      senderId: messageData.senderId,
      senderName: messageData.senderName || 'Usuario',
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

      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: messageData.senderId,
        senderName: messageData.senderName || 'Usuario',
        encrypted,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
        clientId, // Add clientId here
        replyTo: messageData.replyTo || null,
      });

      updateOptimisticMessage(clientId, {
        id: docRef.id,
        isPending: false,
        timestamp: Timestamp.now(),
      });

      await updateTaskActivity(task.id, 'message');
    } catch (error) {
      console.error('Send message error:', error);
      updateOptimisticMessage(clientId, {
        isPending: false,
        hasError: true,
      });
    } finally {
      setIsSending(false);
    }
  }, [task.id, isSending, encryptMessage, addOptimisticMessage, updateOptimisticMessage]);

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim()) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    try {
      const encrypted = await encryptMessage(newText.trim());
      const now = Timestamp.now();
      
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('El mensaje no existe.');
      }
      
      await updateDoc(messageRef, {
        encrypted,
        lastModified: now,
      });

      await updateTaskActivity(task.id, 'message');
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  }, [task.id, encryptMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log('[MessageActions] Deleting message', messageId);
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        
        if (messageData.hours && typeof messageData.hours === 'number' && messageData.hours > 0) {
          console.log('[MessageActions] Mensaje con tiempo detectado:', { hours: messageData.hours });
          const timerRef = doc(db, `tasks/${task.id}/timers/global`);
          const timerDoc = await getDoc(timerRef);
          
          if (timerDoc.exists()) {
            const currentTotal = timerDoc.data().totalHours || 0;
            const newTotal = Math.max(0, currentTotal - messageData.hours);
            console.log('[MessageActions] Actualizando timer global:', { currentTotal, newTotal });
            await updateDoc(timerRef, { totalHours: newTotal });
          }
        }

        if (messageData.filePath) {
          try {
            const response = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            if (!response.ok) {
              console.error('[MessageActions] Failed to delete GCS file', await response.json());
            } else {
              console.log('[MessageActions] GCS file deleted successfully');
            }
          } catch (error) {
            console.error('[MessageActions] Error deleting GCS file', error);
          }
        }
      }
      
      await deleteDoc(messageRef);
      console.log('[MessageActions] Message deleted successfully');
    } catch (error) {
      console.error('[MessageActions] Error deleting message', error);
      throw error;
    }
  }, [task.id]);

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
      
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: message.senderId,
        senderName: message.senderName,
        encrypted,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: message.imageUrl,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        filePath: message.filePath,
        clientId: newClientId, // Use newClientId
        replyTo: message.replyTo || null,
        ...(message.hours && { hours: message.hours }),
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
      throw new Error('Error al reenviar el mensaje');
    } finally {
      setIsSending(false);
    }
  }, [task.id, encryptMessage, addOptimisticMessage, updateOptimisticMessage, isSending]);

  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const updatePromises = messageIds.map(messageId =>
        updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
          read: true,
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read', error);
    }
  }, [task.id]);

  // Helper para crear timestamp al final del día (23:59:59)
  const getEndOfDayTimestamp = (date: Date): Timestamp => {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    return Timestamp.fromDate(endDate);
  };

  const sendTimeMessage = useCallback(async (
    senderId: string,
    senderName: string,
    hours: number,
    timeEntry: string,
    dateString?: string,
    comment?: string
  ) => {
    const timeMessageClientId = uuidv4();
    const commentClientId = uuidv4();
    const timeMessageTempId = `temp-time-${timeMessageClientId}`;
    const commentTempId = `temp-comment-${commentClientId}`;
    
    try {
      // Usar fecha seleccionada o fallback a now()
      const timestamp = dateString 
        ? getEndOfDayTimestamp(new Date(dateString))
        : Timestamp.now();
      
      const timeMessage = dateString 
        ? `Añadió una entrada de tiempo de ${timeEntry} el ${dateString}`
        : `Añadió una entrada de tiempo de ${timeEntry}`;
      const encryptedTime = await encryptMessage(timeMessage);
      
      console.log('[useMessageActions] 📝 Creando documento de tiempo:', {
        originalMessage: timeMessage,
        hours,
        timestamp: timestamp.toDate(),
        senderId,
        senderName
      });

      const optimisticTimeMessage = {
        id: timeMessageTempId,
        senderId,
        senderName,
        text: timeMessage,
        timestamp: timestamp.toDate(),
        read: false,
        hours,
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        filePath: null,
        isPending: false,
        hasError: false,
        clientId: timeMessageClientId,
        replyTo: null,
      };
      
      console.log('[useMessageActions] 🚀 Añadiendo mensaje optimista de tiempo:', optimisticTimeMessage);
      addOptimisticMessage(optimisticTimeMessage);

      const timeDocRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId,
        senderName,
        encrypted: encryptedTime,
        timestamp,
        read: false,
        clientId: timeMessageClientId, // Add clientId here
        hours,
      });
      
      console.log('[useMessageActions] ✅ Documento de tiempo creado con ID:', timeDocRef.id);
      
      updateOptimisticMessage(timeMessageClientId, {
        id: timeDocRef.id,
        timestamp: Timestamp.now(),
        isPending: false,
      });
      
      if (comment && comment.trim()) {
        console.log('[useMessageActions] 💬 Añadiendo comentario:', comment);
        
        const optimisticCommentMessage = {
          id: commentTempId,
          senderId,
          senderName,
          text: comment.trim(),
          timestamp: new Date(timestamp.toMillis() + 1),
          read: false,
          hours: null,
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          filePath: null,
          isPending: false,
          hasError: false,
          clientId: commentClientId,
          replyTo: null,
        };
        
        addOptimisticMessage(optimisticCommentMessage);
        
        const encryptedComment = await encryptMessage(comment.trim());
        const commentDocRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId,
          senderName,
          encrypted: encryptedComment,
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
          clientId: commentClientId, // Add clientId here
        });
        
        updateOptimisticMessage(commentClientId, {
          id: commentDocRef.id,
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          isPending: false,
        });
        
        console.log('[useMessageActions] ✅ Comentario creado con ID:', commentDocRef.id);
      }
      
      await updateTaskActivity(task.id, 'time_entry');
      
      console.log('[useMessageActions] 🎉 sendTimeMessage completado exitosamente');
      
    } catch (error) {
      console.error('[useMessageActions] ❌ Error en sendTimeMessage:', error);
      
      updateOptimisticMessage(timeMessageClientId, {
        hasError: true,
        isPending: false,
      });
      
      if (comment) {
        updateOptimisticMessage(commentClientId, {
          hasError: true,
          isPending: false,
        });
      }
      
      throw new Error(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    }
  }, [task.id, encryptMessage, addOptimisticMessage, updateOptimisticMessage]);

  return {
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    markMessagesAsRead,
    sendTimeMessage,
  };
};