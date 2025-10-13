import { create } from 'zustand';

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
  searchQuery: string;
  priorityFilter: string;
  statusFilter: string;
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
  setSearchQuery: (query: string) => void;
  setPriorityFilter: (filter: string) => void;
  setStatusFilter: (filter: string) => void;
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
};

type TasksTableStore = TasksTableState & TasksTableActions;

export const tasksTableStore = create<TasksTableStore>()((set) => ({
    filteredTasks: [],
    searchQuery: '',
    priorityFilter: '',
    statusFilter: '',
    clientFilter: '',
    sortKey: 'createdAt',
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
    setPriorityFilter: (filter) => set({ priorityFilter: filter }),
    setStatusFilter: (filter) => set({ statusFilter: filter }),
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
}));