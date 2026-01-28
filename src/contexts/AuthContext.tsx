'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { usePageContext } from './PageContext';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useGlobalTimerInit } from '@/modules/chat/timer/hooks/useGlobalTimerInit';

// Define the context shape
interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  isSynced: boolean;
  userId: string | null;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  // ✅ Verificar si podemos usar auth
  const pageContext = usePageContext();
  const { getToken, userId } = useClerkAuth();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [syncRetryCount, setSyncRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // ✅ Si estamos en página pública, no hacer nada
  useEffect(() => {
    if (!pageContext.canUseAuth) {
      setIsAdmin(false);
      setIsLoading(false);
      setIsSynced(true);
      return;
    }
  }, [pageContext.canUseAuth]);

  useEffect(() => {
    const checkAdminStatus = () => {
      // ✅ Skip en páginas públicas
      if (!pageContext.canUseAuth) return;
      
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
  }, [user?.id, user?.publicMetadata?.access, user, pageContext.canUseAuth]);

  // Sync Clerk user with Firebase
  useEffect(() => {
    // ✅ Skip en páginas públicas
    if (!pageContext.canUseAuth) return;
    
    if (!userId || !user || isSynced || syncRetryCount > maxRetries) {
      return;
    }

    const syncUserToFirebase = async () => {
      try {
        // Get Firebase custom token from Clerk
        const token = await getToken({ template: 'integration_firebase' });
        if (!token) {
          throw new Error('Failed to get Firebase token');
        }

        // Small delay to ensure Clerk is fully ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Sign in to Firebase with the custom token
        const userCredentials = await signInWithCustomToken(auth, token);

        // Prepare user data from Clerk
        const email = user.emailAddresses[0]?.emailAddress || 'no-email';
        const displayName = user.firstName || user.lastName
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : 'Usuario';
        const profilePhoto = user.imageUrl || '';
        const docRef = doc(db, 'users', userId);

        // Get existing user data from Firestore to preserve it
        const userDoc = await getDoc(docRef);
        const existingData = userDoc.exists() ? userDoc.data() : {};

        // Merge Clerk data with existing Firestore data
        const userData = {
          userId,
          email,
          displayName,
          profilePhoto,
          ...existingData, // Preserve existing data
          lastUpdated: new Date().toISOString(),
        };

        // Update Firestore with merged data
        await setDoc(docRef, userData, { merge: true });

        // Ensure Firebase ID token is obtained
        await userCredentials.user.getIdToken();

        setIsSynced(true);
        setSyncRetryCount(0);
      } catch {
        // Firebase sync error - silent in production
        if (syncRetryCount < maxRetries) {
          setSyncRetryCount((prev) => prev + 1);
        }
      }
    };

    syncUserToFirebase();
  }, [userId, user, isSynced, getToken, syncRetryCount, maxRetries, pageContext.canUseAuth]);

  // ============================================================================
  // GLOBAL TIMER INITIALIZATION
  // ============================================================================

  // Get user's task IDs from dataStore
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const userTaskIds = useMemo(() => {
    if (!userId) return [];
    return tasks
      .filter((t) => t.AssignedTo?.includes(userId) || t.LeadedBy?.includes(userId))
      .map((t) => t.id);
  }, [tasks, userId]);

  // Initialize global timer sync
  useGlobalTimerInit({
    userId: userId || null,
    userTaskIds,
    enabled: pageContext.canUseAuth && isSynced && !!userId,
  });

  // Cleanup listeners cuando el usuario se desloguea
  useEffect(() => {
    return () => {
      if (!user?.id) {
        try {
          // Notification managers removed - using NodeMailer instead
          // Private message cleanup removed - handled by chat module
        } catch {
          // Silent error handling for cleanup
        }
      }
    };
  }, [user?.id]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isAdmin,
    isLoading,
    isSynced,
    userId: userId || null
  }), [isAdmin, isLoading, isSynced, userId]);

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