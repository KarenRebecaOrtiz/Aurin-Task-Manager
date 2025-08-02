'use client';



interface UsersSyncProviderProps {
  children: React.ReactNode;
}

export const UsersSyncProvider: React.FC<UsersSyncProviderProps> = ({ children }) => {
  // Inicializar sincronización de usuarios
  // TEMPORALMENTE DESACTIVADO: useUsersSync duplica el fetching con useSharedTasksState
  // useUsersSync();
  
  return <>{children}</>;
}; 