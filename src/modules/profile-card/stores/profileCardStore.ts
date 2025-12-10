import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserDataStore } from '@/stores/userDataStore';
import type { ProfileStore, UserProfile } from '../types';

const useProfileCardStore = create<ProfileStore>((set, get) => ({
  profiles: new Map(),
  loading: new Set(),
  error: new Map(),
  subscriptions: new Map(),

  fetchProfile: (userId) => {
    if (!userId || get().profiles.has(userId) || get().loading.has(userId)) {
      return;
    }

    // Check if this is the current user - if so, use userDataStore instead
    const currentUserId = useUserDataStore.getState().currentUserId;
    if (userId === currentUserId) {
      // Don't create a duplicate subscription - userDataStore already handles this
      // Just return early, ProfileDialog will use userDataStore directly
      return;
    }

    set((state) => ({
      loading: new Set(state.loading).add(userId),
    }));

    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<UserProfile, 'id'>;
          const profile: UserProfile = { id: userId, ...data };
          
          set((state) => {
            const newProfiles = new Map(state.profiles);
            newProfiles.set(userId, profile);
            const newLoading = new Set(state.loading);
            newLoading.delete(userId);
            const newErrors = new Map(state.error);
            newErrors.delete(userId);

            return { profiles: newProfiles, loading: newLoading, error: newErrors };
          });
        } else {
          set((state) => {
            const newLoading = new Set(state.loading);
            newLoading.delete(userId);
            const newErrors = new Map(state.error);
            newErrors.set(userId, new Error('User not found'));
            return { loading: newLoading, error: newErrors };
          });
        }
      },
      (err) => {
        console.error(`[ProfileStore] Error fetching user ${userId}:`, err);
        set((state) => {
          const newLoading = new Set(state.loading);
          newLoading.delete(userId);
          const newErrors = new Map(state.error);
          newErrors.set(userId, err as Error);
          return { loading: newLoading, error: newErrors };
        });
      }
    );

    set((state) => ({
      subscriptions: new Map(state.subscriptions).set(userId, unsubscribe),
    }));
  },

  prefetchProfile: (userId) => {
    get().fetchProfile(userId);
  },

  unsubscribeProfile: (userId) => {
    const unsubscribe = get().subscriptions.get(userId);
    if (unsubscribe) {
      unsubscribe();
      set((state) => {
        const newSubscriptions = new Map(state.subscriptions);
        newSubscriptions.delete(userId);
        return { subscriptions: newSubscriptions };
      });
    }
  },

  // Invalida el cache de un usuario para forzar recarga
  invalidateProfile: (userId) => {
    const unsubscribe = get().subscriptions.get(userId);
    if (unsubscribe) {
      unsubscribe();
    }
    set((state) => {
      const newProfiles = new Map(state.profiles);
      newProfiles.delete(userId);
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.delete(userId);
      return { profiles: newProfiles, subscriptions: newSubscriptions };
    });
    // Re-fetch para crear nuevo listener
    get().fetchProfile(userId);
  },
  
  clearStore: () => {
    const { subscriptions } = get();
    subscriptions.forEach((unsubscribe) => unsubscribe());
    set({
      profiles: new Map(),
      loading: new Set(),
      error: new Map(),
      subscriptions: new Map(),
    });
  },
}));

export default useProfileCardStore;
