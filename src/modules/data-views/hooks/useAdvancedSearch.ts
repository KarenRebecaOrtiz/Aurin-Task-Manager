import { useMemo, useCallback } from 'react';

/**
 * Tipos de datos soportados para búsqueda avanzada
 */
export interface SearchableTask {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  LeadedBy?: string[];
  AssignedTo?: string[];
  CreatedBy?: string;
  [key: string]: any; // Allow additional properties from Task type
}

export interface SearchableClient {
  id: string;
  name?: string;
}

export interface SearchableUser {
  id: string;
  fullName?: string;
}

/**
 * Hook centralizado para búsqueda avanzada en tablas
 * 
 * Busca en:
 * - Nombre de tarea
 * - Descripción de tarea
 * - Estado de tarea
 * - Prioridad de tarea
 * - Nombre de cliente
 * - Nombre de miembros (LeadedBy, AssignedTo, CreatedBy)
 * 
 * @param tasks - Array de tareas a filtrar
 * @param clients - Array de clientes disponibles
 * @param users - Array de usuarios disponibles
 * @param searchQuery - Término de búsqueda
 * @param getInvolvedUserIds - Función para obtener IDs de usuarios involucrados
 * @param searchCategory - Categoría de búsqueda ('task', 'client', 'member') o null para buscar en todo
 * @returns Array de tareas filtradas por búsqueda
 */
export const useAdvancedSearch = (
  tasks: SearchableTask[],
  clients: SearchableClient[],
  users: SearchableUser[],
  searchQuery: string,
  getInvolvedUserIds?: (task: SearchableTask) => string[],
  searchCategory?: 'task' | 'client' | 'member' | null
) => {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }

    const lowerQuery = searchQuery.toLowerCase();

    return tasks.filter((task) => {
      // 1. Search in task fields
      const matchesTaskName = task.name?.toLowerCase().includes(lowerQuery);
      const matchesDescription = task.description?.toLowerCase().includes(lowerQuery);
      const matchesStatus = task.status?.toLowerCase().includes(lowerQuery);
      const matchesPriority = task.priority?.toLowerCase().includes(lowerQuery);

      // 2. Search in client name
      const client = clients.find((c) => c.id === task.clientId);
      const matchesClientName = client?.name?.toLowerCase().includes(lowerQuery);

      // 3. Search in assigned/lead user names
      let matchesUserName = false;
      if (getInvolvedUserIds) {
        const involvedUserIds = getInvolvedUserIds(task);
        matchesUserName = involvedUserIds.some((userId) => {
          const user = users.find((u) => u.id === userId);
          return user?.fullName?.toLowerCase().includes(lowerQuery);
        });
      } else {
        // Fallback: search directly in task user fields
        const allUserIds = new Set<string>();
        if (task.LeadedBy) task.LeadedBy.forEach((id) => allUserIds.add(id));
        if (task.AssignedTo) task.AssignedTo.forEach((id) => allUserIds.add(id));
        if (task.CreatedBy) allUserIds.add(task.CreatedBy);

        matchesUserName = Array.from(allUserIds).some((userId) => {
          const user = users.find((u) => u.id === userId);
          return user?.fullName?.toLowerCase().includes(lowerQuery);
        });
      }

      // Apply category filter if specified
      if (searchCategory === 'task') {
        return matchesTaskName || matchesDescription || matchesStatus || matchesPriority;
      } else if (searchCategory === 'client') {
        return matchesClientName;
      } else if (searchCategory === 'member') {
        return matchesUserName;
      }

      // Default: search in all fields
      return (
        matchesTaskName ||
        matchesDescription ||
        matchesStatus ||
        matchesPriority ||
        matchesClientName ||
        matchesUserName
      );
    });
  }, [tasks, clients, users, searchQuery, getInvolvedUserIds, searchCategory]);
};

/**
 * Hook para aplicar múltiples filtros a tareas
 * 
 * @param tasks - Array de tareas a filtrar
 * @param clients - Array de clientes disponibles
 * @param users - Array de usuarios disponibles
 * @param filters - Objeto con filtros a aplicar
 * @param getInvolvedUserIds - Función para obtener IDs de usuarios involucrados
 * @returns Array de tareas filtradas
 */
export const useTaskFiltering = (
  tasks: SearchableTask[],
  clients: SearchableClient[],
  users: SearchableUser[],
  filters: {
    searchQuery?: string;
    priorityFilter?: string;
    statusFilter?: string;
    clientFilter?: string;
    userFilter?: string;
    userId?: string;
  },
  getInvolvedUserIds?: (task: SearchableTask) => string[]
) => {
  const {
    searchQuery = '',
    priorityFilter = '',
    statusFilter = '',
    clientFilter = '',
    userFilter = '',
    userId = '',
  } = filters;

  // Apply advanced search first
  const searchFiltered = useAdvancedSearch(
    tasks,
    clients,
    users,
    searchQuery,
    getInvolvedUserIds
  );

  // Then apply other filters
  return useMemo(() => {
    let result = searchFiltered;

    // Filter by priority
    if (priorityFilter) {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    // Filter by status
    if (statusFilter) {
      result = result.filter((task) => task.status === statusFilter);
    }

    // Filter by client
    if (clientFilter) {
      result = result.filter((task) => task.clientId === clientFilter);
    }

    // Filter by user
    if (userFilter) {
      if (userFilter === 'me') {
        result = result.filter((task) => {
          if (!getInvolvedUserIds) return false;
          const involved = getInvolvedUserIds(task);
          return involved.includes(userId);
        });
      } else if (userFilter) {
        result = result.filter((task) => {
          if (!getInvolvedUserIds) return false;
          const involved = getInvolvedUserIds(task);
          return involved.includes(userFilter);
        });
      }
    }

    return result;
  }, [
    searchFiltered,
    priorityFilter,
    statusFilter,
    clientFilter,
    userFilter,
    userId,
    getInvolvedUserIds,
  ]);
};
