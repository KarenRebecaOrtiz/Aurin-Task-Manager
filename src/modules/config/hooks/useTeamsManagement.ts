/**
 * @module config/hooks/useTeamsManagement
 * @description Hook para manejar la gestión de equipos y miembros
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, TeamMembersMap } from '../types';

/**
 * Hook para manejar la gestión de equipos
 */
export const useTeamsManagement = (selectedTeams: string[] = []) => {
  const [teamMembers, setTeamMembers] = useState<TeamMembersMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estabilizar la referencia del array para evitar re-renders innecesarios
  const stableTeams = useMemo(() => selectedTeams, [JSON.stringify(selectedTeams)]);

  /**
   * Obtiene los miembros de los equipos seleccionados
   */
  const fetchTeamMembers = useCallback(async () => {
    console.log('[useTeamsManagement] fetchTeamMembers called with stableTeams:', stableTeams);

    if (stableTeams.length === 0) {
      console.log('[useTeamsManagement] No teams selected, clearing members');
      setTeamMembers({});
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const membersMap: TeamMembersMap = {};

      for (const team of stableTeams) {
        console.log('[useTeamsManagement] Fetching members for team:', team);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('teams', 'array-contains', team));
        const querySnapshot = await getDocs(q);

        const members: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('[useTeamsManagement] Found member:', { id: doc.id, fullName: data.fullName, teams: data.teams });
          members.push({
            id: doc.id,
            fullName: data.fullName || 'Sin nombre',
            teams: data.teams || [],
            role: data.role || '',
            profilePhoto: data.profilePhoto || '/empty-image.png',
          });
        });

        console.log('[useTeamsManagement] Team', team, 'has', members.length, 'members');
        membersMap[team] = members;
      }

      console.log('[useTeamsManagement] Final membersMap:', membersMap);
      setTeamMembers(membersMap);
    } catch (err) {
      console.error('[useTeamsManagement] Error fetching team members:', err);
      setError('Error al cargar los miembros del equipo');
    } finally {
      setLoading(false);
    }
  }, [stableTeams]);

  /**
   * Obtiene el número total de miembros en todos los equipos
   */
  const getTotalMembers = useCallback((): number => {
    return Object.values(teamMembers).reduce((total, members) => total + members.length, 0);
  }, [teamMembers]);

  /**
   * Obtiene los miembros de un equipo específico
   */
  const getTeamMembers = useCallback((teamName: string): User[] => {
    return teamMembers[teamName] || [];
  }, [teamMembers]);

  /**
   * Verifica si un equipo tiene miembros
   */
  const hasMembers = useCallback((teamName: string): boolean => {
    return (teamMembers[teamName]?.length || 0) > 0;
  }, [teamMembers]);

  /**
   * Carga los miembros cuando cambian los equipos seleccionados
   */
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return {
    teamMembers,
    loading,
    error,
    fetchTeamMembers,
    getTotalMembers,
    getTeamMembers,
    hasMembers,
  };
};
