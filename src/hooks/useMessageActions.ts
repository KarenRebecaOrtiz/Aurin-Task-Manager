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
    if (!messageData.senderId || isSending) {
      return;
    }

    setIsSending(true);
    const clientId = messageData.clientId || crypto.randomUUID();
    const tempId = messageData.id || `temp-${clientId}`;
    
    // Cifrar el texto del mensaje antes de enviarlo
    const encryptedText = messageData.text ? encryptMessage(messageData.text) : null;
    
    const optimisticMessage: Message = {
      id: tempId,
      senderId: messageData.senderId,
      senderName: messageData.senderName || 'Usuario',
      text: messageData.text || null, // Mostrar texto sin cifrar en la UI
      timestamp: new Date(),
      read: false,
      imageUrl: messageData.imageUrl || null,
      fileUrl: messageData.fileUrl || audioUrl || null,
      fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
      fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
      filePath: messageData.filePath || null,
      hours: duration ? duration / 3600 : undefined,
      isPending: messageData.isPending !== undefined ? messageData.isPending : true,
      hasError: messageData.hasError || false,
      clientId,
      replyTo: messageData.replyTo || null,
    };

    // Agregar mensaje optimista
    addOptimisticMessage(optimisticMessage);

    // Skip Firestore update if the message is just an optimistic update (still pending)
    if (messageData.isPending) {
      setIsSending(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: messageData.senderId,
        senderName: messageData.senderName || 'Usuario',
        text: encryptedText, // Guardar el texto cifrado en Firestore
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

      // Crear notificaciones para todos los participantes de la tarea (excepto el remitente)
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(messageData.senderId); // No notificar al remitente
      
      // Crear el mensaje de notificación
      let notificationMessage = '';
      if (messageData.text) {
        const textPreview = messageData.text.length > 50 
          ? `${messageData.text.substring(0, 50)}...` 
          : messageData.text;
        notificationMessage = `${messageData.senderName || 'Usuario'} escribió en ${task.name}: ${textPreview}`;
      } else if (messageData.imageUrl) {
        notificationMessage = `${messageData.senderName || 'Usuario'} compartió una imagen en ${task.name}`;
      } else if (messageData.fileUrl) {
        notificationMessage = `${messageData.senderName || 'Usuario'} compartió un archivo en ${task.name}`;
      } else if (duration) {
        notificationMessage = `${messageData.senderName || 'Usuario'} registró tiempo en ${task.name}`;
      } else {
        notificationMessage = `${messageData.senderName || 'Usuario'} envió un mensaje en ${task.name}`;
      }

      // Crear notificaciones para cada participante
      const notificationPromises = Array.from(recipients).map(recipientId =>
        addDoc(collection(db, 'notifications'), {
          userId: messageData.senderId,
          taskId: task.id,
          message: notificationMessage,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
          type: 'task_message',
        })
      );

      await Promise.all(notificationPromises);

      // Actualizar mensaje optimista con ID real
      updateOptimisticMessage(clientId, {
        id: docRef.id,
        isPending: false,
        timestamp: Timestamp.now(),
      });
      
      // Actualizar la actividad de la tarea
      await updateTaskActivity(task.id, 'message');
    } catch (error) {
      console.error('Send message error', error);
      updateOptimisticMessage(clientId, {
        isPending: false,
        hasError: true,
      });
    } finally {
      setIsSending(false);
    }
  }, [task, encryptMessage, addOptimisticMessage, updateOptimisticMessage, isSending]);

  // Función para editar mensaje
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim()) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    try {
      // Cifrar el texto editado antes de guardarlo en Firestore
      const encryptedText = encryptMessage(newText.trim());
      
      await updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
        text: encryptedText, // Guardar el texto cifrado
        timestamp: Timestamp.now(),
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
    try {
      const timestamp = Timestamp.now();
      
      // Cifrar el mensaje de tiempo antes de guardarlo
      const timeMessage = dateString 
        ? `Añadió una entrada de tiempo de ${timeEntry} el ${dateString}`
        : `Añadió una entrada de tiempo de ${timeEntry}`;
      const encryptedTimeMessage = encryptMessage(timeMessage);
      
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId,
        senderName,
        text: encryptedTimeMessage, // Guardar el mensaje cifrado
        timestamp,
        read: false,
        hours,
      });
      
      if (comment && comment.trim()) {
        // Cifrar el comentario antes de guardarlo
        const encryptedComment = encryptMessage(comment.trim());
        
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId,
          senderName,
          text: encryptedComment, // Guardar el comentario cifrado
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
        });
      }
      
      // Actualizar la actividad de la tarea
      await updateTaskActivity(task.id, 'time_entry');
    } catch (error) {
      console.error('Error adding time entry', error);
      throw new Error(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    }
  }, [task.id, encryptMessage]);

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