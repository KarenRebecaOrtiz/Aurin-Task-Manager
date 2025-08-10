// src/hooks/useGeminiContext.ts
import { useCallback } from 'react';
import { useChunkStore } from '@/stores/chunkStore';
import { useSummaryStore } from '@/stores/summaryStore';

export const useGeminiContext = (taskId: string) => {
  const { getChunks } = useChunkStore();
  const { summaries } = useSummaryStore();

  const getContext = useCallback(() => {
    const chunks = getChunks(taskId);
    const summary = summaries[taskId];
    
    return {
      chunks: chunks || [],
      summary: summary?.text || null,
      lastFetched: chunks ? Date.now() : 0,
    };
  }, [taskId, getChunks, summaries]);

  const getContextMessages = useCallback((maxMessages: number = 20) => {
    const chunks = getChunks(taskId);
    if (!chunks) return [];
    
    // Flatten chunks y limitar mensajes
    const allMessages = chunks.flat();
    return allMessages.slice(-maxMessages);
  }, [taskId, getChunks]);

  const getContextText = useCallback((maxMessages: number = 20) => {
    const messages = getContextMessages(maxMessages);
    return messages.map(msg => msg.text || '').join('\n');
  }, [getContextMessages]);

  return {
    getContext,
    getContextMessages,
    getContextText,
  };
};
