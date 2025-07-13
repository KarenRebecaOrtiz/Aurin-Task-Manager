'use client';

import { useUsersSync } from '@/hooks/useUsersSync';

interface UsersSyncProviderProps {
  children: React.ReactNode;
}

export const UsersSyncProvider: React.FC<UsersSyncProviderProps> = ({ children }) => {
  // Inicializar sincronización de usuarios
  useUsersSync();
  
  return <>{children}</>;
}; 