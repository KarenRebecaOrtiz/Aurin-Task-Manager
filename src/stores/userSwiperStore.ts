import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Types
export interface ClerkUser {
  id: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface UserSwiperState {
  // Data
  users: User[];
  clerkUsers: ClerkUser[];
  isLoading: boolean;
  
  // Swiper state
  isInitialized: boolean;
  currentIndex: number;
  isPlaying: boolean;
  
  // Actions
  setUsers: (users: User[]) => void;
  setClerkUsers: (clerkUsers: ClerkUser[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  
  // Computed actions
  updateUsersFromStore: (storeUsers: User[]) => void;
  getClerkUserById: (id: string) => ClerkUser | undefined;
  getStoreUserById: (id: string) => User | undefined;
}

export const useUserSwiperStore = create<UserSwiperState>((set, get) => ({
  // Initial state
  users: [],
  clerkUsers: [],
  isLoading: true,
  isInitialized: false,
  currentIndex: 0,
  isPlaying: true,
  
  // Actions
  setUsers: (users) => set({ users }),
  setClerkUsers: (clerkUsers) => set({ clerkUsers }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  // Computed actions
  updateUsersFromStore: (storeUsers) => {
    // Convert store users to ClerkUser format
    const clerkUsers: ClerkUser[] = storeUsers.map((storeUser) => ({
      id: storeUser.id,
      imageUrl: storeUser.imageUrl,
      firstName: storeUser.fullName.split(" ")[0] || "",
      lastName: storeUser.fullName.split(" ").slice(1).join(" ") || "",
      role: storeUser.role,
    }));
    
    set({ 
      users: storeUsers, 
      clerkUsers,
      isLoading: false 
    });
  },
  
  getClerkUserById: (id) => {
    const { clerkUsers } = get();
    return clerkUsers.find(user => user.id === id);
  },
  
  getStoreUserById: (id) => {
    const { users } = get();
    return users.find(user => user.id === id);
  },
}));

// Optimized selectors for UserSwiper
export const useUserSwiperData = () => useUserSwiperStore(
  useShallow(state => ({
    users: state.users,
    clerkUsers: state.clerkUsers,
    isLoading: state.isLoading,
  }))
);

export const useUserSwiperState = () => useUserSwiperStore(
  useShallow(state => ({
    isInitialized: state.isInitialized,
    currentIndex: state.currentIndex,
    isPlaying: state.isPlaying,
  }))
);

export const useUserSwiperActions = () => useUserSwiperStore(
  useShallow(state => ({
    setUsers: state.setUsers,
    setClerkUsers: state.setClerkUsers,
    setIsLoading: state.setIsLoading,
    setIsInitialized: state.setIsInitialized,
    setCurrentIndex: state.setCurrentIndex,
    setIsPlaying: state.setIsPlaying,
    updateUsersFromStore: state.updateUsersFromStore,
    getClerkUserById: state.getClerkUserById,
    getStoreUserById: state.getStoreUserById,
  }))
); 