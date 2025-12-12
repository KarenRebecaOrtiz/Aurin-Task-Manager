'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useWorkspacesStore, ALL_WORKSPACES_ID } from '@/stores/workspacesStore';
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import type { SearchCategory, StatusLevel } from '@/modules/data-views/components/shared/search';
import { useTeamsStore, useTeamsByClient, teamService } from '@/modules/teams';
import { CreateTeamDialog, TeamCard } from '@/modules/teams';
import type { Team } from '@/modules/teams';
import { Button } from '@/components/ui/buttons';
import { Plus, Users } from 'lucide-react';
import styles from './TeamsView.module.scss';

/**
 * TeamsView - Main component for the Teams view
 *
 * Displays team collaboration space filtered by workspace.
 * Follows the same container pattern as TasksTable.
 */
export default function TeamsView() {
  const { user } = useUser();
  const selectedWorkspaceId = useWorkspacesStore((state) => state.selectedWorkspaceId);
  const workspaces = useWorkspacesStore((state) => state.workspaces);

  // Teams store
  const { setTeams, setLoading, setError } = useTeamsStore();

  // State for all visible teams (when "Todas las cuentas" is selected)
  const [allVisibleTeams, setAllVisibleTeams] = useState<Team[]>([]);
  const teams = useTeamsByClient(
    selectedWorkspaceId !== ALL_WORKSPACES_ID ? selectedWorkspaceId : null
  );

  // Search state (matches TasksTable pattern)
  const [searchQuery, setSearchQuery] = useState<string[]>([]);
  const [searchCategory, setSearchCategory] = useState<SearchCategory | null>(null);

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Handlers with useCallback to prevent re-renders
  const handleSetSearchQuery = useCallback((query: string[]) => {
    setSearchQuery(query);
  }, []);

  const handleSetSearchCategory = useCallback((category: SearchCategory | null) => {
    setSearchCategory(category);
  }, []);

  // Get current workspace name
  const currentWorkspace = useMemo(() => {
    if (selectedWorkspaceId === ALL_WORKSPACES_ID || !selectedWorkspaceId) {
      return null;
    }
    return workspaces.find((ws) => ws.id === selectedWorkspaceId);
  }, [selectedWorkspaceId, workspaces]);

  const isAllWorkspaces = selectedWorkspaceId === ALL_WORKSPACES_ID || !selectedWorkspaceId;

  // Subscribe to teams for selected workspace
  useEffect(() => {
    if (isAllWorkspaces || !selectedWorkspaceId) {
      return;
    }

    setLoading(true);
    const unsubscribe = teamService.subscribeToTeamsByClient(
      selectedWorkspaceId,
      (fetchedTeams) => {
        setTeams(fetchedTeams);
        setLoading(false);
      },
      (error) => {
        console.error('[TeamsView] Error fetching teams:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedWorkspaceId, isAllWorkspaces, setTeams, setLoading, setError]);

  // Subscribe to all visible teams when "Todas las cuentas" is selected
  useEffect(() => {
    if (!isAllWorkspaces || !user?.id) {
      setAllVisibleTeams([]);
      return;
    }

    setLoading(true);
    const unsubscribe = teamService.subscribeToAllVisibleTeams(
      user.id,
      (fetchedTeams) => {
        setAllVisibleTeams(fetchedTeams);
        setLoading(false);
      },
      (error) => {
        console.error('[TeamsView] Error fetching all visible teams:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAllWorkspaces, user?.id, setLoading, setError]);

  // Get the appropriate teams list based on selection
  const displayedTeams = useMemo(() => {
    return isAllWorkspaces ? allVisibleTeams : teams;
  }, [isAllWorkspaces, allVisibleTeams, teams]);

  // Handle create team button click
  const handleCreateTeam = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // Handle dialog close
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open);
  }, []);

  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    if (searchQuery.length === 0) return displayedTeams;

    return displayedTeams.filter((team) => {
      const searchLower = searchQuery.join(' ').toLowerCase();
      return (
        team.name.toLowerCase().includes(searchLower) ||
        team.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [displayedTeams, searchQuery]);

  return (
    <div className={styles.container}>
      <TasksHeader
        searchQuery={searchQuery}
        setSearchQuery={handleSetSearchQuery}
        searchCategory={searchCategory}
        setSearchCategory={handleSetSearchCategory}
        currentView="table"
      />

      <div className={styles.content}>
        <div className={styles.workspaceContent}>
          {/* Header with create button */}
          <div className={styles.workspaceHeader}>
            <div className={styles.workspaceInfo}>
              <h2 className={styles.workspaceTitle}>
                {isAllWorkspaces ? 'Todos los equipos' : `Equipos de ${currentWorkspace?.name}`}
              </h2>
              <p className={styles.workspaceSubtitle}>
                {displayedTeams.length === 0
                  ? isAllWorkspaces
                    ? 'No tienes acceso a ningún equipo aún'
                    : 'Crea tu primer equipo para comenzar a colaborar'
                  : `${displayedTeams.length} equipo${displayedTeams.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!isAllWorkspaces && (
              <Button intent="primary" onClick={handleCreateTeam}>
                <Plus className="w-4 h-4 mr-2" />
                Crear equipo
              </Button>
            )}
          </div>

          {/* Teams Grid or Empty State */}
          {filteredTeams.length === 0 ? (
            <div className={styles.noTeams}>
              <div className={styles.noTeamsIcon}>
                <Users className="w-12 h-12" />
              </div>
              <h3 className={styles.noTeamsTitle}>
                {searchQuery.length > 0
                  ? 'No se encontraron equipos'
                  : isAllWorkspaces
                    ? 'Sin equipos visibles'
                    : 'Sin equipos aún'}
              </h3>
              <p className={styles.noTeamsDescription}>
                {searchQuery.length > 0
                  ? 'Intenta con otros términos de búsqueda'
                  : isAllWorkspaces
                    ? 'Selecciona una cuenta específica para crear un nuevo equipo.'
                    : 'Crea un equipo para comenzar a colaborar con tu equipo de trabajo.'}
              </p>
              {searchQuery.length === 0 && !isAllWorkspaces && (
                <Button intent="primary" onClick={handleCreateTeam}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer equipo
                </Button>
              )}
            </div>
          ) : (
            <div className={styles.teamsGrid}>
              {filteredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Dialog */}
      {selectedWorkspaceId && selectedWorkspaceId !== ALL_WORKSPACES_ID && (
        <CreateTeamDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={handleDialogOpenChange}
          clientId={selectedWorkspaceId}
          mode="create"
        />
      )}

    </div>
  );
}
