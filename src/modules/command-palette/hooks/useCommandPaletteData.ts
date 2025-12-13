/**
 * useCommandPaletteData Hook
 *
 * Obtiene y procesa los datos para el Command Palette desde los stores globales.
 * Calcula proyectos, miembros y tareas según el nivel de navegación actual.
 *
 * @module command-palette/hooks/useCommandPaletteData
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataStore } from '@/stores/userDataStore';
import type {
  NavigationState,
  WorkspaceCommandItem,
  ProjectCommandItem,
  MemberCommandItem,
  TaskCommandItem,
  TeamCommandItem,
} from '../types/commandPalette.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCommandPaletteDataProps {
  navigationState: NavigationState;
  searchQuery: string;
}

export interface UseCommandPaletteDataReturn {
  workspaces: WorkspaceCommandItem[];
  projects: ProjectCommandItem[];
  members: MemberCommandItem[];
  tasks: TaskCommandItem[];
  teams: TeamCommandItem[];
  isLoading: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommandPaletteData({
  navigationState,
  searchQuery,
}: UseCommandPaletteDataProps): UseCommandPaletteDataReturn {
  const { isAdmin } = useAuth();
  const currentUserId = useUserDataStore((state) => state.userData?.userId || '');

  // Obtener datos de los stores globales
  const { clients, tasks: allTasks, users: allUsers, teams: allTeams } = useDataStore(
    useShallow((state) => ({
      clients: state.clients,
      tasks: state.tasks,
      users: state.users,
      teams: state.teams,
    }))
  );

  const { workspaces: storeWorkspaces } = useWorkspacesStore(
    useShallow((state) => ({
      workspaces: state.workspaces,
    }))
  );

  // ============================================================================
  // WORKSPACES (Nivel root)
  // ============================================================================

  const workspaces = useMemo((): WorkspaceCommandItem[] => {
    const items = storeWorkspaces.map((ws): WorkspaceCommandItem => {
      // Contar tareas de este workspace
      const taskCount = allTasks.filter((t) => t.clientId === ws.id).length;

      // Obtener proyectos únicos
      const client = clients.find((c) => c.id === ws.id);
      const projectCount = client?.projects?.length || 0;

      return {
        id: ws.id,
        type: 'workspace',
        title: ws.name,
        subtitle: `${taskCount} tarea${taskCount !== 1 ? 's' : ''}`,
        logo: ws.logo,
        taskCount,
        projectCount,
        badge: taskCount > 0 ? taskCount : undefined,
      };
    });

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [storeWorkspaces, allTasks, clients, searchQuery]);

  // ============================================================================
  // PROJECTS (Nivel workspace)
  // ============================================================================

  const projects = useMemo((): ProjectCommandItem[] => {
    if (navigationState.level !== 'workspace' || !navigationState.workspaceId) {
      return [];
    }

    const client = clients.find((c) => c.id === navigationState.workspaceId);
    if (!client?.projects) return [];

    const items = client.projects.map((projectName): ProjectCommandItem => {
      // Contar tareas de este proyecto
      const taskCount = allTasks.filter(
        (t) =>
          t.clientId === navigationState.workspaceId &&
          t.project === projectName
      ).length;

      return {
        id: `project-${projectName}`,
        type: 'project',
        title: projectName,
        subtitle: `${taskCount} tarea${taskCount !== 1 ? 's' : ''}`,
        workspaceId: navigationState.workspaceId!,
        taskCount,
        badge: taskCount > 0 ? taskCount : undefined,
      };
    });

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter((item) => item.title.toLowerCase().includes(query));
    }

    // Ordenar por cantidad de tareas (más tareas primero)
    return items.sort((a, b) => b.taskCount - a.taskCount);
  }, [navigationState.level, navigationState.workspaceId, clients, allTasks, searchQuery]);

  // ============================================================================
  // MEMBERS (Usuarios con tareas en el contexto actual)
  // ============================================================================

  const members = useMemo((): MemberCommandItem[] => {
    let relevantTasks = allTasks;

    // Filtrar tareas según el nivel de navegación
    if (navigationState.workspaceId) {
      relevantTasks = relevantTasks.filter(
        (t) => t.clientId === navigationState.workspaceId
      );
    }

    if (navigationState.projectName) {
      relevantTasks = relevantTasks.filter(
        (t) => t.project === navigationState.projectName
      );
    }

    // Obtener usuarios únicos involucrados en las tareas
    const userTaskCounts = new Map<string, number>();

    relevantTasks.forEach((task) => {
      const involvedUsers = [
        task.CreatedBy,
        ...(task.AssignedTo || []),
        ...(task.LeadedBy || []),
      ].filter(Boolean);

      involvedUsers.forEach((userId) => {
        userTaskCounts.set(userId, (userTaskCounts.get(userId) || 0) + 1);
      });
    });

    const items: MemberCommandItem[] = [];

    userTaskCounts.forEach((taskCount, oduserId) => {
      const user = allUsers.find((u) => u.id === oduserId);
      if (!user) return;

      items.push({
        id: oduserId,
        type: 'member',
        title: user.fullName || 'Usuario',
        subtitle: `${taskCount} tarea${taskCount !== 1 ? 's' : ''}`,
        userId: oduserId,
        avatar: user.imageUrl,
        taskCount,
        badge: taskCount > 0 ? taskCount : undefined,
      });
    });

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter((item) => item.title.toLowerCase().includes(query));
    }

    // Ordenar por cantidad de tareas
    return items.sort((a, b) => b.taskCount - a.taskCount);
  }, [navigationState.workspaceId, navigationState.projectName, allTasks, allUsers, searchQuery]);

  // ============================================================================
  // TASKS (Nivel proyecto o miembro)
  // ============================================================================

  const tasks = useMemo((): TaskCommandItem[] => {
    let filteredTasks = allTasks.filter((t) => !t.archived);

    // Filtrar por workspace
    if (navigationState.workspaceId) {
      filteredTasks = filteredTasks.filter(
        (t) => t.clientId === navigationState.workspaceId
      );
    }

    // Filtrar por proyecto
    if (navigationState.projectName) {
      filteredTasks = filteredTasks.filter(
        (t) => t.project === navigationState.projectName
      );
    }

    // Filtrar por miembro
    if (navigationState.memberId) {
      filteredTasks = filteredTasks.filter((t) => {
        const isInvolved =
          t.CreatedBy === navigationState.memberId ||
          (t.AssignedTo || []).includes(navigationState.memberId!) ||
          (t.LeadedBy || []).includes(navigationState.memberId!);
        return isInvolved;
      });
    }

    const items = filteredTasks.map((task): TaskCommandItem => {
      const client = clients.find((c) => c.id === task.clientId);

      return {
        id: task.id,
        type: 'task',
        title: task.name,
        subtitle: task.project,
        taskId: task.id,
        priority: task.priority as 'Alta' | 'Media' | 'Baja',
        status: task.status,
        projectName: task.project,
        clientName: client?.name || 'Sin cuenta',
      };
    });

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query)
      );
    }

    return items;
  }, [
    navigationState.workspaceId,
    navigationState.projectName,
    navigationState.memberId,
    allTasks,
    clients,
    searchQuery,
  ]);

  // ============================================================================
  // TEAMS (Visibles según permisos: miembro o público)
  // ============================================================================

  const teams = useMemo((): TeamCommandItem[] => {
    // Verificar que allTeams exista (puede ser undefined mientras carga)
    if (!allTeams || allTeams.length === 0) return [];

    // Filtrar teams visibles para el usuario
    const visibleTeams = allTeams.filter((team) => {
      // Admin ve todos
      if (isAdmin) return true;
      // Usuario ve teams donde es miembro
      if (team.memberIds?.includes(currentUserId)) return true;
      // Usuario ve teams públicos
      if (team.isPublic) return true;
      return false;
    });

    const items = visibleTeams.map((team): TeamCommandItem => ({
      id: team.id,
      type: 'team',
      title: team.name,
      subtitle: `${team.memberIds?.length || 0} miembro${(team.memberIds?.length || 0) !== 1 ? 's' : ''}`,
      teamId: team.id,
      memberCount: team.memberIds?.length || 0,
      isPublic: team.isPublic || false,
      badge: team.isPublic ? 'Público' : undefined,
    }));

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return items.filter((item) => item.title.toLowerCase().includes(query));
    }

    return items;
  }, [allTeams, isAdmin, currentUserId, searchQuery]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  const isLoading = useMemo(() => {
    return clients.length === 0 && allTasks.length === 0;
  }, [clients.length, allTasks.length]);

  return {
    workspaces,
    projects,
    members,
    tasks,
    teams,
    isLoading,
  };
}

export default useCommandPaletteData;
