'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';

// Importar managers para cleanup
import { MessageNotificationsManager } from '@/hooks/useMessageNotificationsSingleton';
import { PrivateMessagePaginationManager } from '@/hooks/usePrivateMessagePaginationSingleton';
import { TaskNotificationsManager } from '@/hooks/useTaskNotificationsSingleton';

// Define the context shape
interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminStatus = () => {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Verificar admin status desde Clerk metadata (más rápido que Firestore)
        const access = user.publicMetadata?.access as string;
        const isAdminValue = access === 'admin';
        
        setIsAdmin(isAdminValue);
        
        // Cache en sessionStorage para futuras verificaciones
        const cacheKey = `isAdmin-${user.id}`;
        sessionStorage.setItem(cacheKey, isAdminValue ? 'true' : 'false');
        
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, user?.publicMetadata?.access, user]);

  // Cleanup listeners cuando el usuario se desloguea
  useEffect(() => {
    return () => {
      if (!user?.id) {
        try {
          // Cleanup de MessageNotificationsManager
          const messageManager = MessageNotificationsManager.getInstance();
          messageManager.cleanupAllListeners();
          
          // Cleanup de PrivateMessagePaginationManager
          const paginationManager = PrivateMessagePaginationManager.getInstance();
          paginationManager.cleanupAllListeners();
          
          // Cleanup de TaskNotificationsManager
          const taskManager = TaskNotificationsManager.getInstance();
          taskManager.cleanupAllListeners();
        } catch {
          // Silent error handling for cleanup
        }
      }
    };
  }, [user?.id]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isAdmin,
    isLoading
  }), [isAdmin, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}