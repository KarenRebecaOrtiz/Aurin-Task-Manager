import { create } from "zustand"
import type { Message } from "../types/message.types"

interface ChatState {
  messages: Message[]
  editingMessageId: string | null
  replyingTo: Message | null
  hasMoreMessages: boolean
  isLoadingMore: boolean
}

interface ChatActions {
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  setEditingId: (id: string | null) => void
  setReplyingTo: (message: Message | null) => void
  setMessages: (messages: Message[]) => void
  setHasMoreMessages: (hasMore: boolean) => void
  setIsLoadingMore: (isLoading: boolean) => void
  clearActions: () => void
}

type ChatStore = ChatState & ChatActions

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  messages: [],
  editingMessageId: null,
  replyingTo: null,
  hasMoreMessages: true,
  isLoadingMore: false,

  // Actions
  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id: string, updates: Partial<Message>) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    })),

  deleteMessage: (id: string) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),

  setEditingId: (id: string | null) =>
    set({
      editingMessageId: id,
      replyingTo: null, // Can't edit and reply at the same time
    }),

  setReplyingTo: (message: Message | null) =>
    set({
      replyingTo: message,
      editingMessageId: null, // Can't edit and reply at the same time
    }),

  setMessages: (messages: Message[]) => set({ messages }),

  setHasMoreMessages: (hasMore: boolean) => set({ hasMoreMessages: hasMore }),

  setIsLoadingMore: (isLoading: boolean) => set({ isLoadingMore: isLoading }),

  clearActions: () =>
    set({
      replyingTo: null,
      editingMessageId: null,
    }),
}))
