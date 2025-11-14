import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { Message } from '../types';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentChatId: string | null;
  
  // Actions
  startListening: (chatId: string) => void;
  stopListening: () => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentChatId: null,
  
  startListening: (chatId) => {
    const { currentChatId, stopListening } = get();
    if (currentChatId) {
      stopListening(); // Stop listening to the previous chat
    }

    set({ isLoading: true, currentChatId: chatId, messages: [], error: null });

    chatService.listenForMessages(chatId, (newMessages) => {
      set({ messages: newMessages, isLoading: false });
    }, (errorMessage) => {
      set({ error: errorMessage, isLoading: false });
    });
  },

  stopListening: () => {
    const { currentChatId } = get();
    if (currentChatId) {
      chatService.stopListening(currentChatId);
      set({ currentChatId: null });
    }
  },

  sendMessage: async (content) => {
    const { currentChatId } = get();
    if (!currentChatId) {
      console.error("Cannot send message without a chat ID.");
      return;
    }

    try {
      await chatService.sendMessage(currentChatId, content);
    } catch (error) {
      set({ error: 'Failed to send message.' });
    }
  },
}));
