import { useEffect } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import useProfileCardStore from '../stores/profileCardStore';
import type { UserProfile } from '../types';

export const useProfile = (userId: string): {
  profile: UserProfile | undefined;
  isLoading: boolean;
  error: Error | undefined;
  fetchProfile: () => void;
} => {
  const {
    profiles,
    loading,
    error: errorMap,
    fetchProfile,
  } = useStore(
    useProfileCardStore,
    useShallow((state) => ({
      profiles: state.profiles,
      loading: state.loading,
      error: state.error,
      fetchProfile: state.fetchProfile,
    }))
  );

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId, fetchProfile]);

  return {
    profile: profiles.get(userId),
    isLoading: loading.has(userId),
    error: errorMap.get(userId),
    fetchProfile: () => fetchProfile(userId),
  };
};
