'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false, isLoading: true, userId: null });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id || null;

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!userId) {
        console.warn('[AuthProvider] No userId, skipping admin status fetch');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[AuthProvider] Fetching admin status for user:', userId);
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === 'admin');
          console.log('[AuthProvider] Admin status fetched:', { userId, access, isAdmin: access === 'admin' });
        } else {
          console.warn('[AuthProvider] User document not found:', userId);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[AuthProvider] Error fetching admin status:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId,
        });
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
        console.log('[AuthProvider] Admin status load completed:', { userId, isAdmin });
      }
    };

    fetchAdminStatus();
  }, [userId, isAdmin]);

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, userId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
