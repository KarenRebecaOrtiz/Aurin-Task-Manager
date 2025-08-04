import { createStore } from 'zustand';
import { Client } from '@/types';

type ClientsTableState = {
  clients: Client[];
  filteredClients: Client[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  actionMenuOpenId: string | null;
  isDataLoading: boolean;
};

type ClientsTableActions = {
  setClients: (clients: Client[]) => void;
  setFilteredClients: (clients: Client[]) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setActionMenuOpenId: (id: string | null) => void;
  setIsDataLoading: (loading: boolean) => void;
};

type ClientsTableStore = ClientsTableState & ClientsTableActions;

export const clientsTableStore = createStore<ClientsTableStore>()((set) => ({
  clients: [],
  filteredClients: [],
  sortKey: '',
  sortDirection: 'asc',
  searchQuery: '',
  actionMenuOpenId: null,
  isDataLoading: true,
  setClients: (clients) => set({ clients }),
  setFilteredClients: (clients) => set({ filteredClients: clients }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActionMenuOpenId: (id) => set({ actionMenuOpenId: id }),
  setIsDataLoading: (loading) => set({ isDataLoading: loading }),
})); 