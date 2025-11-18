/**
 * useScrollToMessage Hook
 *
 * Hook para scrollear a un mensaje específico (útil para "scroll to reply")
 */

import { useState, useCallback } from "react";

export const useScrollToMessage = () => {
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  const scrollToMessage = useCallback((messageId: string) => {
    setTargetMessageId(messageId);

    // Limpiar después de 2s (tiempo suficiente para highlight)
    setTimeout(() => {
      setTargetMessageId(null);
    }, 2000);
  }, []);

  return {
    targetMessageId,
    scrollToMessage,
  };
};
