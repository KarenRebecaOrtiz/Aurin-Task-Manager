import { useMemo } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksTableStore } from '../../../../stores/tasksTableStore';
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

interface UseTasksTableStateProps {
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
}

export const useTasksTableState = ({
  externalTasks,
  externalClients,
  externalUsers,
}: UseTasksTableStateProps) => {
  // Zustand store selectors
  const {
    filteredTasks,
    sortKey,
    sortDirection,
    searchQuery,
    priorityFilter,
    clientFilter,
    userFilter,
    actionMenuOpenId,
    visibleColumns,
    setSearchQuery,
    setSortKey,
    setSortDirection,
    setPriorityFilter,
    setClientFilter,
    setUserFilter,
    setActionMenuOpenId,
    setVisibleColumns,
  } = useStore(
    tasksTableStore,
    useShallow((state) => ({
      filteredTasks: state.filteredTasks,
      sortKey: state.sortKey,
      sortDirection: state.sortDirection,
      searchQuery: state.searchQuery,
      priorityFilter: state.priorityFilter,
      clientFilter: state.clientFilter,
      userFilter: state.userFilter,
      actionMenuOpenId: state.actionMenuOpenId,
      visibleColumns: state.visibleColumns,
      setSearchQuery: state.setSearchQuery,
      setSortKey: state.setSortKey,
      setSortDirection: state.setSortDirection,
      setPriorityFilter: state.setPriorityFilter,
      setClientFilter: state.setClientFilter,
      setUserFilter: state.setUserFilter,
      setActionMenuOpenId: state.setActionMenuOpenId,
      setVisibleColumns: state.setVisibleColumns,
    }))
  );

  // DataStore selectors
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const clients = useDataStore(useShallow((state) => state.clients));
  const users = useDataStore(useShallow((state) => state.users));
  const isLoadingTasks = useDataStore(useShallow((state) => state.isLoadingTasks));
  const isLoadingClients = useDataStore(useShallow((state) => state.isLoadingClients));
  const isLoadingUsers = useDataStore(useShallow((state) => state.isLoadingUsers));

  // Effective data (external or internal)
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

  // Loading state
  const isLoading = isLoadingTasks || isLoadingClients || isLoadingUsers;

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
    
    // UI State
    actionMenuOpenId,
    setActionMenuOpenId,
    visibleColumns,
    setVisibleColumns,
    
    // Loading
    isLoading,
  };
};
