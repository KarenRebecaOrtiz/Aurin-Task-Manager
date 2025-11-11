/**
 * Chat Store - Zustand State Management
 *
 * Store centralizado para el estado del chat con soporte multi-task.
 * Permite cambiar entre diferentes tareas sin perder el estado de mensajes.
 *
 * Características:
 * - Soporte multi-task (messagesByTask)
 * - Paginación por tarea
 * - Estados UI (editing, replying)
 * - Optimistic updates
 *
 * @see CHAT_DATA_FLOW_MIGRATION.md para detalles del flujo
 */

import { create } from 'zustand';
import type { Message, ChatStore, TaskMessages } from '../types';

const INITIAL_TASK_STATE: TaskMessages = {
  messages: [],
  hasMore: true,
  isLoading: false,
  lastDoc: null,
};

export const useChatStore = create<ChatStore>((set, get) => ({
  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  messagesByTask: {},
  currentTaskId: null,
  editingMessageId: null,
  replyingTo: null,

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  setCurrentTask: (taskId: string) => {
    set({ currentTaskId: taskId });

    // Initialize task if not exists
    const state = get();
    if (!state.messagesByTask[taskId]) {
      get().initializeTask(taskId);
    }
  },

  initializeTask: (taskId: string) =>
    set((state) => ({
      messagesByTask: {
        ...state.messagesByTask,
        [taskId]: { ...INITIAL_TASK_STATE },
      },
    })),

  // ============================================================================
  // MESSAGE CRUD OPERATIONS
  // ============================================================================

  addMessage: (taskId: string, message: Message) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) {
        console.warn(`[ChatStore] Task ${taskId} not initialized, initializing now`);
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: {
              ...INITIAL_TASK_STATE,
              messages: [message],
            },
          },
        };
      }

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages: [...taskData.messages, message],
          },
        },
      };
    }),

  updateMessage: (taskId: string, messageId: string, updates: Partial<Message>) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) {
        console.warn(`[ChatStore] Task ${taskId} not found for update`);
        return state;
      }

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages: taskData.messages.map((msg) =>
              msg.id === messageId || msg.clientId === messageId
                ? { ...msg, ...updates }
                : msg
            ),
          },
        },
      };
    }),

  deleteMessage: (taskId: string, messageId: string) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) {
        console.warn(`[ChatStore] Task ${taskId} not found for delete`);
        return state;
      }

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages: taskData.messages.filter((msg) => msg.id !== messageId),
          },
        },
      };
    }),

  setMessages: (taskId: string, messages: Message[]) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) {
        console.warn(`[ChatStore] Task ${taskId} not initialized, initializing with messages`);
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: {
              ...INITIAL_TASK_STATE,
              messages,
            },
          },
        };
      }

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages,
          },
        },
      };
    }),

  prependMessages: (taskId: string, messages: Message[]) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) {
        console.warn(`[ChatStore] Task ${taskId} not found for prepend`);
        return state;
      }

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages: [...messages, ...taskData.messages],
          },
        },
      };
    }),

  // ============================================================================
  // PAGINATION CONTROL
  // ============================================================================

  setHasMore: (taskId: string, hasMore: boolean) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) return state;

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            hasMore,
          },
        },
      };
    }),

  setIsLoading: (taskId: string, isLoading: boolean) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) return state;

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            isLoading,
          },
        },
      };
    }),

  setLastDoc: (taskId: string, lastDoc: any) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) return state;

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            lastDoc,
          },
        },
      };
    }),

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  setEditingId: (id: string | null) =>
    set({
      editingMessageId: id,
      replyingTo: null, // No se puede editar y responder al mismo tiempo
    }),

  setReplyingTo: (message: Message | null) =>
    set({
      replyingTo: message,
      editingMessageId: null, // No se puede editar y responder al mismo tiempo
    }),

  clearActions: () =>
    set({
      replyingTo: null,
      editingMessageId: null,
    }),

  // ============================================================================
  // GETTERS (Convenience methods)
  // ============================================================================

  getCurrentMessages: () => {
    const state = get();
    if (!state.currentTaskId) return [];
    return state.messagesByTask[state.currentTaskId]?.messages || [];
  },

  getCurrentHasMore: () => {
    const state = get();
    if (!state.currentTaskId) return false;
    return state.messagesByTask[state.currentTaskId]?.hasMore ?? false;
  },

  getCurrentIsLoading: () => {
    const state = get();
    if (!state.currentTaskId) return false;
    return state.messagesByTask[state.currentTaskId]?.isLoading ?? false;
  },
}));

/**
 * Selector helpers para performance
 * Uso: const messages = useChatStore(selectCurrentMessages)
 */
export const selectCurrentMessages = (state: ChatStore) => state.getCurrentMessages();
export const selectCurrentHasMore = (state: ChatStore) => state.getCurrentHasMore();
export const selectCurrentIsLoading = (state: ChatStore) => state.getCurrentIsLoading();
export const selectReplyingTo = (state: ChatStore) => state.replyingTo;
export const selectEditingMessageId = (state: ChatStore) => state.editingMessageId;

/**
 * Selector para mensajes de una tarea específica
 */
export const selectTaskMessages = (taskId: string) => (state: ChatStore) =>
  state.messagesByTask[taskId]?.messages || [];
