// src/hooks/useMessageActions.ts
import { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateTaskActivity } from '@/lib/taskUtils';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Task } from '@/types';

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
    } catch {
      // Error logging removed for production
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
    } catch {
      // Error logging removed for production
      throw new Error('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  }, [task.id, encryptMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      // Debug logging removed for production
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        
        if (messageData.hours && typeof messageData.hours === 'number' && messageData.hours > 0) {
          // Debug logging removed for production
          const timerRef = doc(db, `tasks/${task.id}/timers/global`);
          const timerDoc = await getDoc(timerRef);
          
          if (timerDoc.exists()) {
            const currentTotal = timerDoc.data().totalHours || 0;
            const newTotal = Math.max(0, currentTotal - messageData.hours);
            // Debug logging removed for production
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
              // Error logging removed for production
            } else {
              // Debug logging removed for production
            }
                } catch {
        // Error logging removed for production
      }
        }
      }
      
      await deleteDoc(messageRef);
      // Debug logging removed for production
    } catch {
      // Error logging removed for production
      throw new Error('Error al eliminar el mensaje');
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
          } catch {
        // Error logging removed for production
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
    } catch {
      // Error logging removed for production
    }
  }, [task.id]);

  // Helper para crear timestamp con la hora actual del día seleccionado
  const getCurrentTimeTimestamp = (date: Date): Timestamp => {
    const now = new Date();
    const selectedDate = new Date(date);
    
    // Mantener la fecha seleccionada pero con la hora actual
    selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    
    return Timestamp.fromDate(selectedDate);
  };

  // Helper para parsear fechas en formato mexicano (DD/MM/YYYY)
  const parseMexicanDate = (dateString: string): Date => {
    try {
      // Formato esperado: "DD/MM/YYYY" o "D/M/YYYY"
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-based
        const year = parseInt(parts[2], 10);
        
        // Validar que los números sean válidos
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
            day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
          const parsedDate = new Date(year, month, day);
          
          // Validar que no sea fecha futura
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsedDate > today) {
            console.warn('[useMessageActions] Future date detected, using current date:', dateString);
            return new Date();
          }
          
          return parsedDate;
        }
      }
      
      // Fallback: intentar con Date constructor
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        // Validar que no sea fecha futura
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (fallbackDate > today) {
          console.warn('[useMessageActions] Future date detected in fallback, using current date:', dateString);
          return new Date();
        }
        return fallbackDate;
      }
      
      // Si todo falla, usar fecha actual
      console.warn('[useMessageActions] Invalid date format, using current date:', dateString);
      return new Date();
    } catch (error) {
      console.warn('[useMessageActions] Error parsing date, using current date:', dateString, error);
      return new Date();
    }
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
      // Usar fecha seleccionada con hora actual o fallback a now()
      const timestamp = dateString 
        ? getCurrentTimeTimestamp(parseMexicanDate(dateString))
        : Timestamp.now();
      
      const timeMessage = dateString 
        ? `Añadió una entrada de tiempo de ${timeEntry} el ${dateString}`
        : `Añadió una entrada de tiempo de ${timeEntry}`;
      const encryptedTime = await encryptMessage(timeMessage);
      
      // Debug logging removed for production

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
      
      // Debug logging removed for production
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
      
      // Debug logging removed for production
      
      updateOptimisticMessage(timeMessageClientId, {
        id: timeDocRef.id,
        timestamp: Timestamp.now(),
        isPending: false,
      });
      
      if (comment && comment.trim()) {
        // Debug logging removed for production
        
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
        
        // Debug logging removed for production
      }
      
      await updateTaskActivity(task.id, 'time_entry');
      
      // Debug logging removed for production
      
    } catch (error) {
      // Error logging removed for production
      
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