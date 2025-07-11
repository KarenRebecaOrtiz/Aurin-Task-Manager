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

export const tasksTableStore = createStore<TasksTableStore>()((set) => ({
    filteredTasks: [],
    searchQuery: '',
    priorityFilter: '',
    statusFilter: '',
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
    setFilteredTasks: (tasks) => {
      console.log('📊 [Store] setFilteredTasks called', {
        timestamp: new Date().toISOString(),
        tasksCount: tasks.length,
        taskIds: tasks.map(t => t.id)
      });
      set({ filteredTasks: tasks });
    },
    setSearchQuery: (query) => {
      console.log('🔍 [Store] setSearchQuery called', {
        timestamp: new Date().toISOString(),
        query
      });
      set({ searchQuery: query });
    },
    setPriorityFilter: (filter) => {
      console.log('🎯 [Store] setPriorityFilter called', {
        timestamp: new Date().toISOString(),
        filter
      });
      set({ priorityFilter: filter });
    },
    setStatusFilter: (filter) => {
      console.log('📋 [Store] setStatusFilter called', {
        timestamp: new Date().toISOString(),
        filter
      });
      set({ statusFilter: filter });
    },
    setClientFilter: (filter) => {
      console.log('🏢 [Store] setClientFilter called', {
        timestamp: new Date().toISOString(),
        filter
      });
      set({ clientFilter: filter });
    },
    setSortKey: (key) => {
      console.log('📈 [Store] setSortKey called', {
        timestamp: new Date().toISOString(),
        key
      });
      set({ sortKey: key });
    },
    setSortDirection: (dir) => {
      console.log('📊 [Store] setSortDirection called', {
        timestamp: new Date().toISOString(),
        dir
      });
      set({ sortDirection: dir });
    },
    setIsUserDropdownOpen: (open) => {
      console.log('👤 [Store] setIsUserDropdownOpen called', {
        timestamp: new Date().toISOString(),
        open
      });
      set({ isUserDropdownOpen: open });
    },
    setIsPriorityDropdownOpen: (open) => {
      console.log('🎯 [Store] setIsPriorityDropdownOpen called', {
        timestamp: new Date().toISOString(),
        open
      });
      set({ isPriorityDropdownOpen: open });
    },
    setIsStatusDropdownOpen: (open) => {
      console.log('📋 [Store] setIsStatusDropdownOpen called', {
        timestamp: new Date().toISOString(),
        open
      });
      set({ isStatusDropdownOpen: open });
    },
    setIsClientDropdownOpen: (open) => {
      console.log('🏢 [Store] setIsClientDropdownOpen called', {
        timestamp: new Date().toISOString(),
        open
      });
      set({ isClientDropdownOpen: open });
    },
    setIsLoadingTasks: (loading) => {
      console.log('⏳ [Store] setIsLoadingTasks called', {
        timestamp: new Date().toISOString(),
        loading
      });
      set({ isLoadingTasks: loading });
    },
    setIsLoadingClients: (loading) => {
      console.log('⏳ [Store] setIsLoadingClients called', {
        timestamp: new Date().toISOString(),
        loading
      });
      set({ isLoadingClients: loading });
    },
    setIsLoadingUsers: (loading) => {
      console.log('⏳ [Store] setIsLoadingUsers called', {
        timestamp: new Date().toISOString(),
        loading
      });
      set({ isLoadingUsers: loading });
    },
    setActionMenuOpenId: (id) => {
      console.log('🎛️ [Store] setActionMenuOpenId called', {
        timestamp: new Date().toISOString(),
        id
      });
      set({ actionMenuOpenId: id });
    },
    setUndoStack: (stack) => {
      console.log('↩️ [Store] setUndoStack called', {
        timestamp: new Date().toISOString(),
        stackCount: stack.length
      });
      set({ undoStack: stack });
    },
    setShowUndo: (show) => {
      console.log('🔄 [Store] setShowUndo called', {
        timestamp: new Date().toISOString(),
        show
      });
      set({ showUndo: show });
    },
    setUserFilter: (filter) => {
      console.log('👤 [Store] setUserFilter called', {
        timestamp: new Date().toISOString(),
        filter
      });
      set({ userFilter: filter });
    },
}));