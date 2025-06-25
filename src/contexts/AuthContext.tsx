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
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Intenta leer de sessionStorage primero
      const cacheKey = `isAdmin-${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached !== null) {
        setIsAdmin(cached === 'true');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          const isAdminValue = access === 'admin';
          setIsAdmin(isAdminValue);
          sessionStorage.setItem(cacheKey, isAdminValue ? 'true' : 'false');
        } else {
          setIsAdmin(false);
          sessionStorage.setItem(cacheKey, 'false');
        }
      } catch {
        setError('Failed to fetch admin status');
        setIsAdmin(false);
        sessionStorage.setItem(cacheKey, 'false');
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