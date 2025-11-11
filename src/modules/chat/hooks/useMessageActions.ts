/**
 * useMessageActions Hook
 * 
 * Hook con Optimistic UI para acciones de mensajes.
 * Basado en chatsidebarMODULARIZED con mejoras de UX.
 */

import { useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useChatStore } from '../stores/chatStore';
import { firebaseService } from '../services/firebaseService';
import type { Message } from '../types';
import { generateClientId } from '../utils';

interface UseMessageActionsProps {
  taskId: string;
  currentUser: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  encryptMessage?: (text: string) => Promise<string>;
}

/**
 * Hook de acciones de mensajes con Optimistic UI
 * Proporciona respuesta instantánea al usuario
 */
export const useMessageActions = ({
  taskId,
  currentUser,
  encryptMessage,
}: UseMessageActionsProps) => {
  const { 
    addMessage, 
    updateMessage, 
    deleteMessage,
    setReplyingTo,
    replyingTo,
    editingMessageId,
    setEditingId,
  } = useChatStore();

  /**
   * Envía un mensaje con Optimistic UI
   */
  const handleSendMessage = useCallback(
    async (
      text: string,
      imageUrl?: string,
      fileUrl?: string,
      fileName?: string,
      hours?: number,
      dateString?: string,
    ) => {
      if (!text.trim() && !imageUrl && !fileUrl && !hours) return;

      // Encriptar texto si es necesario
      const encryptedText = encryptMessage && text ? await encryptMessage(text) : text;

      // 1. Crear mensaje optimista
      const optimisticMessage: Message = {
        id: generateClientId(),
        clientId: generateClientId(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: text.trim() || null,
        timestamp: Timestamp.now(),
        read: false,
        imageUrl: imageUrl || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        hours,
        dateString,
        replyTo: replyingTo || null,
        isPending: true,
        hasError: false,
      };

      // 2. Agregar inmediatamente al UI (Optimistic)
      addMessage(taskId, optimisticMessage);

      try {
        // 3. Enviar a Firebase
        const messageId = await firebaseService.sendMessage(taskId, {
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: encryptedText || null,
          read: false,
          imageUrl: imageUrl || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          hours,
          dateString,
          replyTo: replyingTo || null,
          clientId: optimisticMessage.clientId,
        });

        // 4. Actualizar con ID real y quitar estado pending
        updateMessage(taskId, optimisticMessage.id, {
          id: messageId,
          isPending: false,
        });

        // 5. Limpiar estado de reply
        setReplyingTo(null);
      } catch (error) {
        console.error('[useMessageActions] Error sending message:', error);
        // 6. Marcar como error para que el usuario pueda reintentar
        updateMessage(taskId, optimisticMessage.id, {
          isPending: false,
          hasError: true,
        });
      }
    },
    [taskId, currentUser, encryptMessage, replyingTo, addMessage, updateMessage, setReplyingTo]
  );

  /**
   * Edita un mensaje con Optimistic UI
   */
  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!newText.trim()) return;

      const encryptedText = encryptMessage ? await encryptMessage(newText) : newText;

      try {
        // 1. Actualizar optimistamente
        updateMessage(taskId, messageId, { text: newText.trim() });

        // 2. Actualizar en Firebase
        await firebaseService.updateMessage(taskId, messageId, {
          text: encryptedText.trim(),
        });

        // 3. Limpiar estado de edición
        setEditingId(null);
      } catch (error) {
        console.error('[useMessageActions] Error editing message:', error);
        // TODO: Revertir el cambio o mostrar error
      }
    },
    [taskId, encryptMessage, updateMessage, setEditingId]
  );

  /**
   * Elimina un mensaje con Optimistic UI
   */
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        // 1. Eliminar optimistamente del UI
        deleteMessage(taskId, messageId);

        // 2. Eliminar de Firebase
        await firebaseService.deleteMessage(taskId, messageId);
      } catch (error) {
        console.error('[useMessageActions] Error deleting message:', error);
        // TODO: Restaurar el mensaje o mostrar error
      }
    },
    [taskId, deleteMessage]
  );

  /**
   * Reintenta enviar un mensaje fallido
   */
  const handleRetryMessage = useCallback(
    async (message: Message) => {
      // 1. Limpiar estado de error y marcar como pending
      updateMessage(taskId, message.id, { 
        hasError: false, 
        isPending: true 
      });

      try {
        // 2. Reintentar envío
        const messageId = await firebaseService.sendMessage(taskId, {
          senderId: message.senderId,
          senderName: message.senderName,
          text: message.text,
          read: message.read,
          imageUrl: message.imageUrl,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          hours: message.hours,
          dateString: message.dateString,
          replyTo: message.replyTo,
          clientId: message.clientId,
        });

        // 3. Actualizar con ID real
        updateMessage(taskId, message.id, {
          id: messageId,
          isPending: false,
        });
      } catch (error) {
        console.error('[useMessageActions] Error retrying message:', error);
        // 4. Marcar como error nuevamente
        updateMessage(taskId, message.id, {
          isPending: false,
          hasError: true,
        });
      }
    },
    [taskId, updateMessage]
  );

  return {
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleRetryMessage,
    editingMessageId,
    replyingTo,
    setEditingId,
    setReplyingTo,
  };
};
