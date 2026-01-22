'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { validateTokenForTask } from '@/modules/shareTask/actions/tokenAuth.actions';

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
  refreshSession: () => Promise<void>;
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

  // Re-validate token with server to get fresh permissions
  const refreshSession = useCallback(async () => {
    const currentSession = guestSession;
    if (!currentSession) return;

    try {
      const result = await validateTokenForTask(currentSession.taskId, currentSession.token);

      if (result.success && result.tokenData) {
        // Update session with fresh permissions from server
        const updatedSession: GuestSession = {
          ...currentSession,
          commentsEnabled: result.tokenData.commentsEnabled ?? true,
        };

        // Only update if something changed
        if (updatedSession.commentsEnabled !== currentSession.commentsEnabled) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
          setGuestSessionState(updatedSession);
        }
      } else {
        // Token is no longer valid - clear session
        console.warn('[GuestAuth] Token no longer valid, clearing session');
        localStorage.removeItem(STORAGE_KEY);
        setGuestSessionState(null);
      }
    } catch (error) {
      console.error('[GuestAuth] Error refreshing session:', error);
    }
  }, [guestSession]);

  const contextValue = useMemo(() => ({
    guestSession,
    isGuest: !!guestSession,
    isLoading,
    setGuestSession,
    clearGuestSession,
    refreshSession,
  }), [guestSession, isLoading, setGuestSession, clearGuestSession, refreshSession]);

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
