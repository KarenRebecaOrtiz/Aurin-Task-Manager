import { useEffect } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from '@/stores/dataStore';
import { tasksKanbanStore } from '@/stores/tasksKanbanStore';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

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

interface UseKanbanStateReturn {
  // Data
  effectiveTasks: Task[];
  effectiveClients: Client[];
  effectiveUsers: User[];
  isLoadingTasks: boolean;

  // Filter state
  searchQuery: string;
  searchCategory: 'task' | 'project' | 'member' | null;
  priorityFilter: string;
  priorityFilters: string[]; // New array for multiple priority filters
  clientFilter: string;
  userFilter: string;

  // Dropdown state
  isPriorityDropdownOpen: boolean;
  isClientDropdownOpen: boolean;
  isUserDropdownOpen: boolean;
  isTouchDevice: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchCategory: (category: 'task' | 'client' | 'member' | null) => void;
  setPriorityFilter: (filter: string) => void;
  setPriorityFilters: (filters: string[]) => void; // New action for multiple priorities
  setClientFilter: (filter: string) => void;
  setUserFilter: (filter: string) => void;
  setIsPriorityDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsClientDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsTouchDevice: (isTouch: boolean) => void;
}

export const useKanbanState = (): UseKanbanStateReturn => {
  // Get data from dataStore
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const clients = useDataStore(useShallow((state) => state.clients));
  const users = useDataStore(useShallow((state) => state.users));
  const isLoadingTasks = useDataStore(useShallow((state) => state.isLoadingTasks));

  // Get Kanban-specific state from tasksKanbanStore
  const kanbanState = useStore(
    tasksKanbanStore,
    useShallow((state) => ({
      // Estado
      searchQuery: state.searchQuery,
      searchCategory: state.searchCategory,
      priorityFilter: state.priorityFilter,
      priorityFilters: state.priorityFilters, // New array for multiple priority filters
      clientFilter: state.clientFilter,
      userFilter: state.userFilter,
      isPriorityDropdownOpen: state.isPriorityDropdownOpen,
      isClientDropdownOpen: state.isClientDropdownOpen,
      isUserDropdownOpen: state.isUserDropdownOpen,
      isTouchDevice: state.isTouchDevice,
      // Acciones
      setSearchQuery: state.setSearchQuery,
      setSearchCategory: state.setSearchCategory,
      setPriorityFilter: state.setPriorityFilter,
      setPriorityFilters: state.setPriorityFilters, // New action for multiple priorities
      setClientFilter: state.setClientFilter,
      setUserFilter: state.setUserFilter,
      setIsPriorityDropdownOpen: state.setIsPriorityDropdownOpen,
      setIsClientDropdownOpen: state.setIsClientDropdownOpen,
      setIsUserDropdownOpen: state.setIsUserDropdownOpen,
      setIsTouchDevice: state.setIsTouchDevice,
    }))
  );

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      kanbanState.setIsTouchDevice(isTouch);
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);

    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, [kanbanState.setIsTouchDevice]);

  return {
    // Data
    effectiveTasks: tasks,
    effectiveClients: clients,
    effectiveUsers: users,
    isLoadingTasks,

    // Filter state
    searchQuery: kanbanState.searchQuery,
    searchCategory: kanbanState.searchCategory,
    priorityFilter: kanbanState.priorityFilter,
    priorityFilters: kanbanState.priorityFilters, // New array for multiple priority filters
    clientFilter: kanbanState.clientFilter,
    userFilter: kanbanState.userFilter,

    // Dropdown state
    isPriorityDropdownOpen: kanbanState.isPriorityDropdownOpen,
    isClientDropdownOpen: kanbanState.isClientDropdownOpen,
    isUserDropdownOpen: kanbanState.isUserDropdownOpen,
    isTouchDevice: kanbanState.isTouchDevice,

    // Actions
    setSearchQuery: kanbanState.setSearchQuery,
    setSearchCategory: kanbanState.setSearchCategory,
    setPriorityFilter: kanbanState.setPriorityFilter,
    setPriorityFilters: kanbanState.setPriorityFilters, // New action for multiple priorities
    setClientFilter: kanbanState.setClientFilter,
    setUserFilter: kanbanState.setUserFilter,
    setIsPriorityDropdownOpen: kanbanState.setIsPriorityDropdownOpen,
    setIsClientDropdownOpen: kanbanState.setIsClientDropdownOpen,
    setIsUserDropdownOpen: kanbanState.setIsUserDropdownOpen,
    setIsTouchDevice: kanbanState.setIsTouchDevice,
  };
};
