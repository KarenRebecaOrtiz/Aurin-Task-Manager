'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CommandPalette, type SearchCategory, type PriorityLevel, type StatusLevel } from '@/modules/command-palette';
import { ViewSwitcher } from './ViewSwitcher';
import { WorkspacesDropdown } from '@/components/ui/workspaces';
import { ClientDialog } from '@/modules/client-crud/components/ClientDialog';
import ProfileCard from '@/modules/profile-card/components/ProfileCard';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import {
  useWorkspacesStore,
  ALL_WORKSPACES_ID,
  type Workspace,
} from '@/stores/workspacesStore';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useUserDataStore } from '@/stores/userDataStore';
import styles from './TasksHeader.module.scss';

interface TasksHeaderProps {
  searchQuery: string[] | string;
  setSearchQuery: (query: string[]) => void;
  searchCategory: SearchCategory | null;
  setSearchCategory: (category: SearchCategory | null) => void;
  onPriorityFiltersChange?: (priorities: string[]) => void;
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;
  currentView?: 'table' | 'kanban' | 'archive';
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  searchCategory,
  setSearchCategory,
  onPriorityFiltersChange,
  onStatusFiltersChange,
  currentView = 'table',
}) => {
  // Estado para diálogo de cliente (crear/editar)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientDialogMode, setClientDialogMode] = useState<'create' | 'edit'>('create');
  const [editingClientId, setEditingClientId] = useState<string | undefined>(undefined);

  // Estado para ProfileCard
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);

  const { workspaces, selectedWorkspaceId, setWorkspacesFromClients, setSelectedWorkspace } = useWorkspacesStore();

  // Auth y datos del usuario
  const { isAdmin } = useAuth();
  const userId = useUserDataStore((state) => state.userData?.userId || '');

  // Obtener clientes, tareas y teams del store global (dataStore es la fuente de verdad)
  const { allClients, tasks, teams } = useDataStore(
    useShallow((state) => ({
      allClients: state.clients,
      tasks: state.tasks,
      teams: state.teams,
    }))
  );

  // Calcular qué clientes puede ver el usuario basado en sus tareas
  const userVisibleClientIds = useMemo(() => {
    // Si no hay tareas aún, no podemos calcular
    if (tasks.length === 0) {
      return null;
    }

    if (isAdmin) {
      return null; // Admin ve todos los clientes
    }

    // Usuario normal: solo clientes de tareas donde está involucrado
    const clientIds = new Set<string>();
    tasks.forEach((task) => {
      const isInvolved =
        task.CreatedBy === userId ||
        (Array.isArray(task.AssignedTo) && task.AssignedTo.includes(userId)) ||
        (Array.isArray(task.LeadedBy) && task.LeadedBy.includes(userId));

      if (isInvolved && task.clientId) {
        clientIds.add(task.clientId);
      }
    });

    // Si el usuario no tiene tareas asignadas, mostrar set vacío (no verá clientes)
    return clientIds;
  }, [isAdmin, tasks, userId]);

  // Inicializar workspaces desde clientes reales
  useEffect(() => {
    // Solo ejecutar cuando tengamos clientes cargados
    if (allClients.length === 0) {
      return;
    }

    // Para admin o cuando userVisibleClientIds es null, mostrar todos
    // Para usuarios normales, filtrar por sus clientes visibles
    setWorkspacesFromClients(allClients, userVisibleClientIds ?? undefined);
  }, [allClients, userVisibleClientIds, setWorkspacesFromClients]);

  // Handle workspace change
  const handleWorkspaceChange = useCallback((workspace: Workspace | null) => {
    setSelectedWorkspace(workspace?.id || ALL_WORKSPACES_ID);
  }, [setSelectedWorkspace]);

  // Handle create account (crear cuenta/cliente)
  const handleCreateAccount = useCallback(() => {
    setClientDialogMode('create');
    setEditingClientId(undefined);
    setIsClientDialogOpen(true);
  }, []);

  // Handle edit account (editar cuenta/cliente) - Solo admins
  const handleEditAccount = useCallback((clientId: string) => {
    setClientDialogMode('edit');
    setEditingClientId(clientId);
    setIsClientDialogOpen(true);
  }, []);

  // Convert PriorityLevel[] to string[] for the store
  const handlePriorityFiltersChange = useCallback((priorities: PriorityLevel[]) => {
    onPriorityFiltersChange?.(priorities as string[]);
  }, [onPriorityFiltersChange]);

  // Convert StatusLevel[] to string[] for the store
  const handleStatusFiltersChange = useCallback((statuses: StatusLevel[]) => {
    onStatusFiltersChange?.(statuses);
  }, [onStatusFiltersChange]);

  // Handle workspace selection from CommandPalette
  const handleWorkspaceSelectFromPalette = useCallback((workspaceId: string | null) => {
    setSelectedWorkspace(workspaceId || ALL_WORKSPACES_ID);
  }, [setSelectedWorkspace]);

  // Handle task selection from CommandPalette (Ver Tarea - abre el chat sidebar como al hacer clic en la tabla)
  const handleTaskSelect = useCallback((taskId: string) => {
    // Buscar la tarea y el cliente
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const client = allClients.find((c) => c.id === task.clientId);
    const clientName = client?.name || 'Sin cuenta';

    // Abrir el chat sidebar (igual que al hacer clic en una fila de la tabla)
    const { openChatSidebar } = useSidebarStateStore.getState();
    openChatSidebar(task as any, clientName);
  }, [tasks, allClients]);

  // Handle edit task from CommandPalette (Editar Tarea - solo abrir sidebar)
  const handleEditTask = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  // Handle edit client from CommandPalette (Editar Cuenta)
  const handleEditClientFromPalette = useCallback((clientId: string) => {
    setClientDialogMode('edit');
    setEditingClientId(clientId);
    setIsClientDialogOpen(true);
  }, []);

  // Handle delete task from CommandPalette
  const handleDeleteTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId, task?.name);
  }, [tasks]);

  // Handle member selection from CommandPalette - Abre ProfileCard
  const handleMemberSelect = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setIsProfileOpen(true);
  }, []);

  // Handle profile close
  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
    setSelectedMemberId(undefined);
  }, []);

  // Handle team selection from CommandPalette - Abre el chat del equipo
  const handleTeamSelect = useCallback((teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const client = allClients.find((c) => c.id === team.clientId);
    const clientName = client?.name || 'Sin cuenta';

    const { openTeamSidebar } = useSidebarStateStore.getState();
    openTeamSidebar(team, clientName);
  }, [teams, allClients]);

  return (
    <>
      <div className={styles.headerWrapper}>
        {/* Main Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchSection}>
            {/* Account/Client Selector (Workspace) */}
            <WorkspacesDropdown
              workspaces={workspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              onWorkspaceChange={handleWorkspaceChange}
              onCreateWorkspace={isAdmin ? handleCreateAccount : undefined}
              onEditWorkspace={isAdmin ? handleEditAccount : undefined}
            />

            {/* Enhanced Command Palette Search */}
            <CommandPalette
              onPriorityFiltersChange={handlePriorityFiltersChange}
              onStatusFiltersChange={handleStatusFiltersChange}
              onWorkspaceSelect={handleWorkspaceSelectFromPalette}
              onMemberSelect={handleMemberSelect}
              onTaskSelect={handleTaskSelect}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onEditClient={isAdmin ? handleEditClientFromPalette : undefined}
              onTeamSelect={handleTeamSelect}
              placeholder="Buscar proyectos, tareas o miembros..."
            />
          </div>
        </div>

        {/* View Switcher - Floating dock at bottom */}
        <ViewSwitcher />
      </div>

      {/* Client/Account Dialog (Create/Edit) */}
      <ClientDialog
        isOpen={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        mode={clientDialogMode}
        clientId={editingClientId}
      />

      {/* Profile Card Dialog */}
      {selectedMemberId && (
        <ProfileCard
          isOpen={isProfileOpen}
          userId={selectedMemberId}
          onClose={handleProfileClose}
        />
      )}
    </>
  );
};

export default TasksHeader;
