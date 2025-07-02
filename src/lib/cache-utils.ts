// Cache invalidation utilities

// Función para invalidar cache de clients cuando hay cambios
export const invalidateClientsCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Limpiar cache de localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tasksPageCache_clients_') || key.startsWith('tasksTableCache_clients_') || key.startsWith('membersTableCache_clients_')) {
        localStorage.removeItem(key);
        console.log('[InvalidateCache] Removed client cache key:', key);
      }
    });
    
    console.log('[InvalidateCache] All clients cache invalidated');
  } catch (error) {
    console.error('[InvalidateCache] Error invalidating clients cache:', error);
  }
};

// Función para invalidar cache de usuarios cuando hay cambios
export const invalidateUsersCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Limpiar cache de localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tasksPageCache_users_') || key.startsWith('membersTableCache_users_')) {
        localStorage.removeItem(key);
        console.log('[InvalidateCache] Removed user cache key:', key);
      }
    });
    
    console.log('[InvalidateCache] All users cache invalidated');
  } catch (error) {
    console.error('[InvalidateCache] Error invalidating users cache:', error);
  }
};

// Función para invalidar cache de tasks cuando hay cambios
export const invalidateTasksCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Limpiar cache de localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tasksPageCache_tasks_') || key.startsWith('tasksTableCache_tasks_') || key.startsWith('archiveTableCache_tasks_')) {
        localStorage.removeItem(key);
        console.log('[InvalidateCache] Removed task cache key:', key);
      }
    });
    
    console.log('[InvalidateCache] All tasks cache invalidated');
  } catch (error) {
    console.error('[InvalidateCache] Error invalidating tasks cache:', error);
  }
}; 