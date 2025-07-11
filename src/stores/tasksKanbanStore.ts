import { createStore } from 'zustand';

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

type TasksKanbanState = {
  searchQuery: string;
  priorityFilter: string;
  clientFilter: string;
  userFilter: string;
  actionMenuOpenId: string | null;
  isPriorityDropdownOpen: boolean;
  isClientDropdownOpen: boolean;
  isUserDropdownOpen: boolean;
  isTouchDevice: boolean;
  isLoadingTasks: boolean;
  isLoadingUsers: boolean;
  activeTask: Task | null;
};

type TasksKanbanActions = {
  setSearchQuery: (query: string) => void;
  setPriorityFilter: (filter: string) => void;
  setClientFilter: (filter: string) => void;
  setUserFilter: (filter: string) => void;
  setActionMenuOpenId: (id: string | null) => void;
  setIsPriorityDropdownOpen: (open: boolean) => void;
  setIsClientDropdownOpen: (open: boolean) => void;
  setIsUserDropdownOpen: (open: boolean) => void;
  setIsTouchDevice: (isTouch: boolean) => void;
  setIsLoadingTasks: (loading: boolean) => void;
  setIsLoadingUsers: (loading: boolean) => void;
  setActiveTask: (task: Task | null) => void;
};

type TasksKanbanStore = TasksKanbanState & TasksKanbanActions;

export const tasksKanbanStore = createStore<TasksKanbanStore>()((set) => ({
  searchQuery: '',
  priorityFilter: '',
  clientFilter: '',
  userFilter: '',
  actionMenuOpenId: null,
  isPriorityDropdownOpen: false,
  isClientDropdownOpen: false,
  isUserDropdownOpen: false,
  isTouchDevice: false,
  isLoadingTasks: true,
  isLoadingUsers: true,
  activeTask: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPriorityFilter: (filter) => set({ priorityFilter: filter }),
  setClientFilter: (filter) => set({ clientFilter: filter }),
  setUserFilter: (filter) => set({ userFilter: filter }),
  setActionMenuOpenId: (id) => set({ actionMenuOpenId: id }),
  setIsPriorityDropdownOpen: (open) => set({ isPriorityDropdownOpen: open }),
  setIsClientDropdownOpen: (open) => set({ isClientDropdownOpen: open }),
  setIsUserDropdownOpen: (open) => set({ isUserDropdownOpen: open }),
  setIsTouchDevice: (isTouch) => set({ isTouchDevice: isTouch }),
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
  setIsLoadingUsers: (loading) => set({ isLoadingUsers: loading }),
  setActiveTask: (task) => set({ activeTask: task }),
})); 