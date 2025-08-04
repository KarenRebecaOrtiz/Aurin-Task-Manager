'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

// Importar managers para cleanup
import { MessageNotificationsManager } from '@/hooks/useMessageNotificationsSingleton';
import { PrivateMessagePaginationManager } from '@/hooks/usePrivateMessagePaginationSingleton';
import { TaskNotificationsManager } from '@/hooks/useTaskNotificationsSingleton';

// Define the context shape
interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = () => {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Verificar admin status desde Clerk metadata (más rápido que Firestore)
        const access = user.publicMetadata?.access as string;
        const isAdminValue = access === 'admin';
        
        console.log('[AuthContext] Admin status from Clerk metadata:', {
          userId: user.id,
          access,
          isAdmin: isAdminValue
        });
        
        // 🔍 Debugging específico para Safari
        if (typeof window !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          console.log('[AuthContext][Safari] 🔍 User object:', user);
          console.log('[AuthContext][Safari] 🔍 Session exists:', !!user);
          console.log('[AuthContext][Safari] 🔍 User ID:', user.id);
          console.log('[AuthContext][Safari] 🔍 Browser:', navigator.userAgent);
          console.log('[AuthContext][Safari] 🔍 Public metadata:', user.publicMetadata);
        }
        
        setIsAdmin(isAdminValue);
        
        // Cache en sessionStorage para futuras verificaciones
        const cacheKey = `isAdmin-${user.id}`;
        sessionStorage.setItem(cacheKey, isAdminValue ? 'true' : 'false');
        
      } catch (error) {
        console.error('[AuthContext] Error checking admin status:', error);
        setError('Failed to fetch admin status');
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
        console.log('[AuthContext] User logged out, cleaning up listeners');
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
                      } catch (error) {
                        console.error('[AuthContext] Error cleaning up listeners:', error);
                      }
      }
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, error }}>
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