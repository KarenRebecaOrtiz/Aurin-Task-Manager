import { create } from 'zustand';
import { taskService } from '../services/taskService';

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

type TasksTableState = {
  filteredTasks: Task[];
  searchQuery: string[];
  searchCategory: 'task' | 'project' | 'member' | null;
  priorityFilter: string; // Keep for backward compatibility with PriorityFilter component
  priorityFilters: string[]; // New array for multiple priority filters
  statusFilter: string;
  statusFilters: string[]; // New array for multiple status filters
  clientFilter: string;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  isUserDropdownOpen: boolean;
  isPriorityDropdownOpen: boolean;
  isStatusDropdownOpen: boolean;
  isClientDropdownOpen: boolean;
  isLoadingTasks: boolean;
  isLoadingClients: boolean;
  isLoadingUsers: boolean;
  actionMenuOpenId: string | null;
  undoStack: Array<{ task: Task; action: 'archive' | 'unarchive'; timestamp: number }>;
  showUndo: boolean;
  userFilter: string;
};

type TasksTableActions = {
  setFilteredTasks: (tasks: Task[]) => void;
  setSearchQuery: (query: string[]) => void;
  setSearchCategory: (category: 'task' | 'project' | 'member' | null) => void;
  setPriorityFilter: (filter: string) => void;
  setPriorityFilters: (filters: string[]) => void; // New action for multiple priorities
  setStatusFilter: (filter: string) => void;
  setStatusFilters: (filters: string[]) => void; // New action for multiple statuses
  setClientFilter: (filter: string) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setIsUserDropdownOpen: (open: boolean) => void;
  setIsPriorityDropdownOpen: (open: boolean) => void;
  setIsStatusDropdownOpen: (open: boolean) => void;
  setIsClientDropdownOpen: (open: boolean) => void;
  setIsLoadingTasks: (loading: boolean) => void;
  setIsLoadingClients: (loading: boolean) => void;
  setIsLoadingUsers: (loading: boolean) => void;
  setActionMenuOpenId: (id: string | null) => void;
  setUndoStack: (stack: Array<{ task: Task; action: 'archive' | 'unarchive'; timestamp: number }>) => void;
  setShowUndo: (show: boolean) => void;
  setUserFilter: (filter: string) => void;
  archiveTask: (taskId: string, userId: string) => Promise<void>;
};

type TasksTableStore = TasksTableState & TasksTableActions;

export const tasksTableStore = create<TasksTableStore>()((set, get) => ({
    filteredTasks: [],
    searchQuery: [],
    searchCategory: null,
    priorityFilter: '',
    priorityFilters: [], // Initialize empty array for multiple priorities
    statusFilter: '',
    statusFilters: [], // Initialize empty array for multiple statuses
    clientFilter: '',
    sortKey: 'lastActivity',
    sortDirection: 'desc',
    isUserDropdownOpen: false,
    isPriorityDropdownOpen: false,
    isStatusDropdownOpen: false,
    isClientDropdownOpen: false,
    isLoadingTasks: true,
    isLoadingClients: true,
    isLoadingUsers: true,
    actionMenuOpenId: null,
    undoStack: [],
    showUndo: false,
    userFilter: '',
    setFilteredTasks: (tasks) => set({ filteredTasks: tasks }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchCategory: (category) => set({ searchCategory: category }),
    setPriorityFilter: (filter) => set({ priorityFilter: filter }),
    setPriorityFilters: (filters) => set({ priorityFilters: filters }), // New setter for multiple priorities
    setStatusFilter: (filter) => set({ statusFilter: filter }),
    setStatusFilters: (filters) => set({ statusFilters: filters }), // New setter for multiple statuses
    setClientFilter: (filter) => set({ clientFilter: filter }),
    setSortKey: (key) => set({ sortKey: key }),
    setSortDirection: (dir) => set({ sortDirection: dir }),
    setIsUserDropdownOpen: (open) => set({ isUserDropdownOpen: open }),
    setIsPriorityDropdownOpen: (open) => set({ isPriorityDropdownOpen: open }),
    setIsStatusDropdownOpen: (open) => set({ isStatusDropdownOpen: open }),
    setIsClientDropdownOpen: (open) => set({ isClientDropdownOpen: open }),
    setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
    setIsLoadingClients: (loading) => set({ isLoadingClients: loading }),
    setIsLoadingUsers: (loading) => set({ isLoadingUsers: loading }),
    setActionMenuOpenId: (id) => set({ actionMenuOpenId: id }),
    setUndoStack: (stack) => set({ undoStack: stack }),
    setShowUndo: (show) => set({ showUndo: show }),
    setUserFilter: (filter) => set({ userFilter: filter }),
    archiveTask: async (taskId: string, userId: string) => {
      // Check if task is already archived
      const taskToArchive = get().filteredTasks.find(t => t.id === taskId);

      if (!taskToArchive) {
        console.error("[tasksTableStore] Task not found for archiving:", taskId);
        return;
      }

      if (taskToArchive.archived) {
        console.warn("[tasksTableStore] Task is already archived:", taskId);
        return;
      }

      try {
        // Add to undo stack before archiving
        set(state => ({
          undoStack: [...state.undoStack, { task: taskToArchive, action: 'archive', timestamp: Date.now() }],
          showUndo: true,
        }));

        // Hide the undo notification after 5 seconds
        setTimeout(() => {
          set(state => {
            if (state.undoStack[state.undoStack.length - 1]?.task.id === taskId) {
              return { showUndo: false };
            }
            return {};
          });
        }, 5000);

        // Call the backend service
        // The taskService handles optimistic updates to the dataStore
        // The UI will update reactively when dataStore changes
        await taskService.archive(taskId, userId);

      } catch (error) {
        console.error("[tasksTableStore] Failed to archive task:", error);

        // Remove from undo stack on error
        set(state => ({
          undoStack: state.undoStack.filter(item => item.task.id !== taskId),
          showUndo: false,
        }));

        throw error;
      }
    },
}));