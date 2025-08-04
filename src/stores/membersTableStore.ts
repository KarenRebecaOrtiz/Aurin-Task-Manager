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

export const membersTableStore = createStore<MembersTableStore>()((set, get) => ({
  // Solo estado de UI - los datos vienen de dataStore
  filteredUsers: [],
  sortKey: '',
  sortDirection: 'asc',
  searchQuery: '',
  isLoadingUsers: true,
  isLoadingTasks: true,
  retryCount: 0,
  hasError: false,
  
  setFilteredUsers: (userIds) => {
    const current = get().filteredUsers;
    // Solo actualizar si realmente cambió
    if (JSON.stringify(current) !== JSON.stringify(userIds)) {
      set({ filteredUsers: userIds });
    }
  },
  setSortKey: (key) => {
    const current = get().sortKey;
    if (current !== key) {
      set({ sortKey: key });
    }
  },
  setSortDirection: (dir) => {
    const current = get().sortDirection;
    if (current !== dir) {
      set({ sortDirection: dir });
    }
  },
  setSearchQuery: (query) => {
    const current = get().searchQuery;
    if (current !== query) {
      set({ searchQuery: query });
    }
  },
  setIsLoadingUsers: (loading) => {
    const current = get().isLoadingUsers;
    if (current !== loading) {
      set({ isLoadingUsers: loading });
    }
  },
  setIsLoadingTasks: (loading) => {
    const current = get().isLoadingTasks;
    if (current !== loading) {
      set({ isLoadingTasks: loading });
    }
  },
  setRetryCount: (count) => {
    const current = get().retryCount;
    if (current !== count) {
      set({ retryCount: count });
    }
  },
  setHasError: (error) => {
    const current = get().hasError;
    if (current !== error) {
      set({ hasError: error });
    }
  },
  resetError: () => set({ hasError: false, retryCount: 0 }),
})); 