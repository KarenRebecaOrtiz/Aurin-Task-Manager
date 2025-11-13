import { useMemo, useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { useDataStore } from '@/stores/dataStore';
import { Task } from '@/types';
import { sortTasks } from '@/modules/data-views/utils/sortingUtils';
import { TaskSortKey, SortDirection } from '@/modules/data-views/constants/sortingConstants';
import { useAdvancedSearch } from '@/modules/data-views/hooks/useAdvancedSearch';

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

interface UseTasksTableStateProps {
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Hook consolidado que gestiona todo el estado y lógica de TasksTable
 * Integra los hooks compartidos para reducir duplicación de código
 */
export const useTasksTableState = ({
  externalTasks,
  externalClients,
  externalUsers,
  userId,
  isAdmin = false,
}: UseTasksTableStateProps) => {

  // ==================== Zustand Store Selectors ====================
  const searchQuery = useStore(tasksTableStore, useShallow((state) => state.searchQuery));
  const searchCategory = useStore(tasksTableStore, useShallow((state) => state.searchCategory));
  const priorityFilter = useStore(tasksTableStore, useShallow((state) => state.priorityFilter));
  const priorityFilters = useStore(tasksTableStore, useShallow((state) => state.priorityFilters));
  const statusFilter = useStore(tasksTableStore, useShallow((state) => state.statusFilter));
  const statusFilters = useStore(tasksTableStore, useShallow((state) => state.statusFilters));
  const clientFilter = useStore(tasksTableStore, useShallow((state) => state.clientFilter));
  const userFilter = useStore(tasksTableStore, useShallow((state) => state.userFilter));
  const sortKey = useStore(tasksTableStore, useShallow((state) => state.sortKey));
  const sortDirection = useStore(tasksTableStore, useShallow((state) => state.sortDirection));
  const actionMenuOpenId = useStore(tasksTableStore, useShallow((state) => state.actionMenuOpenId));

  const setSearchQuery = useStore(tasksTableStore, useShallow((state) => state.setSearchQuery));
  const setSearchCategory = useStore(tasksTableStore, useShallow((state) => state.setSearchCategory));
  const setPriorityFilter = useStore(tasksTableStore, useShallow((state) => state.setPriorityFilter));
  const setPriorityFilters = useStore(tasksTableStore, useShallow((state) => state.setPriorityFilters));
  const setStatusFilter = useStore(tasksTableStore, useShallow((state) => state.setStatusFilter));
  const setStatusFilters = useStore(tasksTableStore, useShallow((state) => state.setStatusFilters));
  const setClientFilter = useStore(tasksTableStore, useShallow((state) => state.setClientFilter));
  const setUserFilter = useStore(tasksTableStore, useShallow((state) => state.setUserFilter));
  const setSortKey = useStore(tasksTableStore, useShallow((state) => state.setSortKey));
  const setSortDirection = useStore(tasksTableStore, useShallow((state) => state.setSortDirection));
  const setActionMenuOpenId = useStore(tasksTableStore, useShallow((state) => state.setActionMenuOpenId));
  const setFilteredTasks = useStore(tasksTableStore, useShallow((state) => state.setFilteredTasks));

  // ==================== DataStore Selectors ====================
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const clients = useDataStore(useShallow((state) => state.clients));
  const users = useDataStore(useShallow((state) => state.users));
  const isLoadingTasks = useDataStore(useShallow((state) => state.isLoadingTasks));
  const isLoadingClients = useDataStore(useShallow((state) => state.isLoadingClients));
  const isLoadingUsers = useDataStore(useShallow((state) => state.isLoadingUsers));

  // ==================== Effective Data ====================
  const effectiveTasks = useMemo(
    () => externalTasks || tasks,
    [externalTasks, tasks]
  );

  const effectiveClients = useMemo(
    () => externalClients || clients,
    [externalClients, clients]
  );

  const effectiveUsers = useMemo(
    () => externalUsers || users,
    [externalUsers, users]
  );

  // ==================== Helper Functions ====================

  const getInvolvedUserIds = useCallback((task: Task): string[] => {
    const involved = new Set<string>();
    if (task.LeadedBy) task.LeadedBy.forEach((id: string) => involved.add(id));
    if (task.AssignedTo) task.AssignedTo.forEach((id: string) => involved.add(id));
    if (task.CreatedBy) involved.add(task.CreatedBy);
    return Array.from(involved);
  }, []);

  const canUserViewTask = useCallback((task: Task): boolean => {
    if (!userId) return false;
    if (isAdmin) return true;
    const involved = getInvolvedUserIds(task);
    return involved.includes(userId);
  }, [userId, isAdmin, getInvolvedUserIds]);

  // ==================== Filtering Logic ====================

  // Apply advanced search (searches in task name, description, client name, user names)
  const searchFiltered = useAdvancedSearch(
    effectiveTasks,
    effectiveClients,
    effectiveUsers,
    searchQuery,
    getInvolvedUserIds,
    searchCategory
  );

  const filteredTasks = useMemo(() => {
    let result = searchFiltered;

    // 1. Filter by permissions
    result = result.filter(canUserViewTask);

    // 2. Filter by priority (support both single and multiple filters)
    if (priorityFilter) {
      result = result.filter(task => task.priority === priorityFilter);
    } else if (priorityFilters.length > 0) {
      result = result.filter(task => priorityFilters.includes(task.priority));
    }

    // 3. Filter by status (support both single and multiple filters)
    if (statusFilter) {
      result = result.filter(task => task.status === statusFilter);
    } else if (statusFilters.length > 0) {
      result = result.filter(task => statusFilters.includes(task.status));
    }

    // 4. Filter by client
    if (clientFilter) {
      result = result.filter(task => task.clientId === clientFilter);
    }

    // 5. Filter by user
    if (userFilter) {
      if (userFilter === 'me') {
        result = result.filter(task => {
          const involved = getInvolvedUserIds(task);
          return involved.includes(userId || '');
        });
      } else {
        result = result.filter(task => {
          const involved = getInvolvedUserIds(task);
          return involved.includes(userFilter);
        });
      }
    }

    return result;
  }, [
    searchFiltered,
    canUserViewTask,
    priorityFilter,
    priorityFilters,
    statusFilter,
    statusFilters,
    clientFilter,
    userFilter,
    userId,
    getInvolvedUserIds
  ]);

  // ==================== Sorting Logic ====================

  const sortedAndFilteredTasks = useMemo(() => {
    return sortTasks(
      filteredTasks,
      sortKey as TaskSortKey,
      sortDirection as SortDirection,
      effectiveClients,
      effectiveUsers
    );
  }, [filteredTasks, sortKey, sortDirection, effectiveClients, effectiveUsers]);

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
    setSearchCategory(null);
    setPriorityFilter('');
    setPriorityFilters([]);
    setStatusFilter('');
    setStatusFilters([]);
    setClientFilter('');
    setUserFilter('');
  }, [setSearchQuery, setSearchCategory, setPriorityFilter, setPriorityFilters, setStatusFilter, setStatusFilters, setClientFilter, setUserFilter]);

  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery || priorityFilter || priorityFilters.length > 0 || statusFilter || clientFilter || userFilter);
  }, [searchQuery, priorityFilter, priorityFilters, statusFilter, clientFilter, userFilter]);

  // Loading state
  const isLoading = isLoadingTasks || isLoadingClients || isLoadingUsers;

  return {
    // Data
    effectiveTasks,
    effectiveClients,
    effectiveUsers,
    filteredTasks: sortedAndFilteredTasks,

    // Sort
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    handleSort,

    // Search
    searchQuery,
    searchCategory,
    setSearchQuery,
    setSearchCategory,

    // Filters
    priorityFilter,
    priorityFilters,
    statusFilter,
    statusFilters,
    clientFilter,
    userFilter,
    setPriorityFilter,
    setPriorityFilters,
    setStatusFilter,
    setStatusFilters,
    setClientFilter,
    setUserFilter,
    clearFilters,
    hasActiveFilters,

    // UI State
    actionMenuOpenId,
    setActionMenuOpenId,

    // Loading
    isLoading,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers,

    // Legacy compatibility
    setFilteredTasks,

    // Helpers
    canUserViewTask,
    getInvolvedUserIds,
  };
};
