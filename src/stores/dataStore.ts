// src/stores/dataStore.ts
import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';

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
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: state.messages[key]?.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ) || [],
      },
    })),
  deleteMessage: (key, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: state.messages[key]?.filter((msg) => msg.id !== messageId) || [],
      },
    })),
  setMessages: (key, messages) =>
    set((state) => {
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
  setTasks: (tasks) => set({ tasks }),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),
  isLoadingTasks: false,
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
  
  // Clients
  clients: [],
  setClients: (clients) => set({ clients }),
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
  setUsers: (users) => set({ users }),
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
    (state) => {
      const msgs = state.messages[taskId] || [];
      return [...msgs].sort(
        (a, b) =>
          (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime()) -
          (a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime())
      );
    }
  );

// Helper hooks for specific data
export const useTasks = () => useDataStore((state) => state.tasks);
export const useClients = () => useDataStore((state) => state.clients);
export const useUsers = () => useDataStore((state) => state.users);

export const useTasksLoading = () => useDataStore((state) => state.isLoadingTasks);
export const useClientsLoading = () => useDataStore((state) => state.isLoadingClients);
export const useUsersLoading = () => useDataStore((state) => state.isLoadingUsers);
export const useInitialLoadComplete = () => useDataStore((state) => state.isInitialLoadComplete);

// Helper to get filtered tasks
export const useFilteredTasks = (filterFn?: (task: Task) => boolean) =>
  useDataStore(
    (state) => filterFn ? state.tasks.filter(filterFn) : state.tasks
  );

// ActionMenu hooks
export const useActionMenuState = () => useDataStore((state) => state.actionMenuState);
export const useActionMenuActions = () => useDataStore((state) => ({
  setActionMenuOpen: state.setActionMenuOpen,
  setDropdownPosition: state.setDropdownPosition,
}));