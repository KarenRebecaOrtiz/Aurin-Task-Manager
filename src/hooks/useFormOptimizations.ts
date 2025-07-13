// src/hooks/useFormOptimizations.ts
import { useMemo, useCallback } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

// Hook optimizado para filtrar colaboradores
export const useFilteredCollaborators = (
  searchTerm: string,
  excludeIds: string[] = []
) => {
  const users = useDataStore(useShallow((state) => state.users));

  return useMemo(() => {
    const excludeIdsSet = new Set(excludeIds);
    
    return users.filter((user) => {
      // Excluir usuarios por ID
      if (excludeIdsSet.has(user.id)) {
        return false;
      }
      
      // Filtrar por término de búsqueda
      const searchLower = searchTerm.toLowerCase();
      return (
        user.fullName.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm, excludeIds]); // Arreglar dependencias
};

// Hook optimizado para filtrar líderes
export const useFilteredLeaders = (searchTerm: string) => {
  const users = useDataStore(useShallow((state) => state.users));

  return useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return users.filter((user) => 
      user.fullName.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);
};

// Hook optimizado para filtrar clientes
export const useFilteredClients = (searchTerm: string) => {
  const clients = useDataStore(useShallow((state) => state.clients));

  return useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return clients.filter((client) => 
      client.name.toLowerCase().includes(searchLower) ||
      client.projects.some((project) => 
        project.toLowerCase().includes(searchLower)
      )
    );
  }, [clients, searchTerm]);
};

// Hook optimizado para obtener proyectos de un cliente
export const useClientProjects = (clientId: string) => {
  const clients = useDataStore(useShallow((state) => state.clients));

  return useMemo(() => {
    const client = clients.find((c) => c.id === clientId);
    return client?.projects || [];
  }, [clients, clientId]);
};

// Hook optimizado para obtener información de un cliente
export const useClientInfo = (clientId: string) => {
  const clients = useDataStore(useShallow((state) => state.clients));

  return useMemo(() => {
    return clients.find((c) => c.id === clientId) || null;
  }, [clients, clientId]);
};

// Hook optimizado para filtrar usuarios por IDs
export const useFilteredUsersByIds = (userIds: string[]) => {
  const users = useDataStore(useShallow((state) => state.users));

  return useMemo(() => {
    return users.filter((user) => userIds.includes(user.id));
  }, [users, userIds]); // Arreglar dependencias
};

// Hook optimizado para funciones de animación
export const useAnimationHandlers = () => {
  const animateClick = useCallback((element: HTMLElement) => {
    if (!element) return;
    
    // Usar requestAnimationFrame para optimizar la animación
    requestAnimationFrame(() => {
      element.style.transform = 'scale(0.98)';
      element.style.opacity = '0.9';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';
      }, 150);
    });
  }, []);

  const animateDropdown = useCallback((element: HTMLElement, isOpen: boolean) => {
    if (!element) return;
    
    requestAnimationFrame(() => {
      if (isOpen) {
        element.style.transform = 'scale(0.95) translateY(-10px)';
        element.style.opacity = '0';
        
        setTimeout(() => {
          element.style.transform = 'scale(1) translateY(0)';
          element.style.opacity = '1';
        }, 50);
      } else {
        element.style.transform = 'scale(0.95) translateY(-10px)';
        element.style.opacity = '0';
      }
    });
  }, []);

  return {
    animateClick,
    animateDropdown,
  };
};

// Hook optimizado para manejo de posiciones de dropdown
export const useDropdownPositioning = () => {
  const calculatePosition = useCallback((
    triggerElement: HTMLElement | null,
    dropdownElement: HTMLElement | null
  ) => {
    if (!triggerElement || !dropdownElement) {
      return null;
    }

    const rect = triggerElement.getBoundingClientRect();
    const dropdownRect = dropdownElement.getBoundingClientRect();
    
    // Calcular posición considerando el viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.bottom + window.scrollY + 4;
    let left = rect.left + window.scrollX;
    
    // Ajustar si se sale del viewport
    if (top + dropdownRect.height > viewportHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownRect.height - 4;
    }
    
    if (left + dropdownRect.width > viewportWidth + window.scrollX) {
      left = viewportWidth + window.scrollX - dropdownRect.width - 4;
    }
    
    return { top, left };
  }, []);

  const updatePositionOnResize = useCallback((
    triggerElement: HTMLElement | null,
    dropdownElement: HTMLElement | null,
    updatePosition: (position: { top: number; left: number } | null) => void
  ) => {
    const position = calculatePosition(triggerElement, dropdownElement);
    updatePosition(position);
  }, [calculatePosition]);

  return {
    calculatePosition,
    updatePositionOnResize,
  };
};

// Hook optimizado para debounce
export const useDebounce = (delay: number) => {
  return useCallback(<T extends unknown[]>(func: (...args: T) => void) => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, [delay]);
};

// Hook optimizado para throttle
export const useThrottle = (delay: number) => {
  return useCallback(<T extends unknown[]>(func: (...args: T) => void) => {
    let lastCall = 0;
    
    return (...args: T) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }, [delay]);
}; 