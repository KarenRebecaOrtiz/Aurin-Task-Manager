/**
 * ReactionsService
 *
 * Servicio para gestionar reacciones de mensajes en Firestore
 * Usa transacciones para garantizar consistencia de datos
 */

import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MessageReaction } from "../types";

class ReactionsService {
  /**
   * Añade o quita una reacción a un mensaje (toggle)
   */
  async toggleReaction(
    taskId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const messageRef = doc(db, `tasks/${taskId}/messages/${messageId}`);

    await runTransaction(db, async (transaction) => {
      const messageDoc = await transaction.get(messageRef);

      if (!messageDoc.exists()) {
        throw new Error("Message not found");
      }

      const currentReactions = (messageDoc.data().reactions || []) as MessageReaction[];
      const reactionIndex = currentReactions.findIndex((r) => r.emoji === emoji);

      let updatedReactions: MessageReaction[];

      if (reactionIndex >= 0) {
        // Reacción existe - toggle del usuario
        const reaction = currentReactions[reactionIndex];
        const userIndex = reaction.userIds.indexOf(userId);

        if (userIndex >= 0) {
          // Usuario ya reaccionó - remover
          reaction.userIds.splice(userIndex, 1);
          reaction.count = reaction.userIds.length;

          // Si no quedan usuarios, eliminar la reacción completa
          if (reaction.count === 0) {
            updatedReactions = currentReactions.filter((_, i) => i !== reactionIndex);
          } else {
            updatedReactions = [...currentReactions];
            updatedReactions[reactionIndex] = reaction;
          }
        } else {
          // Usuario no había reaccionado - añadir
          reaction.userIds.push(userId);
          reaction.count = reaction.userIds.length;
          updatedReactions = [...currentReactions];
          updatedReactions[reactionIndex] = reaction;
        }
      } else {
        // Nueva reacción
        updatedReactions = [
          ...currentReactions,
          {
            emoji,
            userIds: [userId],
            count: 1,
          },
        ];
      }

      transaction.update(messageRef, {
        reactions: updatedReactions,
      });
    });
  }
}

export const reactionsService = new ReactionsService();
