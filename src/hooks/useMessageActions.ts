import { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateTaskActivity } from '@/lib/taskUtils';

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
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  CreatedBy?: string;
}

interface UseMessageActionsProps {
  task: Task;
  encryptMessage: (text: string) => string;
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

  // Función para enviar mensaje
  const sendMessage = useCallback(async (
    messageData: Partial<Message>,
    isAudio = false,
    audioUrl?: string,
    duration?: number,
  ) => {
    if (!messageData.senderId || isSending) return;
    setIsSending(true);

    const clientId = messageData.clientId || crypto.randomUUID();
    const tempId = `temp-${clientId}`;

    // Agregar mensaje optimista inmediatamente
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

    let encryptedText = null;
    if (messageData.text) {
      encryptedText = encryptMessage(messageData.text.trim());
    }

    try {
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: messageData.senderId,
        senderName: messageData.senderName || 'Usuario',
        text: encryptedText,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
        replyTo: messageData.replyTo || null,
        ...(duration && { hours: duration / 3600 }),
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

  // Función para editar mensaje
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim()) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    try {
      // Cifrar el texto editado antes de guardarlo en Firestore
      const encryptedText = encryptMessage(newText.trim());
      const now = Timestamp.now();
      
      // Obtener el mensaje actual para mantener su timestamp original
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('El mensaje no existe.');
      }
      
      // Mantener el timestamp original y solo actualizar lastModified
      await updateDoc(messageRef, {
        text: encryptedText,
        lastModified: now, // Solo actualizamos lastModified
      });

      // Actualizar la actividad de la tarea
      await updateTaskActivity(task.id, 'message');
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  }, [task.id, encryptMessage]);

  // Función para eliminar mensaje
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log('[MessageActions] Deleting message', messageId);
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        
        // Si el mensaje tiene horas registradas, actualizar el timer global
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

        // Eliminar archivo si existe
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

  // Función para reenviar mensaje
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

    // Agregar mensaje optimista
    addOptimisticMessage(resendMessage);

    try {
      // Cifrar el texto antes de reenviarlo a Firestore
      const encryptedText = message.text ? encryptMessage(message.text) : message.text;
      
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: message.senderId,
        senderName: message.senderName,
        text: encryptedText, // Guardar el texto cifrado
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: message.imageUrl,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        filePath: message.filePath,
        replyTo: message.replyTo || null,
        ...(message.hours && { hours: message.hours }),
      });

      // Actualizar mensaje optimista con ID real
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

  // Función para marcar mensajes como leídos
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

  // Función para enviar mensaje de tiempo
  const sendTimeMessage = useCallback(async (
    senderId: string,
    senderName: string,
    hours: number,
    timeEntry: string,
    dateString?: string,
    comment?: string
  ) => {
    console.log('[useMessageActions] 🎯 sendTimeMessage llamada con:', {
      senderId,
      senderName,
      hours,
      timeEntry,
      dateString,
      comment,
      taskId: task.id
    });

    const clientId = crypto.randomUUID();
    const tempId = `temp-time-${clientId}`;
    
    try {
      const timestamp = Timestamp.now();
      
      // Cifrar el mensaje de tiempo antes de guardarlo
      const timeMessage = dateString 
        ? `Añadió una entrada de tiempo de ${timeEntry} el ${dateString}`
        : `Añadió una entrada de tiempo de ${timeEntry}`;
      const encryptedTimeMessage = encryptMessage(timeMessage);
      
      console.log('[useMessageActions] 📝 Creando documento de tiempo:', {
        originalMessage: timeMessage,
        encryptedTimeMessage: encryptedTimeMessage,
        hours,
        timestamp: timestamp.toDate(),
        senderId,
        senderName
      });

      // 🚀 CREAR MENSAJE OPTIMISTA INMEDIATAMENTE
      const optimisticTimeMessage = {
        id: tempId,
        senderId,
        senderName,
        text: timeMessage, // Mostrar texto sin cifrar en la UI
        timestamp: new Date(),
        read: false,
        hours,
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        filePath: null,
        isPending: false,
        hasError: false,
        clientId,
        replyTo: null,
      };
      
      console.log('[useMessageActions] 🚀 Añadiendo mensaje optimista de tiempo:', optimisticTimeMessage);
      addOptimisticMessage(optimisticTimeMessage);

      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId,
        senderName,
        text: encryptedTimeMessage, // Guardar el mensaje cifrado
        timestamp,
        read: false,
        hours,
      });
      
      console.log('[useMessageActions] ✅ Documento de tiempo creado con ID:', docRef.id);
      
      // 🔄 ACTUALIZAR MENSAJE OPTIMISTA CON ID REAL
      updateOptimisticMessage(clientId, {
        id: docRef.id,
        timestamp: Timestamp.now(),
        isPending: false,
      });
      console.log('[useMessageActions] 🔄 Mensaje optimista actualizado con ID real:', docRef.id);
      
      if (comment && comment.trim()) {
        console.log('[useMessageActions] 💬 Añadiendo comentario:', comment);
        // Cifrar el comentario antes de guardarlo
        const encryptedComment = encryptMessage(comment.trim());
        
        const commentDocRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId,
          senderName,
          text: encryptedComment, // Guardar el comentario cifrado
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
        });
        
        console.log('[useMessageActions] ✅ Comentario creado con ID:', commentDocRef.id);
      }
      
      // Actualizar la actividad de la tarea
      console.log('[useMessageActions] 🔄 Actualizando actividad de tarea...');
      await updateTaskActivity(task.id, 'time_entry');
      
      console.log('[useMessageActions] 🎉 sendTimeMessage completado exitosamente');
      
      // WORKAROUND: Forzar refetch de mensajes para asegurar sincronización
      console.log('[useMessageActions] 🔄 Forzando actualización de mensajes...');
      
      // Múltiples intentos para asegurar que el mensaje aparezca
      [100, 500, 1000, 2000].forEach(delay => {
        setTimeout(() => {
          console.log(`[useMessageActions] 🔄 Forzando refetch en ${delay}ms...`);
          window.dispatchEvent(new CustomEvent('forceMessageRefresh', { 
            detail: { taskId: task.id, messageId: docRef.id, attempt: delay } 
          }));
        }, delay);
      });
    } catch (error) {
      console.error('[useMessageActions] ❌ Error en sendTimeMessage:', error);
      
      // 🔄 MARCAR MENSAJE OPTIMISTA COMO ERROR
      updateOptimisticMessage(clientId, {
        hasError: true,
        isPending: false,
      });
      console.log('[useMessageActions] ❌ Mensaje optimista marcado como error');
      
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