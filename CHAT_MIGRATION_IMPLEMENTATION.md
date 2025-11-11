# Plan de Implementación: Migración ChatSidebar Modularizado

## 🎯 Objetivo
Implementar la conexión de datos del módulo modularizado en `/chatsidebarMODULARIZED` con las fuentes de datos existentes.

---

## 📐 PASO 1: Actualizar chatStore.ts para Multi-Task

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/stores/chatStore.ts`

```typescript
import { create } from "zustand";
import type { Message } from "../types/message.types";
import type { QueryDocumentSnapshot } from "firebase/firestore";

interface TaskMessages {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

interface ChatState {
  // Multi-task support
  messagesByTask: Record<string, TaskMessages>;
  currentTaskId: string | null;
  
  // UI state
  editingMessageId: string | null;
  replyingTo: Message | null;
}

interface ChatActions {
  // Task management
  setCurrentTask: (taskId: string) => void;
  initializeTask: (taskId: string) => void;
  
  // Message CRUD
  addMessage: (taskId: string, message: Message) => void;
  updateMessage: (taskId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (taskId: string, messageId: string) => void;
  setMessages: (taskId: string, messages: Message[]) => void;
  prependMessages: (taskId: string, messages: Message[]) => void;
  
  // Pagination
  setHasMore: (taskId: string, hasMore: boolean) => void;
  setIsLoading: (taskId: string, isLoading: boolean) => void;
  setLastDoc: (taskId: string, lastDoc: QueryDocumentSnapshot | null) => void;
  
  // UI actions
  setEditingId: (id: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  clearActions: () => void;
  
  // Getters
  getCurrentMessages: () => Message[];
  getCurrentHasMore: () => boolean;
  getCurrentIsLoading: () => boolean;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messagesByTask: {},
  currentTaskId: null,
  editingMessageId: null,
  replyingTo: null,

  // Task management
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
        [taskId]: {
          messages: [],
          hasMore: true,
          isLoading: false,
          lastDoc: null,
        },
      },
    })),

  // Message CRUD
  addMessage: (taskId: string, message: Message) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) return state;

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
      if (!taskData) return state;

      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: {
            ...taskData,
            messages: taskData.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          },
        },
      };
    }),

  deleteMessage: (taskId: string, messageId: string) =>
    set((state) => {
      const taskData = state.messagesByTask[taskId];
      if (!taskData) return state;

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
      if (!taskData) return state;

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
      if (!taskData) return state;

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

  // Pagination
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

  setLastDoc: (taskId: string, lastDoc: QueryDocumentSnapshot | null) =>
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

  // UI actions
  setEditingId: (id: string | null) =>
    set({
      editingMessageId: id,
      replyingTo: null,
    }),

  setReplyingTo: (message: Message | null) =>
    set({
      replyingTo: message,
      editingMessageId: null,
    }),

  clearActions: () =>
    set({
      replyingTo: null,
      editingMessageId: null,
    }),

  // Getters
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
```

---

## 📐 PASO 2: Crear chatSidebarStore.ts

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/stores/chatSidebarStore.ts`

```typescript
import { create } from "zustand";

// Importar Task type del proyecto principal
// TODO: Ajustar path según estructura real
interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  project: string;
  AssignedTo: string[];
  LeadedBy: string[];
  CreatedBy: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface ChatSidebarState {
  currentTask: Task | null;
  clientName: string;
  isOpen: boolean;
}

interface ChatSidebarActions {
  setTask: (task: Task, clientName: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  clear: () => void;
}

type ChatSidebarStore = ChatSidebarState & ChatSidebarActions;

export const useChatSidebarStore = create<ChatSidebarStore>((set) => ({
  currentTask: null,
  clientName: '',
  isOpen: false,

  setTask: (task, clientName) =>
    set({
      currentTask: task,
      clientName,
    }),

  setIsOpen: (isOpen) => set({ isOpen }),

  clear: () =>
    set({
      currentTask: null,
      clientName: '',
      isOpen: false,
    }),
}));
```

---

## 📐 PASO 3: Crear useAuth.ts

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/hooks/useAuth.ts`

```typescript
import { useUser } from "@clerk/nextjs";
// TODO: Importar AuthContext del proyecto principal
// import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useChatAuth() {
  const { user, isLoaded } = useUser();
  // const { isAdmin, isLoading: isAuthLoading } = useAuthContext();

  return {
    userId: user?.id || '',
    userName: user?.firstName || user?.fullName || 'Usuario',
    userAvatar: user?.imageUrl || '',
    userEmail: user?.primaryEmailAddress?.emailAddress || '',
    isLoaded,
    // isAdmin,
    // isAuthLoading,
  };
}
```

---

## 📐 PASO 4: Crear useEncryption.ts

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/hooks/useEncryption.ts`

```typescript
import { useCallback } from "react";
import CryptoJS from "crypto-js";

// Clave base (en producción, usar variable de entorno)
const BASE_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key';

export function useEncryption(taskId: string) {
  // Generar clave única por tarea
  const getTaskKey = useCallback(() => {
    return CryptoJS.SHA256(`${BASE_KEY}-${taskId}`).toString();
  }, [taskId]);

  const encryptMessage = useCallback(
    async (text: string): Promise<string> => {
      try {
        const key = getTaskKey();
        const encrypted = CryptoJS.AES.encrypt(text, key).toString();
        return encrypted;
      } catch (error) {
        console.error('[Encryption] Error encrypting message:', error);
        throw error;
      }
    },
    [getTaskKey]
  );

  const decryptMessage = useCallback(
    async (encryptedText: string): Promise<string> => {
      try {
        const key = getTaskKey();
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
        const text = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!text) {
          throw new Error('Decryption failed');
        }
        
        return text;
      } catch (error) {
        console.error('[Encryption] Error decrypting message:', error);
        return '[Mensaje encriptado]';
      }
    },
    [getTaskKey]
  );

  const decryptBatch = useCallback(
    async (messages: Array<{ text: string | null }>): Promise<Array<{ text: string | null }>> => {
      return Promise.all(
        messages.map(async (msg) => ({
          ...msg,
          text: msg.text ? await decryptMessage(msg.text) : null,
        }))
      );
    },
    [decryptMessage]
  );

  return {
    encryptMessage,
    decryptMessage,
    decryptBatch,
  };
}
```

---

## 📐 PASO 5: Actualizar useMessagePagination.ts

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/hooks/useMessagePagination.ts`

```typescript
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useChatStore } from "../stores/chatStore";
import { useEncryption } from "./useEncryption";
// TODO: Importar db del proyecto principal
// import { db } from '@/lib/firebase';

