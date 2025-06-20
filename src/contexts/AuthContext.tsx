'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        console.warn('[AuthProvider] No userId provided, skipping admin status fetch');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('[AuthProvider] Fetching admin status for user:', user.id);
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === 'admin');
          console.log('[AuthProvider] Admin status fetched:', {
            userId: user.id,
            access,
            isAdmin: access === 'admin',
          });
        } else {
          setIsAdmin(false);
          console.warn('[AuthProvider] User document not found for ID:', user.id);
        }
      } catch (error) {
        console.error('[AuthProvider] Error fetching admin status:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId: user.id,
        });
        setError('Failed to fetch admin status');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminStatus();
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