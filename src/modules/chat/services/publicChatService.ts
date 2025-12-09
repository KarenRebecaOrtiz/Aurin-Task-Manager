/**
 * Public Chat Service
 *
 * Servicio para manejar mensajes en chats públicos compartidos.
 * Los invitados pueden enviar mensajes sin autenticación completa.
 *
 * Características:
 * - Envío de mensajes como invitado (guest)
 * - Escucha real-time de mensajes
 * - Reacciones a mensajes
 * - No requiere autenticación Firebase Auth
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '../types';
import { reactionService } from './reactionService';

export class PublicChatService {
  /**
   * Envía un mensaje como invitado
   * No requiere autenticación completa
   */
  async sendGuestMessage(
    taskId: string,
    guestName: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const messagesRef = collection(db, `tasks/${taskId}/messages`);

      const docRef = await addDoc(messagesRef, {
        senderId: 'guest', // ID especial para invitados
        senderName: guestName.trim(),
        text: text.trim(),
        timestamp: serverTimestamp(),
        read: false,
        readBy: [], // Inicializar array vacío
        reactions: [], // Inicializar array vacío
        clientId: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        // Guest messages no tienen encriptación
        encrypted: null,
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        filePath: null,
        replyTo: null,
      });

      return { success: true, messageId: docRef.id };
    } catch (error) {
      console.error('[PublicChatService] Error sending guest message:', error);
      return {
        success: false,
        error: 'Error al enviar mensaje. Intenta de nuevo.',
      };
    }
  }

  /**
   * Escucha mensajes en tiempo real
   * Compatible con invitados y usuarios autenticados
   */
  listenToMessages(
    taskId: string,
    onMessagesUpdate: (messages: Message[]) => void,
    onError?: (error: Error) => void,
    messageLimit = 100
  ): Unsubscribe {
    const messagesRef = collection(db, `tasks/${taskId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(messageLimit));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            senderId: data.senderId || 'unknown',
            senderName: data.senderName || data.guestName || 'Anónimo',
            text: data.text || null,
            timestamp: data.timestamp,
            read: data.read || false,
            readBy: data.readBy || [],
            reactions: data.reactions || [],
            clientId: data.clientId || doc.id,
            imageUrl: data.imageUrl || null,
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || null,
            filePath: data.filePath || null,
            replyTo: data.replyTo || null,
            hours: data.hours,
            dateString: data.dateString,
          } as Message);
        });

        onMessagesUpdate(messages);
      },
      (error) => {
        console.error('[PublicChatService] Error listening to messages:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  }

  /**
   * Agrega o quita una reacción (delegado a reactionService)
   * Los invitados usan 'guest' como userId
   */
  async toggleReaction(
    taskId: string,
    messageId: string,
    emoji: string,
    userId: string = 'guest'
  ): Promise<{ success: boolean; error?: string }> {
    return reactionService.toggleReaction(taskId, messageId, emoji, userId);
  }

  /**
   * Marca un mensaje como leído (opcional para invitados)
   */
  async markAsRead(
    taskId: string,
    messageId: string,
    userId: string = 'guest'
  ): Promise<{ success: boolean; error?: string }> {
    return reactionService.markAsRead(taskId, messageId, userId);
  }

  /**
   * Valida el nombre del invitado
   */
  validateGuestName(name: string): { valid: boolean; error?: string } {
    const trimmed = name.trim();

    if (!trimmed) {
      return { valid: false, error: 'El nombre no puede estar vacío' };
    }

    if (trimmed.length < 2) {
      return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'El nombre no puede tener más de 50 caracteres' };
    }

    return { valid: true };
  }

  /**
   * Valida el contenido del mensaje
   */
  validateMessageText(text: string): { valid: boolean; error?: string } {
    const trimmed = text.trim();

    if (!trimmed) {
      return { valid: false, error: 'El mensaje no puede estar vacío' };
    }

    if (trimmed.length > 2000) {
      return { valid: false, error: 'El mensaje no puede tener más de 2000 caracteres' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const publicChatService = new PublicChatService();