export function useMessagePagination(taskId: string, pageSize = 10) {
  const { decryptMessage, decryptBatch } = useEncryption(taskId);
  const chatStore = useChatStore();
  const isInitializedRef = useRef(false);

  // Get current task data from store
  const taskData = chatStore.messagesByTask[taskId];
  const messages = taskData?.messages || [];
  const hasMore = taskData?.hasMore ?? true;
  const isLoadingMore = taskData?.isLoading ?? false;
  const lastDoc = taskData?.lastDoc;

  // Initialize task in store
  useEffect(() => {
    if (!taskId || isInitializedRef.current) return;
    
    chatStore.initializeTask(taskId);
    chatStore.setCurrentTask(taskId);
    isInitializedRef.current = true;
  }, [taskId, chatStore]);

  // Real-time listener for new messages
  useEffect(() => {
    if (!taskId) return;

    // TODO: Reemplazar con db real
    const db = {} as any;
    
    const messagesRef = collection(db, 'tasks', taskId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Decrypt messages
        const decrypted = await decryptBatch(docs);

        // Update store (reverse to show oldest first)
        chatStore.setMessages(taskId, decrypted.reverse());
        chatStore.setLastDoc(taskId, snapshot.docs[snapshot.docs.length - 1]);
      } catch (error) {
        console.error('[MessagePagination] Error in real-time listener:', error);
      }
    });

    return () => unsubscribe();
  }, [taskId, pageSize, decryptBatch, chatStore]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDoc) {
      console.log('[MessagePagination] Cannot load more:', { hasMore, isLoadingMore, hasLastDoc: !!lastDoc });
      return;
    }

    chatStore.setIsLoading(taskId, true);

    try {
      // TODO: Reemplazar con db real
      const db = {} as any;
      
      const messagesRef = collection(db, 'tasks', taskId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Decrypt messages
      const decrypted = await decryptBatch(docs);

      // Prepend older messages
      chatStore.prependMessages(taskId, decrypted.reverse());
      chatStore.setLastDoc(taskId, snapshot.docs[snapshot.docs.length - 1]);
      chatStore.setHasMore(taskId, docs.length === pageSize);
    } catch (error) {
      console.error('[MessagePagination] Error loading more messages:', error);
    } finally {
      chatStore.setIsLoading(taskId, false);
    }
  }, [taskId, pageSize, hasMore, isLoadingMore, lastDoc, decryptBatch, chatStore]);

  return {
    messages,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  };
}
```

---

## 📐 PASO 6: Actualizar useMessageActions.ts

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/hooks/useMessageActions.ts`

