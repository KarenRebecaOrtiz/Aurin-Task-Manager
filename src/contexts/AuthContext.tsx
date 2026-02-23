'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePageContext } from './PageContext';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useGlobalTimerInit } from '@/modules/chat/timer/hooks/useGlobalTimerInit';
import { DEMO_MODE, DEMO_USER } from '@/lib/demo/constants';

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

// ============================================================================
// DEMO AUTH PROVIDER - No Clerk dependencies
// ============================================================================
function DemoAuthProvider({ children }: AuthProviderProps) {
  const pageContext = usePageContext();
  const [isSynced, setIsSynced] = useState(false);

  // Sync demo user to Firestore
  useEffect(() => {
    if (!pageContext.canUseAuth || isSynced) return;

    const syncDemoUser = async () => {
      try {
        const docRef = doc(db, 'users', DEMO_USER.userId);
        const userDoc = await getDoc(docRef);
        const existingData = userDoc.exists() ? userDoc.data() : {};

        await setDoc(docRef, {
          userId: DEMO_USER.userId,
          email: DEMO_USER.email,
          displayName: DEMO_USER.fullName,
          profilePhoto: DEMO_USER.imageUrl,
          role: 'Admin',
          ...existingData,
          lastUpdated: new Date().toISOString(),
        }, { merge: true });

        setIsSynced(true);
      } catch {
        // Silent - demo can work without sync
        setIsSynced(true);
      }
    };

    syncDemoUser();
  }, [pageContext.canUseAuth, isSynced]);

  // Global timer initialization
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const userTaskIds = useMemo(() => {
    return tasks
      .filter((t) => t.AssignedTo?.includes(DEMO_USER.userId) || t.LeadedBy?.includes(DEMO_USER.userId))
      .map((t) => t.id);
  }, [tasks]);

  useGlobalTimerInit({
    userId: DEMO_USER.userId,
    userTaskIds,
    enabled: pageContext.canUseAuth && isSynced,
  });

  const contextValue = useMemo(() => ({
    isAdmin: true,
    isLoading: false,
    isSynced,
    userId: DEMO_USER.userId,
  }), [isSynced]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// CLERK AUTH PROVIDER - Original implementation (unused in DEMO branch)
// ============================================================================
function ClerkAuthProvider({ children }: AuthProviderProps) {
  const { useAuth: useClerkAuth, useUser } = require('@/lib/demo/clerk-mock');
  const { signInWithCustomToken } = require('firebase/auth');
  const { auth } = require('@/lib/firebase');

  const pageContext = usePageContext();
  const { getToken, userId } = useClerkAuth();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [syncRetryCount, setSyncRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // Si estamos en página pública, no hacer nada
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
      if (!pageContext.canUseAuth) return;

      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const access = user.publicMetadata?.access as string;
        const isAdminValue = access === 'admin';
        setIsAdmin(isAdminValue);
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
    if (!pageContext.canUseAuth) return;

    if (!userId || !user || isSynced || syncRetryCount > maxRetries) {
      return;
    }

    const syncUserToFirebase = async () => {
      try {
        const token = await getToken({ template: 'integration_firebase' });
        if (!token) {
          throw new Error('Failed to get Firebase token');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const userCredentials = await signInWithCustomToken(auth, token);

        const email = user.emailAddresses[0]?.emailAddress || 'no-email';
        const displayName = user.firstName || user.lastName
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : 'Usuario';
        const profilePhoto = user.imageUrl || '';
        const docRef = doc(db, 'users', userId);
        const userDoc = await getDoc(docRef);
        const existingData = userDoc.exists() ? userDoc.data() : {};

        const userData = {
          userId,
          email,
          displayName,
          profilePhoto,
          ...existingData,
          lastUpdated: new Date().toISOString(),
        };

        await setDoc(docRef, userData, { merge: true });
        await userCredentials.user.getIdToken();

        setIsSynced(true);
        setSyncRetryCount(0);
      } catch {
        if (syncRetryCount < maxRetries) {
          setSyncRetryCount((prev) => prev + 1);
        }
      }
    };

    syncUserToFirebase();
  }, [userId, user, isSynced, getToken, syncRetryCount, maxRetries, pageContext.canUseAuth, auth, signInWithCustomToken]);

  // Global timer initialization
  const tasks = useDataStore(useShallow((state) => state.tasks));
  const userTaskIds = useMemo(() => {
    if (!userId) return [];
    return tasks
      .filter((t) => t.AssignedTo?.includes(userId) || t.LeadedBy?.includes(userId))
      .map((t) => t.id);
  }, [tasks, userId]);

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
        } catch {
          // Silent error handling for cleanup
        }
      }
    };
  }, [user?.id]);

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

// ============================================================================
// EXPORTED AUTH PROVIDER - Selects demo or real based on DEMO_MODE
// ============================================================================
export function AuthProvider({ children }: AuthProviderProps) {
  if (DEMO_MODE) {
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
