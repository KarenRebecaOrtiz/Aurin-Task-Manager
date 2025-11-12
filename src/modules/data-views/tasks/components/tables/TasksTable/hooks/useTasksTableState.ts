import { useMemo, useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksTableStore } from '../../../../stores/tasksTableStore';
import { useDataStore } from '@/stores/dataStore';
import { sortTasks } from '@/modules/data-views/utils';
import { TaskSortKey, SortDirection } from '@/modules/data-views/constants/sortingConstants';

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
  const priorityFilter = useStore(tasksTableStore, useShallow((state) => state.priorityFilter));
  const statusFilter = useStore(tasksTableStore, useShallow((state) => state.statusFilter));
  const clientFilter = useStore(tasksTableStore, useShallow((state) => state.clientFilter));
  const userFilter = useStore(tasksTableStore, useShallow((state) => state.userFilter));
  const sortKey = useStore(tasksTableStore, useShallow((state) => state.sortKey));
  const sortDirection = useStore(tasksTableStore, useShallow((state) => state.sortDirection));
  const actionMenuOpenId = useStore(tasksTableStore, useShallow((state) => state.actionMenuOpenId));

  const setSearchQuery = useStore(tasksTableStore, useShallow((state) => state.setSearchQuery));
  const setPriorityFilter = useStore(tasksTableStore, useShallow((state) => state.setPriorityFilter));
  const setStatusFilter = useStore(tasksTableStore, useShallow((state) => state.setStatusFilter));
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

  const filteredTasks = useMemo(() => {
    let result = effectiveTasks;

    // 1. Filter by permissions
    result = result.filter(canUserViewTask);

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.name?.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery) ||
        task.clientId?.toLowerCase().includes(lowerQuery) ||
        task.status?.toLowerCase().includes(lowerQuery) ||
        task.priority?.toLowerCase().includes(lowerQuery)
      );
    }

    // 3. Filter by priority
    if (priorityFilter) {
      result = result.filter(task => task.priority === priorityFilter);
    }

    // 4. Filter by status
    if (statusFilter) {
      result = result.filter(task => task.status === statusFilter);
    }

    // 5. Filter by client
    if (clientFilter) {
      result = result.filter(task => task.clientId === clientFilter);
    }

    // 6. Filter by user
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
    effectiveTasks,
    canUserViewTask,
    searchQuery,
    priorityFilter,
    statusFilter,
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
    setPriorityFilter('');
    setStatusFilter('');
    setClientFilter('');
    setUserFilter('');
  }, [setSearchQuery, setPriorityFilter, setStatusFilter, setClientFilter, setUserFilter]);

  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery || priorityFilter || statusFilter || clientFilter || userFilter);
  }, [searchQuery, priorityFilter, statusFilter, clientFilter, userFilter]);

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
    setSearchQuery,

    // Filters
    priorityFilter,
    statusFilter,
    clientFilter,
    userFilter,
    setPriorityFilter,
    setStatusFilter,
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
