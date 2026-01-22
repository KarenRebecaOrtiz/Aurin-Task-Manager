'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';

interface GuestSession {
  taskId: string;
  token: string;
  tokenName: string | null;
  guestName: string | null;
  authenticatedAt: string;
  commentsEnabled: boolean;
}

interface GuestAuthContextType {
  guestSession: GuestSession | null;
  isGuest: boolean;
  isLoading: boolean;
  setGuestSession: (session: GuestSession) => void;
  clearGuestSession: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'guestSession';

interface GuestAuthProviderProps {
  children: ReactNode;
  taskId: string;
}

export function GuestAuthProvider({ children, taskId }: GuestAuthProviderProps) {
  const [guestSession, setGuestSessionState] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load guest session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: GuestSession = JSON.parse(stored);

        // Verify session is for current task
        if (session.taskId === taskId) {
          setGuestSessionState(session);
        } else {
          // Clear invalid session
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[GuestAuth] Error loading session:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  const setGuestSession = useCallback((session: GuestSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setGuestSessionState(session);
    } catch (error) {
      console.error('[GuestAuth] Error saving session:', error);
    }
  }, []);

  const clearGuestSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setGuestSessionState(null);
    } catch (error) {
      console.error('[GuestAuth] Error clearing session:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    guestSession,
    isGuest: !!guestSession,
    isLoading,
    setGuestSession,
    clearGuestSession,
  }), [guestSession, isLoading, setGuestSession, clearGuestSession]);

  return (
    <GuestAuthContext.Provider value={contextValue}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const context = useContext(GuestAuthContext);
  if (context === undefined) {
    throw new Error('useGuestAuth must be used within a GuestAuthProvider');
  }
  return context;
}
