import { useChatStore } from '../stores/useChatStore';
import { useEffect } from 'react';

export const useChat = (chatId: string) => {
  // Get the state and actions from the Zustand store
  const { messages, isLoading, error, startListening, stopListening, sendMessage } = useChatStore();

  // Start and stop listening for messages when the component mounts and unmounts
  useEffect(() => {
    if (chatId) {
      startListening(chatId);
    }

    // Cleanup function to stop listening when the component unmounts or the chatId changes
    return () => {
      stopListening();
    };
  }, [chatId, startListening, stopListening]);

  // Return a clean interface for the UI component to use
  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
};
