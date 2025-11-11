// src/stores/dataStore.ts
import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { useShallow } from 'zustand/react/shallow';

// Interfaces
interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount?: number;
  projects?: string[];
  createdBy?: string;
  createdAt?: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
  online?: boolean;
  lastActive?: string;
  tabCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
}

interface DataStore {
  // Messages
  messages: { [key: string]: Message[] };
  addMessage: (key: string, message: Message) => void;
  updateMessage: (key: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (key: string, messageId: string) => void;
  setMessages: (key: string, messages: Message[]) => void;
  clearMessages: (key: string) => void;
  
  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  deleteTaskOptimistic: (taskId: string) => Task | null;
  isLoadingTasks: boolean;
  setIsLoadingTasks: (loading: boolean) => void;
  
  // Clients
  clients: Client[];
  setClients: (clients: Client[]) => void;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  addClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;
  isLoadingClients: boolean;
  setIsLoadingClients: (loading: boolean) => void;
  
  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  updateUserStatus: (userId: string, newStatus: string) => void;
  updateUserPresence: (userId: string, online: boolean, lastActive: string, tabCount?: number) => void;
  addUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  isLoadingUsers: boolean;
  setIsLoadingUsers: (loading: boolean) => void;
  
  // Global loading state
  isInitialLoadComplete: boolean;
  setIsInitialLoadComplete: (complete: boolean) => void;
  
  // Loading progress
  loadingProgress: {
    tasks: boolean;
    clients: boolean;
    users: boolean;
  };
  setLoadingProgress: (progress: { tasks?: boolean; clients?: boolean; users?: boolean }) => void;
  
  // Cache management
  clearCache: () => void;
  getTaskById: (taskId: string) => Task | undefined;
  getClientById: (clientId: string) => Client | undefined;
  getUserById: (userId: string) => User | undefined;
  
  // UI State
  actionMenuState: {
    openMenuId: string | null;
    dropdownPositions: { [menuId: string]: { top: number; left: number } };
  };
  setActionMenuOpen: (menuId: string | null) => void;
  setDropdownPosition: (menuId: string, position: { top: number; left: number }) => void;
}

export const useDataStore = create<DataStore>()((set, get) => ({
  // Messages
  messages: {},
  addMessage: (key, message) =>
    set((state) => {
      const currentMessages = state.messages[key] || [];
      const existingMessage = currentMessages.find(msg => msg.id === message.id);
      
      if (existingMessage) {
        // ✅ OPTIMIZACIÓN: Solo actualizar si hay cambios reales
        const hasChanges = JSON.stringify(existingMessage) !== JSON.stringify(message);
        if (!hasChanges) {
          return state; // No actualizar si no hay cambios
        }
        
        // Si el mensaje ya existe, actualizarlo en lugar de duplicarlo
        return {
          messages: {
            ...state.messages,
            [key]: currentMessages.map(msg => 
              msg.id === message.id ? { ...msg, ...message } : msg
            ),
          },
        };
      }
      
      // Si no existe, agregarlo
      return {
        messages: {
          ...state.messages,
          [key]: [...currentMessages, message],
        },
      };
    }),
  updateMessage: (key, messageId, updates) =>
    set((state) => {
      const currentMessages = state.messages[key] || [];
      const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) return state;
      
      const currentMessage = currentMessages[messageIndex];
      const updatedMessage = { ...currentMessage, ...updates };
      
      // ✅ OPTIMIZACIÓN: Solo actualizar si hay cambios reales
      const hasChanges = JSON.stringify(currentMessage) !== JSON.stringify(updatedMessage);
      if (!hasChanges) {
        return state; // No actualizar si no hay cambios
      }
      
      return {
        messages: {
          ...state.messages,
          [key]: currentMessages.map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      };
    }),
  deleteMessage: (key, messageId) =>
    set((state) => {
      const currentMessages = state.messages[key] || [];
      const messageExists = currentMessages.some(msg => msg.id === messageId);
      
      // ✅ OPTIMIZACIÓN: Solo actualizar si el mensaje existe
      if (!messageExists) {
        return state; // No actualizar si no hay cambios
      }
      
      return {
        messages: {
          ...state.messages,
          [key]: currentMessages.filter((msg) => msg.id !== messageId),
        },
      };
    }),
  setMessages: (key, messages) =>
    set((state) => {
      const currentMessages = state.messages[key] || [];
      
      // ✅ OPTIMIZACIÓN: Solo actualizar si hay cambios reales
      const currentMessagesString = JSON.stringify(currentMessages);
      const newMessagesString = JSON.stringify(messages);
      
      if (currentMessagesString === newMessagesString) {
        return state; // No actualizar si no hay cambios
      }
      
      // Eliminar duplicados basándose en el ID del mensaje
      const uniqueMessages = messages.filter((message, index, self) => 
        index === self.findIndex(m => m.id === message.id)
      );
      
      return {
        messages: {
          ...state.messages,
          [key]: uniqueMessages,
        },
      };
    }),
  clearMessages: (key) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: [],
      },
    })),
  
  // Tasks
  tasks: [],
  setTasks: (tasks) => set((state) => {
    // ✅ OPTIMIZACIÓN: Evitar re-renders si el contenido no cambió realmente
    const currentTasksString = JSON.stringify(state.tasks);
    const newTasksString = JSON.stringify(tasks);
    
    if (currentTasksString === newTasksString) {
      return state; // No actualizar si el contenido es idéntico
    }
    
    console.log('[useDataStore] setTasks called:', { 
      currentCount: state.tasks.length, 
      newCount: tasks.length 
    });
    
    return { tasks };
  }),
  updateTask: (taskId, updates) => set((state) => {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return state;
    
    const updatedTask = { ...state.tasks[taskIndex], ...updates };
    const newTasks = [...state.tasks];
    newTasks[taskIndex] = updatedTask;
    
    return { tasks: newTasks };
  }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  deleteTask: (taskId) => set((state) => ({ 
    tasks: state.tasks.filter(t => t.id !== taskId) 
  })),
  deleteTaskOptimistic: (taskId) => {
    const state = get();
    const taskToDelete = state.tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      set({ tasks: state.tasks.filter(t => t.id !== taskId) });
      return taskToDelete;
    }
    return null;
  },
  isLoadingTasks: false,
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
  
  // Clients
  clients: [],
  setClients: (clients) => set((state) => {
    // ✅ OPTIMIZACIÓN: Evitar re-renders si el contenido no cambió realmente
    const currentClientsString = JSON.stringify(state.clients);
    const newClientsString = JSON.stringify(clients);
    
    if (currentClientsString === newClientsString) {
      return state; // No actualizar si el contenido es idéntico
    }
    
    console.log('[useDataStore] setClients called:', { 
      currentCount: state.clients.length, 
      newCount: clients.length 
    });
    
    return { clients };
  }),
  updateClient: (clientId, updates) =>
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === clientId ? { ...client, ...updates } : client
      ),
    })),
  addClient: (client) =>
    set((state) => ({
      clients: [...state.clients, client],
    })),
  deleteClient: (clientId) =>
    set((state) => ({
      clients: state.clients.filter((client) => client.id !== clientId),
    })),
  isLoadingClients: false,
  setIsLoadingClients: (loading) => set({ isLoadingClients: loading }),
  
  // Users
  users: [],
  setUsers: (users) => set((state) => {
    console.log('[useDataStore] setUsers called:', { currentCount: state.users.length, newCount: users.length });
    // Solo actualizar si realmente cambió
    if (JSON.stringify(state.users) !== JSON.stringify(users)) {
      console.log('[useDataStore] Users changed, updating store');
      return { users };
    }
    console.log('[useDataStore] Users unchanged, skipping update');
    return state;
  }),
  updateUser: (userId, updates) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      ),
    })),
  updateUserStatus: (userId, newStatus) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      ),
    })),
  updateUserPresence: (userId, online, lastActive, tabCount) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, online, lastActive, tabCount } : user
      ),
    })),
  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),
  deleteUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),
  isLoadingUsers: false,
  setIsLoadingUsers: (loading) => set({ isLoadingUsers: loading }),
  
  // Global loading state
  isInitialLoadComplete: false,
  setIsInitialLoadComplete: (complete) => set({ isInitialLoadComplete: complete }),
  
  // Loading progress
  loadingProgress: {
    tasks: false,
    clients: false,
    users: false,
  },
  setLoadingProgress: (progress) => set({ loadingProgress: { ...get().loadingProgress, ...progress } }),
  
  // Cache management
  clearCache: () =>
    set({
      messages: {},
      tasks: [],
      clients: [],
      users: [],
      isLoadingTasks: false,
      isLoadingClients: false,
      isLoadingUsers: false,
      isInitialLoadComplete: false,
      loadingProgress: {
        tasks: false,
        clients: false,
        users: false,
      },
    }),
  getTaskById: (taskId) => get().tasks.find((task) => task.id === taskId),
  getClientById: (clientId) => get().clients.find((client) => client.id === clientId),
  getUserById: (userId) => get().users.find((user) => user.id === userId),
  
  // UI State
  actionMenuState: {
    openMenuId: null,
    dropdownPositions: {},
  },
  setActionMenuOpen: (menuId) =>
    set((state) => ({
      actionMenuState: {
        ...state.actionMenuState,
        openMenuId: menuId,
      },
    })),
  setDropdownPosition: (menuId, position) =>
    set((state) => ({
      actionMenuState: {
        ...state.actionMenuState,
        dropdownPositions: {
          ...state.actionMenuState.dropdownPositions,
          [menuId]: position,
        },
      },
    })),
}));

