import { useEffect, useRef } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { useUserSwiperActions } from '@/stores/userSwiperStore';

/**
 * Hook que sincroniza los usuarios del dataStore con el userSwiperStore
 * para evitar re-renders innecesarios en UserSwiper
 */
export const useUserSwiperSync = () => {
  const { updateUsersFromStore } = useUserSwiperActions();
  const users = useDataStore(state => state.users);
  const isLoadingUsers = useDataStore(state => state.isLoadingUsers);
  
  // Usar ref para evitar re-renders por cambios en el array de usuarios
  const usersRef = useRef(users);
  const isLoadingRef = useRef(isLoadingUsers);
  
  useEffect(() => {
    // Solo actualizar si realmente cambió algo importante
    const hasUserChanges = users.length !== usersRef.current.length || 
      users.some((user, index) => {
        const prevUser = usersRef.current[index];
        return !prevUser || 
          user.id !== prevUser.id ||
          user.fullName !== prevUser.fullName ||
          user.imageUrl !== prevUser.imageUrl ||
          user.role !== prevUser.role;
      });
    
    if (hasUserChanges) {
      console.log('[useUserSwiperSync] Updating users:', users.length);
      updateUsersFromStore(users);
      usersRef.current = users;
    }
    
    if (isLoadingUsers !== isLoadingRef.current) {
      console.log('[useUserSwiperSync] Loading state changed:', isLoadingUsers);
      isLoadingRef.current = isLoadingUsers;
    }
  }, [users, isLoadingUsers, updateUsersFromStore]);
  
  return {
    users,
    isLoadingUsers,
  };
}; 