```typescript
"use client";

import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useChatStore } from "../stores/chatStore";
import { useEncryption } from "./useEncryption";
import type { Message } from "../types/message.types";
// TODO: Importar db del proyecto principal
// import { db } from '@/lib/firebase';

export function useMessageActions(taskId: string) {
  const { encryptMessage } = useEncryption(taskId);
  const chatStore = useChatStore();
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      setIsSending(true);
      const clientId = crypto.randomUUID();

      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${clientId}`,
        senderId: messageData.senderId || '',
        senderName: messageData.senderName || 'Usuario',
        text: messageData.text || null,
        timestamp: Timestamp.now(),
        isPending: true,
        hasError: false,
        ...messageData,
      };

      chatStore.addMessage(taskId, optimisticMessage);

      try {
        // Encrypt text
        const encryptedText = messageData.text
          ? await encryptMessage(messageData.text)
          : null;

        // TODO: Reemplazar con db real
        const db = {} as any;

        // Send to Firestore
        const messagesRef = collection(db, 'tasks', taskId, 'messages');
        const docRef = await addDoc(messagesRef, {
          ...messageData,
          text: encryptedText,
          timestamp: serverTimestamp(),
          read: false,
        });

        // Update with real ID
        chatStore.updateMessage(taskId, `temp-${clientId}`, {
          id: docRef.id,
          isPending: false,
        });
      } catch (error) {
        console.error('[MessageActions] Error sending message:', error);
        
        // Mark as error
        chatStore.updateMessage(taskId, `temp-${clientId}`, {
          hasError: true,
          isPending: false,
        });
        
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [taskId, encryptMessage, chatStore]
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      try {
        const encryptedText = await encryptMessage(newText);

        // TODO: Reemplazar con db real
        const db = {} as any;

        const messageRef = doc(db, 'tasks', taskId, 'messages', messageId);
        await updateDoc(messageRef, {
          text: encryptedText,
          edited: true,
          editedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('[MessageActions] Error editing message:', error);
        throw error;
      }
    },
    [taskId, encryptMessage]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        // TODO: Reemplazar con db real
        const db = {} as any;

        const messageRef = doc(db, 'tasks', taskId, 'messages', messageId);
        await deleteDoc(messageRef);

        // Update store
        chatStore.deleteMessage(taskId, messageId);
      } catch (error) {
        console.error('[MessageActions] Error deleting message:', error);
        throw error;
      }
    },
    [taskId, chatStore]
  );

  const sendTimeMessage = useCallback(
    async (
      userId: string,
      userName: string,
      hours: number,
      timeEntry: string,
      dateString?: string,
      comment?: string
    ) => {
      try {
        // TODO: Reemplazar con db real
        const db = {} as any;

        const messagesRef = collection(db, 'tasks', taskId, 'messages');
        await addDoc(messagesRef, {
          senderId: userId,
          senderName: userName,
          text: comment || null,
          hours,
          dateString,
          timestamp: serverTimestamp(),
          read: false,
        });
      } catch (error) {
        console.error('[MessageActions] Error sending time message:', error);
        throw error;
      }
    },
    [taskId]
  );

  return {
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTimeMessage,
  };
}
```

---

## 🔧 PASO 7: Integración en ChatSidebar.tsx

**Archivo:** `/chatsidebarMODULARIZED/src/features/chat/ChatSidebar.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { useChatStore } from "./stores/chatStore";
import { useChatSidebarStore } from "./stores/chatSidebarStore";
import { useChatAuth } from "./hooks/useAuth";
import { useMessagePagination } from "./hooks/useMessagePagination";
import { useMessageActions } from "./hooks/useMessageActions";
import { ChatHeader } from "./organisms/ChatHeader";
import { MessageList } from "./organisms/MessageList";
import { InputChat } from "./organisms/InputChat";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Task y clientName se obtienen del store
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const { userId, userName, userAvatar } = useChatAuth();
  const { currentTask, clientName } = useChatSidebarStore();
  const chatStore = useChatStore();

  const taskId = currentTask?.id || '';

  // Hooks de datos
  const { messages, loadMoreMessages, hasMore, isLoadingMore } = useMessagePagination(taskId, 10);
  const { isSending, sendMessage, editMessage, deleteMessage, sendTimeMessage } = useMessageActions(taskId);

  // Set current task when sidebar opens
  useEffect(() => {
    if (isOpen && taskId) {
      chatStore.setCurrentTask(taskId);
    }
  }, [isOpen, taskId, chatStore]);

  if (!currentTask) {
    return null;
  }

  return (
    <div className="chat-sidebar" data-open={isOpen}>
      <ChatHeader
        task={currentTask}
        clientName={clientName}
        onClose={onClose}
      />

      <MessageList
        messages={messages}
        userId={userId}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMoreMessages}
        onEdit={(id, text) => {
          chatStore.setEditingId(id);
        }}
        onDelete={deleteMessage}
        onReply={(message) => {
          chatStore.setReplyingTo(message);
        }}
      />

      <InputChat
        taskId={taskId}
        userId={userId}
        userName={userName}
        onSendMessage={sendMessage}
        isSending={isSending}
        editingMessageId={chatStore.editingMessageId}
        replyingTo={chatStore.replyingTo}
        onCancelEdit={() => chatStore.setEditingId(null)}
        onCancelReply={() => chatStore.setReplyingTo(null)}
        onEditMessage={editMessage}
      />
    </div>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Stores (Prioridad Alta)
