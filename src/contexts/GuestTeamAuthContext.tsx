'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';

interface GuestTeamSession {
  teamId: string;
  token: string;
  tokenName: string | null;
  guestName: string | null;
  authenticatedAt: string;
}

interface GuestTeamAuthContextType {
  guestSession: GuestTeamSession | null;
  isGuest: boolean;
  isLoading: boolean;
  setGuestSession: (session: GuestTeamSession) => void;
  clearGuestSession: () => void;
}

const GuestTeamAuthContext = createContext<GuestTeamAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'guestTeamSession';

interface GuestTeamAuthProviderProps {
  children: ReactNode;
  teamId: string;
}

export function GuestTeamAuthProvider({ children, teamId }: GuestTeamAuthProviderProps) {
  const [guestSession, setGuestSessionState] = useState<GuestTeamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load guest session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: GuestTeamSession = JSON.parse(stored);

        // Verify session is for current team
        if (session.teamId === teamId) {
          setGuestSessionState(session);
        } else {
          // Clear invalid session
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[GuestTeamAuth] Error loading session:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const setGuestSession = useCallback((session: GuestTeamSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setGuestSessionState(session);
    } catch (error) {
      console.error('[GuestTeamAuth] Error saving session:', error);
    }
  }, []);

  const clearGuestSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setGuestSessionState(null);
    } catch (error) {
      console.error('[GuestTeamAuth] Error clearing session:', error);
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
    <GuestTeamAuthContext.Provider value={contextValue}>
      {children}
    </GuestTeamAuthContext.Provider>
  );
}

export function useGuestTeamAuth() {
  const context = useContext(GuestTeamAuthContext);
  if (context === undefined) {
    throw new Error('useGuestTeamAuth must be used within a GuestTeamAuthProvider');
  }
  return context;
}
