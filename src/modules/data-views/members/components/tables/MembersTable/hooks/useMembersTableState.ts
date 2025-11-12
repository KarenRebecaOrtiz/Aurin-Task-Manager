import { useMemo, useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { membersTableStore } from '@/modules/data-views/members/stores/membersTableStore';
import { useDataStore } from '@/stores/dataStore';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
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
}

/**
 * Hook consolidado para gestionar el estado de MembersTable
 * Integra membersTableStore y dataStore
 */
export const useMembersTableState = () => {
  // ==================== Zustand Store Selectors ====================
  const filteredUsers = useStore(membersTableStore, useShallow((state) => state.filteredUsers));
  const sortKey = useStore(membersTableStore, useShallow((state) => state.sortKey));
  const sortDirection = useStore(membersTableStore, useShallow((state) => state.sortDirection));
  const searchQuery = useStore(membersTableStore, useShallow((state) => state.searchQuery));

  const setFilteredUsers = useStore(membersTableStore, useShallow((state) => state.setFilteredUsers));
  const setSortKey = useStore(membersTableStore, useShallow((state) => state.setSortKey));
  const setSortDirection = useStore(membersTableStore, useShallow((state) => state.setSortDirection));
  const setSearchQuery = useStore(membersTableStore, useShallow((state) => state.setSearchQuery));
  const setIsLoadingUsers = useStore(membersTableStore, useShallow((state) => state.setIsLoadingUsers));
  const setIsLoadingTasks = useStore(membersTableStore, useShallow((state) => state.setIsLoadingTasks));

  // ==================== DataStore Selectors ====================
  const users = useDataStore(useShallow((state) => state.users));
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const isLoadingUsers = useDataStore(useShallow((state) => state.isLoadingUsers));
  const isLoadingTasks = useDataStore(useShallow((state) => state.isLoadingTasks));

  // ==================== Effective Data ====================
  const effectiveUsers = useMemo(() => users, [users]);
  const effectiveTasks = useMemo(() => tasks, [tasks]);

  // ==================== Map filtered user IDs to User objects ====================
  const filteredUserObjects = useMemo(() => {
    if (!filteredUsers || filteredUsers.length === 0 || !effectiveUsers) {
      return [];
    }
    // filteredUsers contiene IDs, necesitamos mapear a objetos User
    return filteredUsers
      .map((userId) => effectiveUsers.find((u) => u.id === userId))
      .filter((u) => u !== undefined) as typeof effectiveUsers;
  }, [filteredUsers, effectiveUsers]);

  // ==================== Sorting Logic ====================
  const sortedUsers = useMemo(() => {
    if (!filteredUserObjects || filteredUserObjects.length === 0) {
      return [];
    }

    return [...filteredUserObjects].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortKey) {
        case 'fullName':
          aValue = (a.fullName || '').toLowerCase();
          bValue = (b.fullName || '').toLowerCase();
          break;
        case 'role':
          aValue = (a.role || '').toLowerCase();
          bValue = (b.role || '').toLowerCase();
          break;
        case 'status':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        default:
          aValue = (a.fullName || '').toLowerCase();
          bValue = (b.fullName || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredUserObjects, sortKey, sortDirection]);

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
  }, [setSearchQuery]);

  const hasActiveFilters = useMemo(() => {
    return !!searchQuery;
  }, [searchQuery]);

  return {
    // Data
    effectiveUsers,
    effectiveTasks,
    users,
    tasks,
    filteredUsers: filteredUserObjects,
    sortedUsers,

    // Sort
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    handleSort,

    // Search
    searchQuery,
    setSearchQuery,

    // Loading
    isLoadingUsers,
    isLoadingTasks,
    setIsLoadingUsers,
    setIsLoadingTasks,

    // Filters
    clearFilters,
    hasActiveFilters,

    // State setters
    setFilteredUsers,
  };
};