- [ ] Actualizar `chatStore.ts` con soporte multi-task
- [ ] Crear `chatSidebarStore.ts` para estado del sidebar
- [ ] Crear `timerStore.ts` para cronómetro

### Fase 2: Hooks de Datos (Prioridad Alta)
- [ ] Crear `useAuth.ts` wrapper de Clerk
- [ ] Crear `useEncryption.ts` con AES
- [ ] Actualizar `useMessagePagination.ts` con real-time
- [ ] Actualizar `useMessageActions.ts` con optimistic UI

### Fase 3: Integración Firebase (Prioridad Alta)
- [ ] Conectar `db` de Firebase en todos los hooks
- [ ] Probar real-time listeners
- [ ] Probar paginación
- [ ] Probar optimistic updates

### Fase 4: Hooks Adicionales (Prioridad Media)
- [ ] Crear `useTimer.ts` con persistencia
- [ ] Crear `useMessageDrag.ts` para drag-to-reply
- [ ] Crear `useGeminiSummary.ts` para IA

### Fase 5: Testing (Prioridad Alta)
- [ ] Test: Envío de mensaje
- [ ] Test: Paginación
- [ ] Test: Edición/eliminación
- [ ] Test: Real-time updates
- [ ] Test: Encriptación/desencriptación
- [ ] Test: Multi-task (cambiar entre tareas)

---

## 🚀 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Día 1**: Stores (chatStore multi-task + chatSidebarStore)
2. **Día 2**: Hooks básicos (useAuth + useEncryption)
3. **Día 3**: useMessagePagination con real-time
4. **Día 4**: useMessageActions con optimistic UI
5. **Día 5**: Integración en ChatSidebar.tsx
6. **Día 6**: Testing y debugging
7. **Día 7**: Hooks adicionales (timer, drag, IA)

---

## 📝 NOTAS IMPORTANTES

1. **Reemplazar `db`**: Todos los hooks tienen `const db = {} as any` que debe reemplazarse con la instancia real de Firebase
2. **Importar tipos**: Ajustar imports de Task, User, etc. según estructura del proyecto principal
3. **Variables de entorno**: Configurar `NEXT_PUBLIC_ENCRYPTION_KEY` para encriptación
4. **Testing**: Probar cada hook de forma aislada antes de integrar
5. **Performance**: Monitorear re-renders con React DevTools
