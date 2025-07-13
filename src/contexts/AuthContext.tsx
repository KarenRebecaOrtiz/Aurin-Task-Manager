'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

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
  }, [user?.id, user?.publicMetadata?.access]);

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