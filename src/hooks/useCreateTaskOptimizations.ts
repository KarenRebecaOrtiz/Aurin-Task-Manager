// src/hooks/useCreateTaskOptimizations.ts
import { useCallback, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { gsap } from 'gsap';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

// Hook para filtros optimizados de colaboradores
export const useFilteredCollaborators = (
  searchQuery: string,
  excludedUserIds: string[] = []
) => {
  const { users } = useDataStore(useShallow(state => ({ users: state.users })));
  
  return useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users
      .filter((user) => {
        const matchesSearch = !searchQuery || 
          user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const notExcluded = !excludedUserIds.includes(user.id);
        
        return matchesSearch && notExcluded;
      })
      .slice(0, 50); // Aumentado a 50 resultados para mostrar más opciones
  }, [users, searchQuery, excludedUserIds]);
};

// Hook para filtros optimizados de líderes
export const useFilteredLeaders = (searchQuery: string) => {
  const { users } = useDataStore(useShallow(state => ({ users: state.users })));
  
  return useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users
      .filter((user) => {
        return !searchQuery || 
          user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .slice(0, 50); // Aumentado a 50 resultados para mostrar más opciones
  }, [users, searchQuery]);
};

// Hook para filtros optimizados de clientes
export const useFilteredClients = (searchQuery: string) => {
  const { clients } = useDataStore(useShallow(state => ({ clients: state.clients })));
  
  return useMemo(() => {
    if (!Array.isArray(clients)) return [];
    
    return clients
      .filter((client) => {
        return !searchQuery || 
          client.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .slice(0, 50); // Aumentado a 50 resultados para mostrar más opciones
  }, [clients, searchQuery]);
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

// Hook para animaciones optimizadas
export const useAnimationOptimizations = () => {
  const animateClick = useCallback((element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      opacity: 0.8,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  }, []);

  return { animateClick };
};

// Hook para optimizar el renderizado de dropdowns
export const useDropdownRenderOptimization = (
  items: Array<{ id: string; [key: string]: unknown }>,
  selectedIds: string[],
  onItemClick: (id: string, e: React.MouseEvent<HTMLDivElement>) => void
) => {
  const memoizedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      isSelected: selectedIds.includes(item.id),
      onClick: (e: React.MouseEvent<HTMLDivElement>) => onItemClick(item.id, e)
    }));
  }, [items, selectedIds, onItemClick]);

  return memoizedItems;
};

// Definir tipo genérico para los valores del formulario
export type FormValues = {
  clientInfo: {
    clientId: string;
    project: string;
  };
  basicInfo: {
    status: string;
    priority: string;
  };
  teamInfo: {
    LeadedBy: string[];
    AssignedTo: string[];
  };
};

// Hook memoizado para funciones de manejo de dropdowns
export const useDropdownHandlers = (
  form: UseFormReturn<FormValues>,
  selectDropdownItem: (dropdown: string, searchField?: string) => void,
  animateClick: (element: HTMLElement) => void
) => {
  const handleClientSelectDropdown = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", clientId);
      selectDropdownItem("client", "client");
    },
    [form, animateClick, selectDropdownItem]
  );

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.project", project);
      selectDropdownItem("project");
    },
    [form, animateClick, selectDropdownItem]
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.status", status as "Por Iniciar" | "En Proceso" | "Backlog" | "Por Finalizar" | "Finalizado" | "Cancelado");
      selectDropdownItem("status");
    },
    [form, animateClick, selectDropdownItem]
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.priority", priority as "Baja" | "Media" | "Alta");
      selectDropdownItem("priority");
    },
    [form, animateClick, selectDropdownItem]
  );

  const handleLeaderSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      const currentLeaders = form.getValues("teamInfo.LeadedBy");
      const isSelected = currentLeaders.includes(userId);
      const newLeaders = isSelected
        ? currentLeaders.filter((id) => id !== userId)
        : [...currentLeaders, userId];
      form.setValue("teamInfo.LeadedBy", newLeaders);
      selectDropdownItem("leader", "leader");
    },
    [form, animateClick, selectDropdownItem]
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      if (!form.getValues("teamInfo.LeadedBy").includes(userId)) {
        const currentAssignedTo = form.getValues("teamInfo.AssignedTo");
        const isSelected = currentAssignedTo.includes(userId);
        const newAssignedTo = isSelected
          ? currentAssignedTo.filter((id) => id !== userId)
          : [...currentAssignedTo, userId];
        form.setValue("teamInfo.AssignedTo", newAssignedTo);
        selectDropdownItem("collaborator", "collaborator");
      }
    },
    [form, animateClick, selectDropdownItem]
  );

  const handleClientRemove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", "");
      form.setValue("clientInfo.project", "");
    },
    [form, animateClick]
  );

  const handleLeaderRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue(
        "teamInfo.LeadedBy",
        form.getValues("teamInfo.LeadedBy").filter((id) => id !== userId),
      );
    },
    [form, animateClick]
  );

  const handleCollaboratorRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue(
        "teamInfo.AssignedTo",
        form.getValues("teamInfo.AssignedTo").filter((id) => id !== userId),
      );
    },
    [form, animateClick]
  );

  return {
    handleClientSelectDropdown,
    handleProjectSelect,
    handleStatusSelect,
    handlePrioritySelect,
    handleLeaderSelect,
    handleCollaboratorSelect,
    handleClientRemove,
    handleLeaderRemove,
    handleCollaboratorRemove,
  };
};

// Hook optimizado para cálculos de posición
export const usePositionOptimizations = () => {
  const calculatePosition = useCallback((element: HTMLElement) => {
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
  }, []);

  const updatePositionOnResize = useCallback((element: HTMLElement, setPosition: (pos: { top: number; left: number } | null) => void) => {
    if (!element) return;
    
    const position = calculatePosition(element);
    setPosition(position);
  }, [calculatePosition]);

  const debouncedUpdatePosition = useDebounce(100);

  return {
    calculatePosition,
    updatePositionOnResize,
    debouncedUpdatePosition,
  };
};

// Hook optimizado para validaciones
export const useValidationOptimizations = () => {
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateRequired = useCallback((value: string): boolean => {
    return value.trim().length > 0;
  }, []);

  const validateMinLength = useCallback((value: string, minLength: number): boolean => {
    return value.trim().length >= minLength;
  }, []);

  return {
    validateEmail,
    validateRequired,
    validateMinLength,
  };
}; 