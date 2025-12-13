import { useMemo } from 'react';
import { Task } from '@/types';

/**
 * Tipos de datos soportados para búsqueda avanzada
 */
export type SearchableTask = Task;

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
 * - Proyecto de tarea
 * - Nombre de miembros (LeadedBy, AssignedTo, CreatedBy)
 *
 * NOTA: La búsqueda por Cuenta/Cliente se hace con el WorkspacesDropdown global
 *
 * @param tasks - Array de tareas a filtrar
 * @param clients - Array de clientes disponibles
 * @param users - Array de usuarios disponibles
 * @param searchQuery - Término de búsqueda
 * @param getInvolvedUserIds - Función para obtener IDs de usuarios involucrados
 * @param searchCategory - Categoría de búsqueda ('task', 'project', 'member') o null para buscar en todo
 * @returns Array de tareas filtradas por búsqueda
 */
export const useAdvancedSearch = (
  tasks: SearchableTask[],
  clients: SearchableClient[],
  users: SearchableUser[],
  keywords: string[],
  getInvolvedUserIds?: (task: SearchableTask) => string[],
  searchCategory?: 'task' | 'project' | 'member' | null
) => {
  return useMemo(() => {
    if (!keywords || keywords.length === 0) {
      return tasks;
    }

    // Lowercase keywords for case-insensitive search
    const lowerKeywords = keywords.map((kw) => kw.toLowerCase());

    return tasks.filter((task) => {
      // Collect searchable fields
      const fields: string[] = [];
      if (searchCategory === 'task' || !searchCategory) {
        fields.push(task.name || '', task.description || '', task.status || '', task.priority || '');
      }
      // Buscar por proyecto (campo 'project' de la tarea)
      if ((searchCategory === 'project' || !searchCategory) && task.project) {
        fields.push(task.project);
      }
      if ((searchCategory === 'member' || !searchCategory) && getInvolvedUserIds) {
        const userIds = getInvolvedUserIds(task);
        userIds.forEach((uid) => {
          const user = users.find((u) => u.id === uid);
          if (user?.fullName) fields.push(user.fullName);
        });
      } else if ((searchCategory === 'member' || !searchCategory)) {
        // Fallback: search directly in task user fields
        const allUserIds = new Set<string>();
        if (task.LeadedBy) task.LeadedBy.forEach((id) => allUserIds.add(id));
        if (task.AssignedTo) task.AssignedTo.forEach((id) => allUserIds.add(id));
        if (task.CreatedBy) allUserIds.add(task.CreatedBy);
        Array.from(allUserIds).forEach((userId) => {
          const user = users.find((u) => u.id === userId);
          if (user?.fullName) fields.push(user.fullName);
        });
      }
      const searchable = fields.join(' ').toLowerCase();
      // Check if all keywords are present
      return lowerKeywords.every((kw) => searchable.includes(kw));
    });
  }, [tasks, clients, users, keywords, getInvolvedUserIds, searchCategory]);
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
    searchQuery?: string[]; // ahora es array de keywords
    priorityFilter?: string;
    statusFilter?: string;
    clientFilter?: string;
    userFilter?: string;
    userId?: string;
  },
  getInvolvedUserIds?: (task: SearchableTask) => string[]
) => {
  const {
    searchQuery: rawSearchQuery = '',
    priorityFilter = '',
    statusFilter = '',
    clientFilter = '',
    userFilter = '',
    userId = '',
  } = filters;

  // Normalizar el query para evitar el error de 'never'
  let normalizedQuery: string[] = [];
  if (Array.isArray(rawSearchQuery)) {
    normalizedQuery = rawSearchQuery as string[];
  } else if (typeof rawSearchQuery === 'string') {
    normalizedQuery = (rawSearchQuery as string)
      .split('+')
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);
  }

  // Apply advanced search first
  const searchFiltered = useAdvancedSearch(
    tasks,
    clients,
    users,
    normalizedQuery,
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
