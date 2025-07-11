import { createStore } from 'zustand';

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

type MembersTableState = {
  users: User[];
  tasks: Task[];
  filteredUsers: User[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  isLoadingUsers: boolean;
  isLoadingTasks: boolean;
};

type MembersTableActions = {
  setUsers: (users: User[]) => void;
  setTasks: (tasks: Task[]) => void;
  setFilteredUsers: (users: User[]) => void;
  setSortKey: (key: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setSearchQuery: (query: string) => void;
  setIsLoadingUsers: (loading: boolean) => void;
  setIsLoadingTasks: (loading: boolean) => void;
};

type MembersTableStore = MembersTableState & MembersTableActions;

export const membersTableStore = createStore<MembersTableStore>()((set) => ({
  users: [],
  tasks: [],
  filteredUsers: [],
  sortKey: 'fullName',
  sortDirection: 'asc',
  searchQuery: '',
  isLoadingUsers: true,
  isLoadingTasks: true,
  setUsers: (users) => set({ users }),
  setTasks: (tasks) => set({ tasks }),
  setFilteredUsers: (users) => set({ filteredUsers: users }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsLoadingUsers: (loading) => set({ isLoadingUsers: loading }),
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),
})); 