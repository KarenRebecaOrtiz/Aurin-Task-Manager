/**
 * Teams Store - Zustand State Management
 *
 * Centralized store for teams state with support for filtering by client/workspace.
 * Follows the pattern established in workspacesStore.ts
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import type { Team } from '../types';

interface TeamsState {
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
}

interface TeamsActions {
  setTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  removeTeam: (teamId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
  getTeamsByClient: (clientId: string) => Team[];
}

const initialState: TeamsState = {
  teams: [],
  isLoading: false,
  error: null,
};

export const useTeamsStore = create<TeamsState & TeamsActions>((set, get) => ({
  ...initialState,

  setTeams: (teams) => set({ teams }),

  addTeam: (team) =>
    set((state) => ({
      teams: [...state.teams, team],
    })),

  updateTeam: (teamId, updates) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId
          ? { ...team, ...updates, updatedAt: new Date().toISOString() }
          : team
      ),
    })),

  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  getTeamsByClient: (clientId) => {
    const { teams } = get();
    return teams.filter((team) => team.clientId === clientId);
  },
}));

// Selector hooks for optimized re-renders
export const useTeams = () => useTeamsStore((state) => state.teams);

export const useTeamsLoading = () => useTeamsStore((state) => state.isLoading);

export const useTeamsError = () => useTeamsStore((state) => state.error);

export const useTeamsByClient = (clientId: string | null) => {
  const teams = useTeamsStore(useShallow((state) => state.teams));
  return useMemo(() => {
    if (!clientId) return [];
    return teams.filter((team) => team.clientId === clientId);
  }, [teams, clientId]);
};

export const useTeamById = (teamId: string | null) => {
  const teams = useTeamsStore(useShallow((state) => state.teams));
  return useMemo(() => {
    if (!teamId) return null;
    return teams.find((team) => team.id === teamId) || null;
  }, [teams, teamId]);
};
