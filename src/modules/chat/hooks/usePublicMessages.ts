/**
 * usePublicMessages Hook
 *
 * Hook para manejar mensajes en vistas públicas compartidas.
 * Soporta invitados sin autenticación completa.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { publicChatService } from '../services/publicChatService';
import type { Message } from '../types';

interface UsePublicMessagesOptions {
  taskId: string;
  enabled?: boolean; // Permite deshabilitar la carga (ej: comentarios deshabilitados)
  messageLimit?: number;
}

interface UsePublicMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (guestName: string, text: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string, userId?: string) => Promise<boolean>;
  isSending: boolean;
}

export function usePublicMessages({
  taskId,
  enabled = true,
  messageLimit = 100,
}: UsePublicMessagesOptions): UsePublicMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!enabled || !taskId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = publicChatService.listenToMessages(
      taskId,
      (newMessages) => {
        setMessages(newMessages);
        setIsLoading(false);
      },
      (err) => {
        console.error('[usePublicMessages] Error listening to messages:', err);
        setError('Error al cargar mensajes');
        setIsLoading(false);
      },
      messageLimit
    );

    return () => {
      unsubscribe();
    };
  }, [taskId, enabled, messageLimit]);

  // Enviar mensaje como invitado
  const sendMessage = useCallback(
    async (guestName: string, text: string): Promise<boolean> => {
      // Validar nombre
      const nameValidation = publicChatService.validateGuestName(guestName);
      if (!nameValidation.valid) {
        setError(nameValidation.error || 'Nombre inválido');
        return false;
      }

      // Validar texto
      const textValidation = publicChatService.validateMessageText(text);
      if (!textValidation.valid) {
        setError(textValidation.error || 'Mensaje inválido');
        return false;
      }

      setIsSending(true);
      setError(null);

      const result = await publicChatService.sendGuestMessage(taskId, guestName, text);

      setIsSending(false);

      if (!result.success) {
        setError(result.error || 'Error al enviar mensaje');
        return false;
      }

      return true;
    },
    [taskId]
  );

  // Toggle reacción
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, userId: string = 'guest'): Promise<boolean> => {
      const result = await publicChatService.toggleReaction(taskId, messageId, emoji, userId);

      if (!result.success) {
        setError(result.error || 'Error al agregar reacción');
        return false;
      }

      return true;
    },
    [taskId]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    toggleReaction,
    isSending,
  };
}
