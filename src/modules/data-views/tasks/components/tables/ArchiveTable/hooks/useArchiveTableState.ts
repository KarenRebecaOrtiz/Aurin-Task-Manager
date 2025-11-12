import { useMemo, useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { archiveTableStore } from '@/modules/data-views/tasks/stores/archiveTableStore';
import { useDataStore } from '@/stores/dataStore';

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
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

/**
 * Hook consolidado para gestionar el estado de ArchiveTable
 * Integra archiveTableStore y dataStore
 */
export const useArchiveTableState = () => {
  // ==================== Zustand Store Selectors ====================
  const filteredTasks = useStore(archiveTableStore, useShallow((state) => state.filteredTasks));
  const sortKey = useStore(archiveTableStore, useShallow((state) => state.sortKey));
  const sortDirection = useStore(archiveTableStore, useShallow((state) => state.sortDirection));
  const searchQuery = useStore(archiveTableStore, useShallow((state) => state.searchQuery));
  const priorityFilter = useStore(archiveTableStore, useShallow((state) => state.priorityFilter));
  const clientFilter = useStore(archiveTableStore, useShallow((state) => state.clientFilter));
  const userFilter = useStore(archiveTableStore, useShallow((state) => state.userFilter));
  const isPriorityDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.isPriorityDropdownOpen));
  const isClientDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.isClientDropdownOpen));
  const isUserDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.isUserDropdownOpen));

  const setFilteredTasks = useStore(archiveTableStore, useShallow((state) => state.setFilteredTasks));
  const setSortKey = useStore(archiveTableStore, useShallow((state) => state.setSortKey));
  const setSortDirection = useStore(archiveTableStore, useShallow((state) => state.setSortDirection));
  const setSearchQuery = useStore(archiveTableStore, useShallow((state) => state.setSearchQuery));
  const setPriorityFilter = useStore(archiveTableStore, useShallow((state) => state.setPriorityFilter));
  const setClientFilter = useStore(archiveTableStore, useShallow((state) => state.setClientFilter));
  const setUserFilter = useStore(archiveTableStore, useShallow((state) => state.setUserFilter));
  const setIsPriorityDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.setIsPriorityDropdownOpen));
  const setIsClientDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.setIsClientDropdownOpen));
  const setIsUserDropdownOpen = useStore(archiveTableStore, useShallow((state) => state.setIsUserDropdownOpen));

  // ==================== DataStore Selectors ====================
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const clients = useDataStore(useShallow((state) => state.clients));
  const users = useDataStore(useShallow((state) => state.users));

  // ==================== Effective Data ====================
  const effectiveTasks = useMemo(() => tasks, [tasks]);
  const effectiveClients = useMemo(() => clients, [clients]);
  const effectiveUsers = useMemo(() => users, [users]);

  // ==================== Actions ====================
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  }, [sortKey, sortDirection, setSortKey, setSortDirection]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setPriorityFilter('');
    setClientFilter('');
    setUserFilter('');
  }, [setSearchQuery, setPriorityFilter, setClientFilter, setUserFilter]);

  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery || priorityFilter || clientFilter || userFilter);
  }, [searchQuery, priorityFilter, clientFilter, userFilter]);

  return {
    // Data
    effectiveTasks,
    effectiveClients,
    effectiveUsers,
    filteredTasks,

    // Sort
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    handleSort,

    // Search
    searchQuery,
    setSearchQuery,

    // Filters
    priorityFilter,
    clientFilter,
    userFilter,
    setPriorityFilter,
    setClientFilter,
    setUserFilter,
    clearFilters,
    hasActiveFilters,

    // Dropdowns
    isPriorityDropdownOpen,
    isClientDropdownOpen,
    isUserDropdownOpen,
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen,

    // Legacy compatibility
    setFilteredTasks,
  };
};
