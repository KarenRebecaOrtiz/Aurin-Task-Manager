import { useMemo } from 'react';
import { useAdvancedSearch } from '@/modules/data-views/hooks/useAdvancedSearch';
import { useWorkspacesStore, ALL_WORKSPACES_ID } from '@/stores/workspacesStore';

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface StatusColumn {
  id: string;
  label: string;
  value: string;
}

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface UseKanbanGroupingProps {
  effectiveTasks: Task[];
  effectiveClients: Client[];
  effectiveUsers: User[];
  statusColumns: StatusColumn[];
  normalizeStatus: (status: string) => string;
  getInvolvedUserIds: (task: Task) => string[];
  userId: string;
  isAdmin: boolean;
  searchQuery: string[];
  searchCategory: 'task' | 'project' | 'member' | null;
  priorityFilter: string;
  priorityFilters: string[]; // New array for multiple priority filters
  clientFilter: string;
  userFilter: string;
}

export const useKanbanGrouping = ({
  effectiveTasks,
  effectiveClients,
  effectiveUsers,
  statusColumns,
  normalizeStatus,
  getInvolvedUserIds,
  userId,
  isAdmin,
  searchQuery,
  searchCategory,
  priorityFilter,
  priorityFilters,
  clientFilter,
  userFilter,
}: UseKanbanGroupingProps) => {
  // 🏢 Workspace (Filtro Global de Cuenta)
  const selectedWorkspaceId = useWorkspacesStore((state) => state.selectedWorkspaceId);
  const isFilteringByWorkspace = selectedWorkspaceId !== null && selectedWorkspaceId !== ALL_WORKSPACES_ID;

  // Apply advanced search first (like TasksTable)
  const nonArchivedTasks = useMemo(() =>
    effectiveTasks.filter((task) => !task.archived),
    [effectiveTasks]
  );

  const searchFiltered = useAdvancedSearch(
    nonArchivedTasks,
    effectiveClients,
    effectiveUsers,
    searchQuery,
    getInvolvedUserIds,
    searchCategory
  );

  // Group tasks by status - essential for Kanban functionality
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};

    // Initialize empty arrays for all columns
    statusColumns.forEach((column) => {
      groups[column.id] = [];
    });

    // Process search-filtered tasks with permission and other filters
    searchFiltered
      .filter((task) => {
        // 🔒 FILTRO DE PERMISOS: Solo admins o usuarios involucrados pueden ver la tarea
        const canViewTask = isAdmin || getInvolvedUserIds(task as Task).includes(userId);
        if (!canViewTask) return false;

        // 🏢 FILTRO GLOBAL DE WORKSPACE (CUENTA) - Aplicar PRIMERO
        if (isFilteringByWorkspace && task.clientId !== selectedWorkspaceId) {
          return false;
        }

        return true;
      })
      .forEach((task) => {
        const normalizedStatus = normalizeStatus(task.status);
        const columnId = normalizedStatus.toLowerCase().replace(/\s+/g, '-');

        // Map status to column IDs
        const statusToColumnMap: { [key: string]: string } = {
          'por-iniciar': 'por-iniciar',
          'en-proceso': 'en-proceso',
          'backlog': 'backlog',
          'por-finalizar': 'por-finalizar',
          'finalizado': 'finalizado',
          'cancelado': 'cancelado',
        };

        const targetColumn = statusToColumnMap[columnId] || 'por-iniciar';

        // Apply remaining filters (search is already handled by useAdvancedSearch)

        // Apply priority filters (support both single and multiple filters - same logic as TasksTable)
        let matchesPriority = true;
        if (priorityFilter) {
          matchesPriority = task.priority === priorityFilter;
        } else if (priorityFilters.length > 0) {
          matchesPriority = priorityFilters.includes(task.priority);
        }

        const matchesClient = !clientFilter || task.clientId === clientFilter;

        let matchesUser = true;
        if (userFilter === 'me') {
          const involvedUserIds = getInvolvedUserIds(task as Task);
          matchesUser = involvedUserIds.includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          const involvedUserIds = getInvolvedUserIds(task as Task);
          matchesUser = involvedUserIds.includes(userFilter);
        }

        if (matchesPriority && matchesClient && matchesUser) {
          if (groups[targetColumn]) {
            groups[targetColumn].push(task as Task);
          }
        }
      });

    // Sort tasks within each column by lastActivity
    Object.keys(groups).forEach((columnId) => {
      groups[columnId].sort((a, b) => {
        const dateA = new Date(a.lastActivity || a.createdAt).getTime();
        const dateB = new Date(b.lastActivity || b.createdAt).getTime();
        return dateB - dateA; // Most recent first
      });
    });

    return groups;
  }, [
    searchFiltered,
    statusColumns,
    normalizeStatus,
    getInvolvedUserIds,
    userId,
    isAdmin,
    isFilteringByWorkspace,
    selectedWorkspaceId,
    priorityFilter,
    priorityFilters,
    clientFilter,
    userFilter,
  ]);

  return { groupedTasks };
};
