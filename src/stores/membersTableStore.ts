import { createStore } from 'zustand';

type MembersTableState = {
  // Solo estado de UI - NO datos duplicados
  filteredUsers: string[]; // Solo IDs de usuarios filtrados
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  isLoadingUsers: boolean;
  isLoadingTasks: boolean;
  retryCount: number;
  hasError: boolean;
};

type MembersTableActions = {
  setFilteredUsers: (userIds: string[]) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setIsLoadingUsers: (loading: boolean) => void;
  setIsLoadingTasks: (loading: boolean) => void;
  setRetryCount: (count: number) => void;
  setHasError: (error: boolean) => void;
  resetError: () => void;
};

type MembersTableStore = MembersTableState & MembersTableActions;

export const membersTableStore = createStore<MembersTableStore>()((set) => ({
  // Solo estado de UI - los datos vienen de dataStore
  filteredUsers: [],
  sortKey: 'fullName',
  sortDirection: 'asc',
  searchQuery: '',
  isLoadingUsers: true,
  isLoadingTasks: true,
  retryCount: 0,
  hasError: false,
  
  setFilteredUsers: (userIds) => set({ filteredUsers: userIds }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsLoadingUsers: (loading) => set({ isLoadingUsers: loading }),
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
  setRetryCount: (count) => set({ retryCount: count }),
  setHasError: (error) => set({ hasError: error }),
  resetError: () => set({ hasError: false, retryCount: 0 }),
})); 