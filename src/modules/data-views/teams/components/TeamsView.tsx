'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useWorkspacesStore, ALL_WORKSPACES_ID } from '@/stores/workspacesStore';
import { useDataStore, type Team } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import type { SearchCategory } from '@/modules/data-views/components/shared/search';
import { CreateTeamDialog, TeamCard } from '@/modules/teams';
import { Button } from '@/components/ui/buttons';
import { Plus, Users } from 'lucide-react';
import styles from './TeamsView.module.scss';

/**
 * TeamsView - Main component for the Teams view
 *
 * Displays team collaboration space filtered by workspace.
 * Follows the same container pattern as TasksTable.
 * Uses the unified dataStore for teams data.
 */
export default function TeamsView() {
  const { user } = useUser();
  const selectedWorkspaceId = useWorkspacesStore((state) => state.selectedWorkspaceId);
  const workspaces = useWorkspacesStore((state) => state.workspaces);

  // Get teams from unified dataStore
  const { teams: allTeams, isLoadingTeams } = useDataStore(
    useShallow((state) => ({
      teams: state.teams,
      isLoadingTeams: state.isLoadingTeams,
    }))
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

  // Filter teams based on selected workspace and user visibility
  const displayedTeams = useMemo(() => {
    if (!allTeams || allTeams.length === 0) return [];

    // Filter by visibility (user's teams or public teams)
    const visibleTeams = allTeams.filter((team) => {
      // User sees teams where they are a member
      if (team.memberIds?.includes(user?.id || '')) return true;
      // User sees public teams
      if (team.isPublic) return true;
      // User sees teams they created
      if (team.createdBy === user?.id) return true;
      return false;
    });

    // If specific workspace selected, filter by clientId
    if (!isAllWorkspaces && selectedWorkspaceId) {
      return visibleTeams.filter((team) => team.clientId === selectedWorkspaceId);
    }

    return visibleTeams;
  }, [allTeams, user?.id, isAllWorkspaces, selectedWorkspaceId]);

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
