import { create } from 'zustand';
import { Message } from '@/types';

interface PrivateMessageState {
  messages: Message[];
  optimisticMessages: { [clientId: string]: Message };
  isLoading: boolean;
  isSending: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

interface PrivateMessageActions {
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (clientId: string, updates: Partial<Message>) => void;
  removeOptimisticMessage: (clientId: string) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  // Nueva función para actualizar mensajes por messageId (como dataStore)
  updateMessageById: (messageId: string, updates: Partial<Message>) => void;
}

const initialState: PrivateMessageState = {
  messages: [],
  optimisticMessages: {},
  isLoading: false,
  isSending: false,
  hasError: false,
  errorMessage: null,
};

export const usePrivateMessageStore = create<PrivateMessageState & PrivateMessageActions>()((set) => ({
  ...initialState,
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(msg => msg.id !== messageId)
  })),
  
  // Nueva función para actualizar mensajes por messageId (como dataStore)
  updateMessageById: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  addOptimisticMessage: (message) => set((state) => ({
    optimisticMessages: {
      ...state.optimisticMessages,
      [message.clientId]: message
    }
  })),
  
  updateOptimisticMessage: (clientId, updates) => set((state) => ({
    optimisticMessages: {
      ...state.optimisticMessages,
      [clientId]: {
        ...state.optimisticMessages[clientId],
        ...updates
      }
    }
  })),
  
  removeOptimisticMessage: (clientId) => set((state) => {
    const newOptimisticMessages = { ...state.optimisticMessages };
    delete newOptimisticMessages[clientId];
    return { optimisticMessages: newOptimisticMessages };
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setSending: (sending) => set({ isSending: sending }),
  
  setError: (error) => set({ 
    hasError: !!error, 
    errorMessage: error 
  }),
  
  clearError: () => set({ 
    hasError: false, 
    errorMessage: null 
  }),
  
  reset: () => set(initialState),
})); 