// Helper to get sorted messages
export const useSortedMessages = (taskId: string) =>
  useDataStore(
    useShallow((state) => {
      const msgs = state.messages[taskId] || [];
      if (msgs.length === 0) return [];
      return [...msgs].sort(
        (a, b) =>
          (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime()) -
          (a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime())
      );
    })
  );

// Helper hooks for specific data - OPTIMIZADOS con useShallow
export const useTasks = () => useDataStore(useShallow((state) => state.tasks));
export const useClients = () => useDataStore(useShallow((state) => state.clients));
export const useUsers = () => useDataStore(useShallow((state) => state.users));

export const useTasksLoading = () => useDataStore(useShallow((state) => state.isLoadingTasks));
export const useClientsLoading = () => useDataStore(useShallow((state) => state.isLoadingClients));
export const useUsersLoading = () => useDataStore(useShallow((state) => state.isLoadingUsers));
export const useInitialLoadComplete = () => useDataStore(useShallow((state) => state.isInitialLoadComplete));

// Helper to get filtered tasks - OPTIMIZADO
export const useFilteredTasks = (filterFn?: (task: Task) => boolean) =>
  useDataStore(
    useShallow((state) => {
      if (!filterFn) return state.tasks;
      return state.tasks.filter(filterFn);
    })
  );

// ActionMenu hooks - OPTIMIZADOS
export const useActionMenuState = () => useDataStore(useShallow((state) => state.actionMenuState));
export const useActionMenuActions = () => useDataStore(useShallow((state) => ({
  setActionMenuOpen: state.setActionMenuOpen,
  setDropdownPosition: state.setDropdownPosition,
})));