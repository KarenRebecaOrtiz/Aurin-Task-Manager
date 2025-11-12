import { useMemo } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { clientsTableStore } from '@/modules/data-views/clients/stores/clientsTableStore';
import { useDataStore } from '@/stores/dataStore';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

/**
 * Hook consolidado para gestionar el estado de ClientsTable
 * Integra clientsTableStore y dataStore
 */
export const useClientsTableState = () => {
  // ==================== Zustand Store Selectors ====================
  const clients = useStore(clientsTableStore, useShallow((state) => state.clients));
  const filteredClients = useStore(clientsTableStore, useShallow((state) => state.filteredClients));
  const sortKey = useStore(clientsTableStore, useShallow((state) => state.sortKey));
  const sortDirection = useStore(clientsTableStore, useShallow((state) => state.sortDirection));
  const searchQuery = useStore(clientsTableStore, useShallow((state) => state.searchQuery));
  const actionMenuOpenId = useStore(clientsTableStore, useShallow((state) => state.actionMenuOpenId));
  const isDataLoading = useStore(clientsTableStore, useShallow((state) => state.isDataLoading));

  const setClients = useStore(clientsTableStore, useShallow((state) => state.setClients));
  const setFilteredClients = useStore(clientsTableStore, useShallow((state) => state.setFilteredClients));
  const setSortKey = useStore(clientsTableStore, useShallow((state) => state.setSortKey));
  const setSortDirection = useStore(clientsTableStore, useShallow((state) => state.setSortDirection));
  const setSearchQuery = useStore(clientsTableStore, useShallow((state) => state.setSearchQuery));
  const setActionMenuOpenId = useStore(clientsTableStore, useShallow((state) => state.setActionMenuOpenId));
  const setIsDataLoading = useStore(clientsTableStore, useShallow((state) => state.setIsDataLoading));

  // ==================== DataStore Selectors ====================
  const tasks = useDataStore(useShallow((state) => state.tasks));

  // ==================== Effective Data ====================
  const effectiveClients = useMemo(() => clients, [clients]);
  const effectiveTasks = useMemo(() => tasks, [tasks]);

  // ==================== Sorting Logic ====================
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortKey) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'projectCount':
          aValue = a.projectCount || 0;
          bValue = b.projectCount || 0;
          break;
        case 'createdAt':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredClients, sortKey, sortDirection]);

  return {
    // Data
    effectiveClients,
    effectiveTasks,
    clients,
    filteredClients,
    sortedClients,

    // Sort
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,

    // Search
    searchQuery,
    setSearchQuery,

    // Action Menu
    actionMenuOpenId,
    setActionMenuOpenId,

    // Loading
    isDataLoading,
    setIsDataLoading,

    // State setters
    setClients,
    setFilteredClients,
  };
};
