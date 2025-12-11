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

type ArchiveTableState = {
  filteredTasks: Task[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  searchCategory: 'task' | 'project' | 'member' | null;
  priorityFilter: string;
  priorityFilters: string[]; // New array for multiple priority filters
  clientFilter: string;
  actionMenuOpenId: string | null;
  isPriorityDropdownOpen: boolean;
  isClientDropdownOpen: boolean;
  isUserDropdownOpen: boolean;
  userFilter: string;
  undoStack: Array<{ task: Task; action: 'archive' | 'unarchive'; timestamp: number }>;
  showUndo: boolean;
};

type ArchiveTableActions = {
  setFilteredTasks: (tasks: Task[]) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setSearchCategory: (category: 'task' | 'project' | 'member' | null) => void;
  setPriorityFilter: (filter: string) => void;
  setPriorityFilters: (filters: string[]) => void; // New action for multiple priorities
  setClientFilter: (filter: string) => void;
  setActionMenuOpenId: (id: string | null) => void;
  setIsPriorityDropdownOpen: (open: boolean) => void;
  setIsClientDropdownOpen: (open: boolean) => void;
  setIsUserDropdownOpen: (open: boolean) => void;
  setUserFilter: (filter: string) => void;
  setUndoStack: (stack: Array<{ task: Task; action: 'archive' | 'unarchive'; timestamp: number }>) => void;
  setShowUndo: (show: boolean) => void;
};

type ArchiveTableStore = ArchiveTableState & ArchiveTableActions;

export const archiveTableStore = createStore<ArchiveTableStore>()((set) => ({
  filteredTasks: [],
  sortKey: '',
  sortDirection: 'desc',
  searchQuery: '',
  searchCategory: null,
  priorityFilter: '',
  priorityFilters: [], // Initialize empty array for multiple priorities
  clientFilter: '',
  actionMenuOpenId: null,
  isPriorityDropdownOpen: false,
  isClientDropdownOpen: false,
  isUserDropdownOpen: false,
  userFilter: '',
  undoStack: [],
  showUndo: false,
  setFilteredTasks: (tasks) => set({ filteredTasks: tasks }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchCategory: (category) => set({ searchCategory: category }),
  setPriorityFilter: (filter) => set({ priorityFilter: filter }),
  setPriorityFilters: (filters) => set({ priorityFilters: filters }), // New setter for multiple priorities
  setClientFilter: (filter) => set({ clientFilter: filter }),
  setActionMenuOpenId: (id) => set({ actionMenuOpenId: id }),
  setIsPriorityDropdownOpen: (open) => set({ isPriorityDropdownOpen: open }),
  setIsClientDropdownOpen: (open) => set({ isClientDropdownOpen: open }),
  setIsUserDropdownOpen: (open) => set({ isUserDropdownOpen: open }),
  setUserFilter: (filter) => set({ userFilter: filter }),
  setUndoStack: (stack) => set({ undoStack: stack }),
  setShowUndo: (show) => set({ showUndo: show }),
})); 