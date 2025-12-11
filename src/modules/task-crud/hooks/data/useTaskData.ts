/**
 * useTaskData Hook
 * Manages task data fetching and operations
 *
 * ✅ MIGRATED: Now uses centralized stores for data fetching
 * - Tasks: useTaskState from @/hooks/useTaskData (tasksDataStore)
 * - Clients: useClientsDataStore (clientsDataStore)
 * - Users: useDataStore (existing pattern)
 */

import { useCallback } from 'react';
import { Client } from '../../types/domain';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useTaskState as useCentralizedTaskState } from '@/hooks/useTaskData';
import { useClientsDataStore } from '@/stores/clientsDataStore';

// ✅ Hook for fetching clients - Now uses centralized clientsDataStore
export const useClients = () => {
  // Use useShallow to prevent infinite loops when getAllClients returns new array
  const clients = useClientsDataStore(
    useShallow((state) => Array.from(state.clients.values()))
  ) as Client[];
  const isLoading = useClientsDataStore((state) => state.isLoading);
  const error = useClientsDataStore((state) => state.error);

  return {
    clients,
    isLoading,
    error: error?.message || null
  };
};

// Hook for fetching users from dataStore (already centralized)
export const useUsers = () => {
  const users = useDataStore(useShallow((state) => state.users));
  return { users };
};

// ✅ Hook for fetching a single task - Now uses centralized tasksDataStore
export const useTask = (taskId: string | null) => {
  const { taskData, isLoading, error } = useCentralizedTaskState(taskId || '', {
    autoSubscribe: !!taskId,
    unsubscribeOnUnmount: true,
  });

  // Provide refetch function for backwards compatibility
  const refetch = useCallback(() => {
    // The centralized store handles real-time updates automatically
    // This is kept for API compatibility but is a no-op
    console.log('[useTask] refetch called - data is already real-time');
  }, []);

  return {
    task: taskData,
    isLoading,
    error: error?.message || null,
    refetch
  };
};

// Combined hook for task form data (clients + users)
export const useTaskFormData = () => {
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients();
  const { users } = useUsers();

  return {
    clients,
    users,
    isLoading: clientsLoading,
    error: clientsError,
  };
};
