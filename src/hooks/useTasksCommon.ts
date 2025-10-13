/**
 * useTasksCommon Hook
 * 
 * Centraliza toda la lógica compartida entre TasksTable, ArchiveTable y TasksKanban:
 * - Datos centralizados (tasks, clients, users)
 * - Lógica de filtros unificada
 * - Manejo de dropdowns
 * - Permisos y utilidades comunes
 * - Animaciones y UI helpers
 */

import { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

// Interfaces compartidas
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

export interface UseTasksCommonReturn {
  // Datos centralizados
  tasks: Task[];
  clients: Client[];
  users: User[];
  userId: string;
  isAdmin: boolean;
  isLoadingTasks: boolean;
  isLoadingClients: boolean;
  isLoadingUsers: boolean;
  
  // Funciones de filtrado
  applyTaskFilters: (
    tasks: Task[],
    filters: {
      searchQuery?: string;
      priorityFilter?: string;
      clientFilter?: string;
      userFilter?: string;
    }
  ) => Task[];
  
  // Utilidades de permisos
  getInvolvedUserIds: (task: Task) => string[];
  canUserViewTask: (task: Task) => boolean;
  canUserArchiveTask: (task: Task) => boolean;
  
  // Utilidades de UI
  getClientName: (clientId: string) => string;
  animateClick: (element: HTMLElement) => void;
  
  // Handlers de dropdown
  createPrioritySelectHandler: (
    setPriorityFilter: (value: string) => void,
    setIsPriorityDropdownOpen: (value: boolean) => void
  ) => (priority: string, e: React.MouseEvent<HTMLDivElement>) => void;
  
  createClientSelectHandler: (
    setClientFilter: (value: string) => void,
    setIsClientDropdownOpen: (value: boolean) => void
  ) => (clientId: string, e: React.MouseEvent<HTMLDivElement>) => void;
  
  createUserFilterHandler: (
    setUserFilter: (value: string) => void,
    setIsUserDropdownOpen: (value: boolean) => void
  ) => (userId: string) => void;
  
  // Utilidades de estado
  normalizeStatus: (status: string) => string;
  getPriorityOrder: (priority: string) => number;
}

export const useTasksCommon = (): UseTasksCommonReturn => {
  const { user } = useUser();
  const { isAdmin } = useAuth();

  // Datos centralizados del store
  const {
    tasks,
    clients,
    users,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers
  } = useDataStore(
    useShallow((state) => ({
      tasks: state.tasks,
      clients: state.clients,
      users: state.users,
      isLoadingTasks: state.isLoadingTasks,
      isLoadingClients: state.isLoadingClients,
      isLoadingUsers: state.isLoadingUsers,
    }))
  );

  const userId = useMemo(() => user?.id || '', [user]);

  // 🔒 Función para obtener IDs de usuarios involucrados en una tarea
  const getInvolvedUserIds = useCallback((task: Task): string[] => {
    const ids = new Set<string>();
    if (task.CreatedBy) ids.add(task.CreatedBy);
    if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
    if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, []);

  // 🔒 Verificar si el usuario puede ver una tarea
  const canUserViewTask = useCallback((task: Task): boolean => {
    return isAdmin || getInvolvedUserIds(task).includes(userId);
  }, [isAdmin, userId, getInvolvedUserIds]);

  // 🔒 Verificar si el usuario puede archivar una tarea
  const canUserArchiveTask = useCallback((task: Task): boolean => {
    return isAdmin || task.CreatedBy === userId;
  }, [isAdmin, userId]);

  // 📋 Función centralizada de filtros
  const applyTaskFilters = useCallback((
    tasksToFilter: Task[],
    filters: {
      searchQuery?: string;
      priorityFilter?: string;
      clientFilter?: string;
      userFilter?: string;
    }
  ): Task[] => {
    const { searchQuery = '', priorityFilter = '', clientFilter = '', userFilter = '' } = filters;

    return tasksToFilter.filter((task) => {
      // 🔒 Filtro de permisos primero
      if (!canUserViewTask(task)) {
        return false;
      }

      // 🔍 Filtro de búsqueda
      const matchesSearch = !searchQuery || 
        task.name.toLowerCase().includes(searchQuery.toLowerCase());

      // 🎯 Filtro de prioridad
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;

      // 🏢 Filtro de cliente
      const matchesClient = !clientFilter || task.clientId === clientFilter;

      // 👤 Filtro de usuario
      let matchesUser = true;
      if (userFilter === 'me') {
        matchesUser = getInvolvedUserIds(task).includes(userId);
      } else if (userFilter && userFilter !== 'me') {
        matchesUser = getInvolvedUserIds(task).includes(userFilter);
      }

      return matchesSearch && matchesPriority && matchesClient && matchesUser;
    });
  }, [canUserViewTask, getInvolvedUserIds, userId]);

  // 🏢 Obtener nombre del cliente
  const getClientName = useCallback((clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Cliente no encontrado';
  }, [clients]);

  // ✨ Animación de click
  const animateClick = useCallback((element: HTMLElement): void => {
    gsap.to(element, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    });
  }, []);

  // 🎯 Factory para handler de selección de prioridad
  const createPrioritySelectHandler = useCallback((
    setPriorityFilter: (value: string) => void,
    setIsPriorityDropdownOpen: (value: boolean) => void
  ) => {
    return (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      
      // Animación opcional del ícono
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };
  }, []);

  // 🏢 Factory para handler de selección de cliente
  const createClientSelectHandler = useCallback((
    setClientFilter: (value: string) => void,
    setIsClientDropdownOpen: (value: boolean) => void
  ) => {
    return (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      
      // Animación opcional del ícono
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };
  }, []);

  // 👤 Factory para handler de filtro de usuario
  const createUserFilterHandler = useCallback((
    setUserFilter: (value: string) => void,
    setIsUserDropdownOpen: (value: boolean) => void
  ) => {
    return (userIdToFilter: string) => {
      setUserFilter(userIdToFilter);
      setIsUserDropdownOpen(false);
    };
  }, []);

  // 📊 Normalizar estados de tarea
  const normalizeStatus = useCallback((status: string): string => {
    // Handle case where status is an Object instead of string
    if (typeof status === 'object' && status !== null) {
      status = String(status);
    }
    
    if (!status) {
      return 'Por Iniciar'; // Default for empty/null status
    }
    
    const normalized = status.trim();
    
    // Handle common variations
    const statusMap: { [key: string]: string } = {
      'por iniciar': 'Por Iniciar',
      'por-iniciar': 'Por Iniciar',
      'pendiente': 'Por Iniciar',
      'pending': 'Por Iniciar',
      'to do': 'Por Iniciar',
      'todo': 'Por Iniciar',
      'en proceso': 'En Proceso',
      'en-proceso': 'En Proceso',
      'in progress': 'En Proceso',
      'progreso': 'En Proceso',
      'por finalizar': 'Por Finalizar',
      'por-finalizar': 'Por Finalizar',
      'to finish': 'Por Finalizar',
      'finalizado': 'Finalizado',
      'finalizada': 'Finalizado',
      'completed': 'Finalizado',
      'completado': 'Finalizado',
      'completada': 'Finalizado',
      'done': 'Finalizado',
      'terminado': 'Finalizado',
      'terminada': 'Finalizado',
      'finished': 'Finalizado',
      'backlog': 'Backlog',
      'cancelado': 'Cancelado',
      'cancelada': 'Cancelado',
      'cancelled': 'Cancelado',
      // Legacy status mapping
      'diseno': 'Por Iniciar',
      'diseño': 'Por Iniciar',
      'design': 'Por Iniciar',
      'desarrollo': 'En Proceso',
      'development': 'En Proceso',
      'dev': 'En Proceso',
    };
    
    return statusMap[normalized.toLowerCase()] || normalized;
  }, []);

  // 🎯 Obtener orden numérico de prioridad para sorting
  const getPriorityOrder = useCallback((priority: string): number => {
    const priorityOrder = { Alta: 3, Media: 2, Baja: 1 };
    return priorityOrder[priority as keyof typeof priorityOrder] || 0;
  }, []);

  return {
    // Datos centralizados
    tasks,
    clients,
    users,
    userId,
    isAdmin,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers,
    
    // Funciones de filtrado
    applyTaskFilters,
    
    // Utilidades de permisos
    getInvolvedUserIds,
    canUserViewTask,
    canUserArchiveTask,
    
    // Utilidades de UI
    getClientName,
    animateClick,
    
    // Factory functions para handlers
    createPrioritySelectHandler,
    createClientSelectHandler,
    createUserFilterHandler,
    
    // Utilidades de estado
    normalizeStatus,
    getPriorityOrder,
  };
};
