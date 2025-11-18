/**
 * useMessageReactions Hook
 *
 * Hook para gestionar reacciones de mensajes
 */

import { useCallback } from "react";
import { reactionsService } from "../services/reactionsService";

interface UseMessageReactionsProps {
  taskId: string;
  userId: string;
}

export const useMessageReactions = ({ taskId, userId }: UseMessageReactionsProps) => {
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await reactionsService.toggleReaction(taskId, messageId, emoji, userId);
      } catch (error) {
        console.error("[useMessageReactions] Error toggling reaction:", error);
        throw error;
      }
    },
    [taskId, userId]
  );

  return {
    toggleReaction,
  };
};
