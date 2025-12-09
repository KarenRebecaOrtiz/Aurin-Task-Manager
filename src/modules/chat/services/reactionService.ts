/**
 * Reaction Service
 *
 * Servicio para manejar reacciones a mensajes en Firebase.
 * Sigue el patrón modular del firebaseService existente.
 */

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MessageReaction } from '../types';

export class ReactionService {
  /**
   * Agrega o quita una reacción de un mensaje
   * Si el usuario ya reaccionó con ese emoji, lo quita. Si no, lo agrega.
   */
  async toggleReaction(
    taskId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return { success: false, error: 'Mensaje no encontrado' };
      }

      const messageData = messageSnap.data();
      const reactions = (messageData.reactions || []) as MessageReaction[];

      // Buscar si ya existe una reacción con este emoji
      const existingReactionIndex = reactions.findIndex((r) => r.emoji === emoji);

      if (existingReactionIndex >= 0) {
        // La reacción existe
        const existingReaction = reactions[existingReactionIndex];
        const userHasReacted = existingReaction.userIds.includes(userId);

        if (userHasReacted) {
          // Quitar el userId del array
          const updatedUserIds = existingReaction.userIds.filter((id) => id !== userId);

          if (updatedUserIds.length === 0) {
            // Si no quedan usuarios, eliminar la reacción completa
            reactions.splice(existingReactionIndex, 1);
          } else {
            // Actualizar la reacción con el userId removido
            reactions[existingReactionIndex] = {
              emoji,
              userIds: updatedUserIds,
              count: updatedUserIds.length,
            };
          }
        } else {
          // Agregar el userId
          reactions[existingReactionIndex] = {
            emoji,
            userIds: [...existingReaction.userIds, userId],
            count: existingReaction.count + 1,
          };
        }
      } else {
        // No existe, crear nueva reacción
        reactions.push({
          emoji,
          userIds: [userId],
          count: 1,
        });
      }

      // Actualizar el documento con el array completo de reacciones
      await updateDoc(messageRef, {
        reactions,
      });

      return { success: true };
    } catch (error) {
      console.error('[ReactionService] Error toggling reaction:', error);
      return {
        success: false,
        error: 'Error al actualizar reacción',
      };
    }
  }

  /**
   * Obtiene las reacciones de un mensaje
   */
  async getReactions(
    taskId: string,
    messageId: string
  ): Promise<{ success: boolean; reactions?: MessageReaction[]; error?: string }> {
    try {
      const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return { success: false, error: 'Mensaje no encontrado' };
      }

      const messageData = messageSnap.data();
      const reactions = (messageData.reactions || []) as MessageReaction[];

      return { success: true, reactions };
    } catch (error) {
      console.error('[ReactionService] Error getting reactions:', error);
      return {
        success: false,
        error: 'Error al obtener reacciones',
      };
    }
  }

  /**
   * Marca un mensaje como leído por un usuario
   * Agrega el userId al array readBy si no existe
   */
  async markAsRead(
    taskId: string,
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const messageRef = doc(db, `tasks/${taskId}/messages`, messageId);

      // Usar arrayUnion para agregar userId solo si no existe
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
        read: true, // Mantener compatibilidad con campo legacy
      });

      return { success: true };
    } catch (error) {
      console.error('[ReactionService] Error marking message as read:', error);
      return {
        success: false,
        error: 'Error al marcar mensaje como leído',
      };
    }
  }

  /**
   * Verifica si todos los participantes han leído un mensaje
   */
  isReadByAll(message: { readBy?: string[] }, participantIds: string[]): boolean {
    if (!message.readBy || message.readBy.length === 0) {
      return false;
    }

    // Verificar que todos los participantes (excepto el sender) han leído
    return participantIds.every((id) => message.readBy?.includes(id));
  }
}

// Singleton instance
export const reactionService = new ReactionService();
