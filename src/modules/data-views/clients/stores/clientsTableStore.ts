import { create } from 'zustand';
import { Client } from '@/types';

interface ClientsTableState {
  // Data
  clients: Client[];
  filteredClients: Client[];
  
  // UI State
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  actionMenuOpenId: string | null;
  isDataLoading: boolean;
  
  // Actions
  setClients: (clients: Client[]) => void;
  setFilteredClients: (clients: Client[]) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setActionMenuOpenId: (id: string | null) => void;
  setIsDataLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  clients: [],
  filteredClients: [],
  sortKey: '',
  sortDirection: 'asc' as const,
  searchQuery: '',
  actionMenuOpenId: null,
  isDataLoading: false,
};

export const clientsTableStore = create<ClientsTableState>((set) => ({
  ...initialState,
  
  setClients: (clients) => set({ clients }),
  setFilteredClients: (filteredClients) => set({ filteredClients }),
  setSortKey: (sortKey) => set({ sortKey }),
  setSortDirection: (sortDirection) => set({ sortDirection }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActionMenuOpenId: (actionMenuOpenId) => set({ actionMenuOpenId }),
  setIsDataLoading: (isDataLoading) => set({ isDataLoading }),
  reset: () => set(initialState),
}));
