'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskSearchBar, type SearchCategory, type PriorityLevel, type StatusLevel } from '@/modules/data-views/components/shared/search';
import { ViewSwitcher } from './ViewSwitcher';
import { WorkspacesDropdown } from '@/components/ui/workspaces';
import { ClientDialog } from '@/modules/client-crud/components/ClientDialog';
// CreateWorkspaceDialog se conserva para futura feature de chats grupales de equipo
// import { CreateWorkspaceDialog } from '@/modules/workspaces/components/CreateWorkspaceDialog';
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

  const { workspaces, selectedWorkspaceId, setWorkspacesFromClients, setSelectedWorkspace } = useWorkspacesStore();

  // Auth y datos del usuario
  const { isAdmin } = useAuth();
  const userId = useUserDataStore((state) => state.userData?.userId || '');

  // Obtener clientes y tareas del store global (dataStore es la fuente de verdad)
  const { allClients, tasks } = useDataStore(
    useShallow((state) => ({
      allClients: state.clients,
      tasks: state.tasks,
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

  // Handle search - memoized to prevent infinite loops
  const handleSearch = useCallback((query: string[], category: SearchCategory | null) => {
    setSearchQuery(query);
    setSearchCategory(category);
  }, [setSearchQuery, setSearchCategory]);

  // Convert PriorityLevel[] to string[] for the store
  const handlePriorityFiltersChange = useCallback((priorities: PriorityLevel[]) => {
    onPriorityFiltersChange?.(priorities as string[]);
  }, [onPriorityFiltersChange]);

  // Convert StatusLevel[] to string[] for the store
  const handleStatusFiltersChange = useCallback((statuses: StatusLevel[]) => {
    onStatusFiltersChange?.(statuses);
  }, [onStatusFiltersChange]);

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

            {/* Advanced Task Search Bar */}
            <TaskSearchBar
              onSearch={handleSearch}
              onPriorityFiltersChange={handlePriorityFiltersChange}
              onStatusFiltersChange={handleStatusFiltersChange}
              placeholder="Buscar tareas, cuentas o miembros..."
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
    </>
  );
};

export default TasksHeader;
