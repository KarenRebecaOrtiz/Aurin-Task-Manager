'use client';

import { useEffect, useRef, useMemo, useCallback, memo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
// Firebase imports removidos - ya no se usan listeners aquí
// import { collection, onSnapshot, query } from 'firebase/firestore';
// import { db } from '@/lib/firebase';
import Table from './Table';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksTable.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';

import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getLastActivityTimestamp, archiveTask, unarchiveTask } from '@/lib/taskUtils';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import NotificationDot from '@/components/ui/NotificationDot';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksTableStore } from '@/stores/tasksTableStore';
import { useDataStore } from '@/stores/dataStore';

import { useTasksTableActionsStore } from '@/stores/tasksTableActionsStore';

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

// type TaskView = 'table' | 'kanban'; // Removed as it's no longer used

// Helper function to normalize status values (same as TasksKanban)
const normalizeStatus = (status: string): string => {
  if (!status) return 'Por Iniciar'; // Default for empty/null status
  
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
};

interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds: string[];
  users: User[];
  currentUserId: string;
}

// Eliminar todo el sistema de caché global
const cleanupTasksTableListeners = () => {
  
};

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, leadedByUserIds, users, currentUserId }) => {
  // ✅ CORREGIDO: Función local para manejar errores de imagen
  const handleAvatarImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/empty-image.png';
  }, []);

  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      // console.warn('[AvatarGroup] Users prop is not an array:', users);
      return [];
    }
    const matchedUsers = users.filter((user) => assignedUserIds.includes(user.id) || leadedByUserIds.includes(user.id)).slice(0, 5);
    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, leadedByUserIds, users, currentUserId]);

  return (
    <div className={avatarStyles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={avatarStyles.avatar}>
            <span className={avatarStyles.avatarName}>{user.fullName}</span>
            <Image
              src={user.imageUrl || '/empty-image.png'}
              alt={`${user.fullName}'s avatar`}
              width={40}
              height={40}
              className={avatarStyles.avatarImage}
              onError={handleAvatarImageError}
            />
          </div>
        ))
      ) : (
        <span>No asignados</span>
      )}
    </div>
  );
};

interface TasksTableProps {
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
}



const TasksTable: React.FC<TasksTableProps> = memo(({
  externalTasks,
  externalClients,
  externalUsers,
}) => {
  // ✅ DEBUG: Log re-renders para trackear causas
  // console.log('[TasksTable] Render triggered', {
  //   externalTasksCount: externalTasks?.length || 0,
  //   externalClientsCount: externalClients?.length || 0,
  //   externalUsersCount: externalUsers?.length || 0,
  //   timestamp: new Date().toISOString()
  // });

  const { user } = useUser();
  const { isAdmin } = useAuth();
  
  // ✅ Usar actions store para evitar callback props
  const {
    openNewTask,
    openEditTask,
    openDeleteTask,
    openArchiveTable,
    changeView
  } = useTasksTableActionsStore();
  
  // ✅ Optimizar selectores de dataStore con useShallow para evitar re-renders
  const tasks = useDataStore(useShallow(state => state.tasks));
  const clients = useDataStore(useShallow(state => state.clients));
  const users = useDataStore(useShallow(state => state.users));
  const isLoadingTasks = useDataStore(useShallow(state => state.isLoadingTasks));


  // ✅ OPTIMIZACIÓN: Memoizar effectiveTasks para estabilizar dependencias
  const effectiveTasks = useMemo(() => {
    const result = externalTasks || tasks;
    // console.log('[TasksTable] effectiveTasks memo recalculated', {
    //   externalTasksCount: externalTasks?.length || 0,
    //   tasksCount: tasks.length,
    //   resultCount: result.length
    // });
    return result;
  }, [externalTasks, tasks]);
  
  const effectiveClients = useMemo(() => {
    const result = externalClients || clients;
    // console.log('[TasksTable] effectiveClients memo recalculated', {
    //   externalClientsCount: externalClients?.length || 0,
    //   clientsCount: clients.length,
    //   resultCount: result.length
    // });
    return result;
  }, [externalClients, clients]);
  
  const effectiveUsers = useMemo(() => {
    const result = externalUsers || users;
    // console.log('[TasksTable] effectiveUsers memo recalculated', {
    //   externalUsersCount: externalUsers?.length || 0,
    //   usersCount: users.length,
    //   resultCount: result.length
    // });
    return result;
  }, [externalUsers, users]);

  // ✅ OPTIMIZACIÓN: Memoizar IDs para dependencias estables
  const effectiveTasksIds = useMemo(() => effectiveTasks.map(t => t.id).join(','), [effectiveTasks]);
  // const effectiveClientsIds = useMemo(() => effectiveClients.map(c => c.id).join(','), [effectiveClients]); // No usado
  // const effectiveUsersIds = useMemo(() => effectiveUsers.map(u => u.id).join(','), [effectiveUsers]); // No usado

  // ✅ Optimizar selectores de Zustand para evitar re-renders innecesarios - usar selectores individuales como MembersTable
  const filteredTasks = useStore(tasksTableStore, useShallow(state => state.filteredTasks));
  const sortKey = useStore(tasksTableStore, useShallow(state => state.sortKey));
  const sortDirection = useStore(tasksTableStore, useShallow(state => state.sortDirection));
  const searchQuery = useStore(tasksTableStore, useShallow(state => state.searchQuery));
  const priorityFilter = useStore(tasksTableStore, useShallow(state => state.priorityFilter));
  const clientFilter = useStore(tasksTableStore, useShallow(state => state.clientFilter));
  const userFilter = useStore(tasksTableStore, useShallow(state => state.userFilter));
  const actionMenuOpenId = useStore(tasksTableStore, useShallow(state => state.actionMenuOpenId));
  const isPriorityDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isPriorityDropdownOpen));
  const isClientDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isClientDropdownOpen));
  const isUserDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isUserDropdownOpen));
  const undoStack = useStore(tasksTableStore, useShallow(state => state.undoStack));
  const showUndo = useStore(tasksTableStore, useShallow(state => state.showUndo));
  
  // Acciones
  const setFilteredTasks = useStore(tasksTableStore, useShallow(state => state.setFilteredTasks));
  const setSortKey = useStore(tasksTableStore, useShallow(state => state.setSortKey));
  const setSortDirection = useStore(tasksTableStore, useShallow(state => state.setSortDirection));
  const setSearchQuery = useStore(tasksTableStore, useShallow(state => state.setSearchQuery));
  const setPriorityFilter = useStore(tasksTableStore, useShallow(state => state.setPriorityFilter));
  const setClientFilter = useStore(tasksTableStore, useShallow(state => state.setClientFilter));
  const setUserFilter = useStore(tasksTableStore, useShallow(state => state.setUserFilter));
  const setActionMenuOpenId = useStore(tasksTableStore, useShallow(state => state.setActionMenuOpenId));
  const setIsPriorityDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsPriorityDropdownOpen));
  const setIsClientDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsClientDropdownOpen));
  const setIsUserDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsUserDropdownOpen));
  const setIsLoadingTasks = useStore(tasksTableStore, useShallow(state => state.setIsLoadingTasks));
  // const setIsLoadingClients = useStore(tasksTableStore, useShallow(state => state.setIsLoadingClients)); // No usado - listeners eliminados
  const setUndoStack = useStore(tasksTableStore, useShallow(state => state.setUndoStack));
  const setShowUndo = useStore(tasksTableStore, useShallow(state => state.setShowUndo));
  
  // Debug: Log what's causing re-renders - REMOVED TO REDUCE RE-RENDERS

  // Refs
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // Estado para visibilidad de columnas
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'clientId', 'name', 'notificationDot', 'assignedTo', 'status', 'priority', 'action'
  ]);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const userId = useMemo(() => user?.id || '', [user]);

  // Usar datos externos si están disponibles, de lo contrario usar datos del store
  const effectiveTasksRef = useRef(effectiveTasks);
  
  // Solo recalcular IDs si realmente cambió el array
  useEffect(() => {
    const newIds = effectiveTasks.map(t => t.id).join(',');
    if (newIds !== effectiveTasksIds) {
      effectiveTasksRef.current = effectiveTasks;
    }
  }, [effectiveTasks, effectiveTasksIds]);

  // ARREGLADO: No sobrescribir filteredTasks con todas las tareas
  // El filtrado se maneja en memoizedFilteredTasks y se aplica en el useEffect de abajo
  // useEffect(() => {
  //   setFilteredTasks(effectiveTasks);
  // }, [effectiveTasks, setFilteredTasks]);

  // Usar el hook de notificaciones simplificado
  const { getUnreadCount, markAsViewed } = useTaskNotifications();

  // Setup de tasks con actualizaciones en tiempo real - ELIMINAR DUPLICADO
  useEffect(() => {
    if (!user?.id) return;

    // No establecer onSnapshot aquí - usar siempre datos del store de Zustand
    if (effectiveTasks.length > 0) {
      setIsLoadingTasks(false);
    }
  }, [user?.id, effectiveTasks, setIsLoadingTasks]);

  // ❌ ELIMINAR: Este listener está duplicado - ya existe en useSharedTasksState
  // Setup de clients con actualizaciones en tiempo real
  // useEffect(() => {
  //   if (!user?.id || effectiveClients.length > 0) return;
  //   // ... código eliminado
  // }, [user?.id, effectiveClients, setIsLoadingClients]);

  // Users are now managed centrally by useSharedTasksState
  // No independent user fetching needed

  // REMOVIDO: Este useEffect estaba sobrescribiendo el filtrado cada vez que cambiaban los users
  // El filtrado se maneja en memoizedFilteredTasks y se aplica en el useEffect de la línea 392-394

  const getInvolvedUserIds = useCallback((task: Task) => {
    const ids = new Set<string>();
    if (task.CreatedBy) ids.add(task.CreatedBy);
    if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
    if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, []);

  const handleUserFilter = useCallback((id: string) => {
    // Animate filter change
    const userDropdownTrigger = userDropdownRef.current?.querySelector(`.${styles.dropdownTrigger}`);
    if (userDropdownTrigger) {
      const filterIcon = userDropdownTrigger.querySelector('img');
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
    }
    
    setUserFilter(id);
    setIsUserDropdownOpen(false);
  }, [setUserFilter, setIsUserDropdownOpen]);

  // ✅ CORREGIDO: Memoizar handlers específicos para evitar arrow functions inline
  const handleUserFilterEmpty = useCallback(() => {
    handleUserFilter('');
  }, [handleUserFilter]);

  const handleUserFilterMe = useCallback(() => {
    handleUserFilter('me');
  }, [handleUserFilter]);

  const handleUserFilterById = useCallback((userId: string) => {
    handleUserFilter(userId);
  }, [handleUserFilter]);

  // ✅ CORREGIDO: Memoizar handlers para imágenes
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/empty-image.png';
  }, []);

  // ✅ CORREGIDO: Memoizar handlers para eventos del mouse
  const handleKanbanImageMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.filter =
      'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.84)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
  }, []);

  const handleKanbanImageMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.filter =
      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
  }, []);

  const handleArchiveImageMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.filter =
      'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.84)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
  }, []);

  const handleArchiveImageMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.filter =
      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
  }, []);

  // ✅ CORREGIDO: Memoizar handlers para eventos del teclado
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
              setSearchQuery(newValue);
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              setSearchQuery(searchQuery + text);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                setSearchQuery(newValue);
              } else {
                setSearchQuery('');
              }
            });
          }
          break;
      }
    }
  }, [searchQuery, setSearchQuery]);

  // ✅ CORREGIDO: Memoizar handlers para dropdowns - se moverán después de handlePrioritySelect y handleClientSelect

  // Función para manejar cambios de visibilidad de columnas
  const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => {
      if (visible) {
        // Agregar columna si no está presente
        return prev.includes(columnKey) ? prev : [...prev, columnKey];
      } else {
        // Remover columna
        return prev.filter(key => key !== columnKey);
      }
    });
    
    // console.log(`[TasksTable] Column ${columnKey} visibility changed to: ${visible}`);
  }, []);

  // ✅ OPTIMIZACIÓN: Memoizar getUnreadCount para estabilizar dependencias
  const memoizedGetUnreadCount = useCallback((task: Task) => {
    return getUnreadCount(task);
  }, [getUnreadCount]);

  // ✅ FILTRADO DIRECTO: Actualizar filteredTasks cuando cambien los filtros
  useEffect(() => {
    const filtered = effectiveTasks.filter((task) => {
      // Excluir tareas archivadas
      if (task.archived) {
        return false;
      }
      
      // 🔒 FILTRO DE PERMISOS: Solo admins o usuarios involucrados pueden ver la tarea
      const canViewTask = isAdmin || getInvolvedUserIds(task).includes(userId);
      if (!canViewTask) {
        return false;
      }
      
      // Filtro de búsqueda
      const matchesSearch = !searchQuery || task.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtro de prioridad
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      
      // Filtro de cliente
      const matchesClient = !clientFilter || task.clientId === clientFilter;
      
      // Filtro de usuario
      let matchesUser = true;
      if (userFilter === 'me') {
        const involvedUserIds = getInvolvedUserIds(task);
        matchesUser = involvedUserIds.includes(userId);
      } else if (userFilter && userFilter !== 'me') {
        const involvedUserIds = getInvolvedUserIds(task);
        matchesUser = involvedUserIds.includes(userFilter);
      }

      return matchesSearch && matchesPriority && matchesClient && matchesUser;
    });
    
    setFilteredTasks(filtered);
  }, [effectiveTasks, searchQuery, priorityFilter, clientFilter, userFilter, userId, getInvolvedUserIds, isAdmin, setFilteredTasks]);

  // ✅ CORREGIDO: Reset de paginación cuando cambian los filtros
  // Esto asegura que las tareas filtradas sean visibles
  useEffect(() => {
    // Reset paginación cuando cambian los filtros
    const tableElement = document.querySelector('[data-table="tasks"]');
    if (tableElement) {
      // Disparar evento personalizado para resetear paginación
      const resetEvent = new CustomEvent('resetPagination', { detail: { reason: 'filterChanged' } });
      tableElement.dispatchEvent(resetEvent);
    }
  }, [filteredTasks.length]); // Reset cuando cambian las tareas filtradas

  // Función para manejar el clic en una fila de tarea
  const handleTaskRowClick = useCallback(async (task: Task) => {

    
    // OPTIMISTIC UPDATE: Mark task as viewed BEFORE opening sidebar
    markAsViewed(task.id).catch(() => {
      // console.error('[TasksTable] Error marking task as viewed');
    });
    
    // Usar los action handlers configurados en TasksTableContainer
    const { openChatSidebar } = useTasksTableActionsStore.getState();
    
    // Buscar el nombre del cliente
    const clientName = clients.find((c) => c.id === task.clientId)?.name || 'Sin cuenta';
    
    // Abrir el sidebar inmediatamente (red dot ya desapareció)
    openChatSidebar(task, clientName);
    
    
  }, [clients, markAsViewed]);

  useEffect(() => {
    const currentActionMenuRef = actionMenuRef.current;
    if (actionMenuOpenId && currentActionMenuRef) {
      gsap.fromTo(
        currentActionMenuRef,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      // console.log('[TasksTable] Action menu animated for task:', actionMenuOpenId);
    }
    return () => {
      if (currentActionMenuRef) {
        gsap.killTweensOf(currentActionMenuRef);
      }
    };
  }, [actionMenuOpenId]);

  useEffect(() => {
    const priorityItems = priorityDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
    if (isPriorityDropdownOpen && priorityItems) {
      gsap.fromTo(
        priorityItems,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      // console.log('[TasksTable] Priority dropdown animated');
    }
  }, [isPriorityDropdownOpen]);

  useEffect(() => {
    const clientItems = clientDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
    if (isClientDropdownOpen && clientItems) {
      gsap.fromTo(
        clientItems,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      // console.log('[TasksTable] Client dropdown animated');
    }
  }, [isClientDropdownOpen]);

  useEffect(() => {
    const userItems = userDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
    if (isUserDropdownOpen && userItems) {
      gsap.fromTo(
        userItems,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      // console.log('[TasksTable] User dropdown animated');
    }
  }, [isUserDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
      ) {
        setActionMenuOpenId(null);
        // console.log('[TasksTable] Action menu closed via outside click');
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        isPriorityDropdownOpen
      ) {
        setIsPriorityDropdownOpen(false);
        // console.log('[TasksTable] Priority dropdown closed via outside click');
      }
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node) &&
        isClientDropdownOpen
      ) {
        setIsClientDropdownOpen(false);
        // console.log('[TasksTable] Client dropdown closed via outside click');
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node) &&
        isUserDropdownOpen
      ) {
        setIsUserDropdownOpen(false);
        // console.log('[TasksTable] User dropdown closed via outside click');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen, isUserDropdownOpen, setActionMenuOpenId, setIsPriorityDropdownOpen, setIsClientDropdownOpen, setIsUserDropdownOpen]);

  const handleSort = useCallback((key: string) => {
    if (!key || key === '') {
      // Remover ordenamiento
      setSortKey('');
      setSortDirection('asc');
      // console.log('[TasksTable] Removed sorting');
      return;
    }
    
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
    // console.log('[TasksTable] Sorting tasks:', { sortKey: key, sortDirection });
  }, [sortKey, sortDirection, setSortKey, setSortDirection]);

  // ✅ OPTIMIZACIÓN: Usar directamente el estado local del store
  const sortedTasks = useMemo(() => {
    // console.log('[TasksTable] sortedTasks recalculating', {
    //   filteredTasksCount: filteredTasks.length,
    //   sortKey,
    //   sortDirection,
    //   effectiveClientsCount: effectiveClients.length,
    //   effectiveUsersCount: effectiveUsers.length
    // });
    
    const sorted = [...filteredTasks];
    
    // Si no hay sortKey o está vacío, aplicar ordenamiento por defecto por createdAt
    if (!sortKey || sortKey === '') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Orden descendente (más recientes primero)
      });
      return sorted;
    }
    
    if (sortKey === 'lastActivity') {
      sorted.sort((a, b) => {
        const activityA = getLastActivityTimestamp(a);
        const activityB = getLastActivityTimestamp(b);
        return sortDirection === 'asc' ? activityA - activityB : activityB - activityA;
      });
    } else if (sortKey === 'clientId') {
      sorted.sort((a, b) => {
        const clientA = effectiveClients.find((c) => c.id === a.clientId)?.name || '';
        const clientB = effectiveClients.find((c) => c.id === b.clientId)?.name || '';
        return sortDirection === 'asc'
          ? clientA.localeCompare(clientB)
          : clientB.localeCompare(clientA);
      });
    } else if (sortKey === 'notificationDot') {
      // ✅ OPTIMIZACIÓN: Usar cache para getUnreadCount en sort
      sorted.sort((a, b) => {
        const countA = memoizedGetUnreadCount(a);
        const countB = memoizedGetUnreadCount(b);
        return sortDirection === 'asc' ? countA - countB : countB - countA;
      });
    } else if (sortKey === 'assignedTo') {
      // Ordenamiento por número de asignados y luego alfabético por primer asignado
      sorted.sort((a, b) => {
        const assignedCountA = (a.AssignedTo?.length || 0) + (a.LeadedBy?.length || 0);
        const assignedCountB = (b.AssignedTo?.length || 0) + (b.LeadedBy?.length || 0);
        
        if (assignedCountA !== assignedCountB) {
          return sortDirection === 'asc' ? assignedCountA - assignedCountB : assignedCountB - assignedCountA;
        }
        
        // En caso de empate, ordenar por nombre del primer asignado
        const firstAssignedA = effectiveUsers.find(u => a.AssignedTo?.[0] === u.id || a.LeadedBy?.[0] === u.id)?.fullName || '';
        const firstAssignedB = effectiveUsers.find(u => b.AssignedTo?.[0] === u.id || b.LeadedBy?.[0] === u.id)?.fullName || '';
        
        return sortDirection === 'asc'
          ? firstAssignedA.localeCompare(firstAssignedB)
          : firstAssignedB.localeCompare(firstAssignedA);
      });
    } else if (sortKey === 'status') {
      // Ordenamiento personalizado para estados
      const statusOrder = ['Por Iniciar', 'En Proceso', 'En Revisión', 'Finalizado', 'Archivado', 'Cancelado'];
      sorted.sort((a, b) => {
        const indexA = statusOrder.indexOf(normalizeStatus(a.status));
        const indexB = statusOrder.indexOf(normalizeStatus(b.status));
        const validIndexA = indexA === -1 ? statusOrder.length : indexA;
        const validIndexB = indexB === -1 ? statusOrder.length : indexB;
        return sortDirection === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
      });
    } else if (sortKey === 'priority') {
      // Ordenamiento personalizado para prioridades
      const priorityOrder = ['Alta', 'Media', 'Baja'];
      sorted.sort((a, b) => {
        const indexA = priorityOrder.indexOf(a.priority);
        const indexB = priorityOrder.indexOf(b.priority);
        const validIndexA = indexA === -1 ? priorityOrder.length : indexA;
        const validIndexB = indexB === -1 ? priorityOrder.length : indexB;
        return sortDirection === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
      });
    } else if (sortKey === 'createdAt') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortKey === 'name') {
      // Ordenamiento alfabético para nombres de tareas
      sorted.sort((a, b) =>
        sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else {
      // Ordenamiento genérico para otras columnas
      sorted.sort((a, b) =>
        sortDirection === 'asc'
          ? String(a[sortKey as keyof Task]).localeCompare(String(b[sortKey as keyof Task]))
          : String(b[sortKey as keyof Task]).localeCompare(String(a[sortKey as keyof Task])),
      );
    }
    
    // console.log('[TasksTable] sortedTasks result', {
    //   sortedCount: sorted.length,
    //   sortKey,
    //   sortDirection
    // });
    
    return sorted;
  }, [filteredTasks, sortKey, sortDirection, effectiveClients, effectiveUsers, memoizedGetUnreadCount]);

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

  // ✅ OPTIMIZACIÓN: Memoizar handlers para evitar re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    // Animate search input when typing
    const searchInput = e.currentTarget;
    gsap.to(searchInput, {
      scale: 1.02,
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });
  }, [setSearchQuery]);

  const handleViewButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    animateClick(e.currentTarget);
    changeView('kanban');
  }, [animateClick, changeView]);

  const handleArchiveButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    animateClick(e.currentTarget);
    openArchiveTable();
  }, [animateClick, openArchiveTable]);

  const handleNewTaskButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    animateClick(e.currentTarget);
    openNewTask();
  }, [animateClick, openNewTask]);

  const handlePriorityDropdownToggle = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);
    setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
    if (!isPriorityDropdownOpen) {
      setIsClientDropdownOpen(false);
      setIsUserDropdownOpen(false);
    }
  }, [animateClick, isPriorityDropdownOpen, setIsPriorityDropdownOpen, setIsClientDropdownOpen, setIsUserDropdownOpen]);

  const handleClientDropdownToggle = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);
    setIsClientDropdownOpen(!isClientDropdownOpen);
    if (!isClientDropdownOpen) {
      setIsPriorityDropdownOpen(false);
      setIsUserDropdownOpen(false);
    }
  }, [animateClick, isClientDropdownOpen, setIsClientDropdownOpen, setIsPriorityDropdownOpen, setIsUserDropdownOpen]);

  const handleUserDropdownToggle = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);
    setIsUserDropdownOpen(!isUserDropdownOpen);
    if (!isUserDropdownOpen) {
      setIsPriorityDropdownOpen(false);
      setIsClientDropdownOpen(false);
    }
  }, [animateClick, isUserDropdownOpen, setIsUserDropdownOpen, setIsPriorityDropdownOpen, setIsClientDropdownOpen]);

  const handlePrioritySelect = useCallback((priority: string, e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);
    
    // Animate filter change
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
  }, [animateClick, setPriorityFilter, setIsPriorityDropdownOpen]);

  const handleClientSelect = useCallback((clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
    animateClick(e.currentTarget);
    
    // Animate filter change
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
  }, [animateClick, setClientFilter, setIsClientDropdownOpen]);

  // ✅ CORREGIDO: Memoizar handlers para dropdowns
  const handlePriorityItemClick = useCallback((priority: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    handlePrioritySelect(priority, e);
  }, [handlePrioritySelect]);

  const handleClientItemClick = useCallback((clientId: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    handleClientSelect(clientId, e);
  }, [handleClientSelect]);

  const handleUserItemClick = useCallback((userId: string) => () => {
    handleUserFilterById(userId);
  }, [handleUserFilterById]);



  // Función para obtener las clases CSS de una fila de tarea
  const getRowClassName = useCallback(() => {
    return ''; // Removido el indicador de actualización de la fila completa
  }, []);

  // ✅ FUNCIONES MEMOIZADAS PARA RENDERS DE COLUMNAS
  const renderClientColumn = useCallback((client: Client) => {
    return client ? (
      <div className={styles.clientWrapper}>
        <Image
          style={{ borderRadius: '999px' }}
          src={client.imageUrl || '/empty-image.png'}
          alt={client.name || 'Client Image'}
          width={40}
          height={40}
          className={styles.clientImage}
          onError={handleImageError}
        />
      </div>
    ) : 'Sin cuenta';
  }, [handleImageError]);

  const renderTaskNameColumn = useCallback((task: Task) => {
    return (
      <div className={styles.taskNameWrapper}>
        <span className={styles.taskName}>{task.name}</span>
      </div>
    );
  }, []);

  const renderNotificationDotColumn = useCallback((task: Task) => {
    const updateCount = memoizedGetUnreadCount(task);
    return (
      <div className={styles.notificationDotWrapper}>
        <NotificationDot count={updateCount} />
      </div>
    );
  }, [memoizedGetUnreadCount]);

  const renderAssignedToColumn = useCallback((task: Task) => {
    return <AvatarGroup assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} users={effectiveUsers} currentUserId={userId} />;
  }, [effectiveUsers, userId]);

  const renderStatusColumn = useCallback((task: Task) => {
    const normalizedStatus = normalizeStatus(task.status);
    let icon = '/timer.svg';
    if (normalizedStatus === 'En Proceso') icon = '/timer.svg';
    else if (normalizedStatus === 'Backlog') icon = '/circle-help.svg';
    else if (normalizedStatus === 'Por Iniciar') icon = '/circle.svg';
    else if (normalizedStatus === 'Cancelado') icon = '/circle-x.svg';
    else if (normalizedStatus === 'Por Finalizar') icon = '/circle-check.svg';
    else if (normalizedStatus === 'Finalizado') icon = '/check-check.svg';
    
    return (
      <div className={styles.statusWrapper}>
        <Image
          src={icon}
          alt={normalizedStatus}
          width={16}
          height={16}
          style={{ opacity: 0.7 }}
        />
        <span className={styles[`status-${normalizedStatus.replace(/\s/g, '-')}`]}>{normalizedStatus}</span>
      </div>
    );
  }, []);

  const renderPriorityColumn = useCallback((task: Task) => {
    return (
      <div className={styles.priorityWrapper}>
        <Image
          src={
            task.priority === 'Alta'
              ? '/arrow-up.svg'
              : task.priority === 'Media'
              ? '/arrow-right.svg'
              : '/arrow-down.svg'
          }
          alt={task.priority}
          width={16}
          height={16}
        />
        <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
      </div>
    );
  }, []);

  // ✅ CORREGIDO: Memoizar handlers para ActionMenu
  const handleEditTask = useCallback((taskId: string) => {
    openEditTask(taskId);
    setActionMenuOpenId(null);
  }, [openEditTask, setActionMenuOpenId]);

  const handleDeleteTask = useCallback((taskId: string) => {
    openDeleteTask(taskId);
    setActionMenuOpenId(null);
  }, [openDeleteTask, setActionMenuOpenId]);

  const handleArchiveTask = useCallback(async (task: Task) => {
    try {
      // ✅ OPTIMISTIC UPDATE: Marcar tarea como archivada inmediatamente en el estado local
      const updatedTask = { 
        ...task, 
        archived: true, 
        archivedAt: new Date().toISOString(), 
        archivedBy: userId 
      };
      
      // ✅ ACTUALIZACIÓN OPTIMISTA: Sin interferencias del useEffect
      
      // ✅ CLAVE: Actualizar INMEDIATAMENTE el estado local del filtrado para que la tarea desaparezca instantáneamente
      // Esto es lo que hace que funcione en ArchiveTable - DEBE SER LO PRIMERO
      setFilteredTasks(filteredTasks.filter(t => t.id !== task.id));
      
      // ✅ ACTUALIZACIÓN INMEDIATA: Remover la tarea del filtrado local para que desaparezca instantáneamente
      if (!externalTasks) {
        // Actualizar el store de datos para que se refleje en el filtrado
        const currentTasks = useDataStore.getState().tasks;
        const updatedTasks = currentTasks.map(t => 
          t.id === task.id ? updatedTask : t
        );
        useDataStore.getState().setTasks(updatedTasks);
      }
      
      // Guardar en undo stack
      const undoItem = {
        task: { ...task },
        action: 'archive' as const,
        timestamp: Date.now()
      };
      setUndoStack([...undoStack, undoItem]);
      setShowUndo(true);

      // Limpiar timeout anterior
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // Configurar timeout para limpiar undo
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndo(false);
        setUndoStack(undoStack.filter(item => item.timestamp !== undoItem.timestamp));
      }, 3000);
      
      // Ejecutar la función de archivo
      await archiveTask(task.id, userId, isAdmin, task);
      
      // ✅ OPERACIÓN COMPLETADA: Tarea archivada exitosamente
      
      setActionMenuOpenId(null);
    } catch (error) {
      // ✅ ROLLBACK: Si falla el archivo, revertir el estado optimista
      console.error('Error archiving task:', error);
      
      if (!externalTasks) {
        // Revertir el estado local
        const currentTasks = useDataStore.getState().tasks;
        const revertedTasks = currentTasks.map(t => 
          t.id === task.id ? task : t
        );
        useDataStore.getState().setTasks(revertedTasks);
      }
      
      // ✅ CLAVE: Revertir también el estado local del filtrado
      setFilteredTasks([...filteredTasks, task]);
      
      // Mostrar error al usuario (opcional)
      // Puedes implementar un toast o notificación aquí
    }
  }, [userId, isAdmin, setUndoStack, undoStack, setShowUndo, setActionMenuOpenId, externalTasks, setFilteredTasks, filteredTasks]);

  // ✅ CORREGIDO: Memoizar handlers para ActionMenu específicos
  const handleEditTaskForActionMenu = useCallback((taskId: string) => () => {
    handleEditTask(taskId);
  }, [handleEditTask]);

  const handleDeleteTaskForActionMenu = useCallback((taskId: string) => () => {
    handleDeleteTask(taskId);
  }, [handleDeleteTask]);

  const handleArchiveTaskForActionMenu = useCallback((task: Task) => () => {
    handleArchiveTask(task);
  }, [handleArchiveTask]);

  const handleActionButtonRef = useCallback((taskId: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      actionButtonRefs.current.set(taskId, el);
    } else {
      actionButtonRefs.current.delete(taskId);
    }
  }, []);

  const renderActionColumn = useCallback((task: Task) => {
    const shouldShowActionMenu = isAdmin || task.CreatedBy === userId;
    if (!shouldShowActionMenu) {
      return null;
    }
    
    return (
      <ActionMenu
        task={task}
        userId={userId}
        onEdit={handleEditTaskForActionMenu(task.id)}
        onDelete={handleDeleteTaskForActionMenu(task.id)}
        onArchive={handleArchiveTaskForActionMenu(task)}
        animateClick={animateClick}
        actionMenuRef={actionMenuRef}
        actionButtonRef={handleActionButtonRef(task.id)}
      />
    );
  }, [isAdmin, userId, handleEditTaskForActionMenu, handleDeleteTaskForActionMenu, handleArchiveTaskForActionMenu, animateClick, actionMenuRef, handleActionButtonRef]);

  const baseColumns = [
    {
      key: 'clientId',
      label: 'Cuenta',
      width: '20%',
      mobileVisible: false,
      sortable: true,
    },
    {
      key: 'name',
      label: 'Tarea',
      width: '60%', 
      mobileVisible: true,
      sortable: true,
    },
    {
      key: 'notificationDot',
      label: '',
      width: '20%',
      mobileVisible: true,
      sortable: true,
      notificationCount: true,
    },
    {
      key: 'assignedTo',
      label: 'Asignados',
      width: '20%',
      mobileVisible: false,
      sortable: true,
    },
    {
      key: 'status',
      label: 'Estado',
      width: '30%', 
      mobileVisible: false,
      sortable: true,
    },
    {
      key: 'priority',
      label: 'Prioridad',
      width: '10%',
      mobileVisible: false,
      sortable: true,
    },
    {
      key: 'action',
      label: 'Acciones',
      width: '10%',
      mobileVisible: false,
      sortable: false, // Las acciones no son ordenables
    },
  ];

  const columns = baseColumns.map((col) => {
    if (col.key === 'clientId') {
      return {
        ...col,
        render: (task: Task) => {
          const client = effectiveClients.find((c) => c.id === task.clientId);
          return renderClientColumn(client);
        },
      };
    }
    if (col.key === 'name') {
      return {
        ...col,
        render: renderTaskNameColumn,
      };
    }
    if (col.key === 'notificationDot') {
      return {
        ...col,
        render: renderNotificationDotColumn,
      };
    }
    if (col.key === 'assignedTo') {
      return {
        ...col,
        render: renderAssignedToColumn,
      };
    }
    if (col.key === 'status') {
      return {
        ...col,
        render: renderStatusColumn,
      };
    }
    if (col.key === 'priority') {
      return {
        ...col,
        render: renderPriorityColumn,
      };
    }
    if (col.key === 'action') {
      return {
        ...col,
                render: renderActionColumn,
      };
    }
    return col;
  });

  useEffect(() => {
    const containerElement = document.querySelector('.tasks-container');

    let startX = 0;
    let currentX = 0;

    const handleTouchStart = (event: TouchEvent) => {
      startX = event.touches[0].clientX;
    };

    const handleTouchMove = (event: TouchEvent) => {
      currentX = event.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const deltaX = currentX - startX;
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // console.log('Swipe right detected');
          // Logic to switch to the previous container
        } else {
          // console.log('Swipe left detected');
          // Logic to switch to the next container
        }
      }
    };

    if (containerElement) {
      containerElement.addEventListener('touchstart', handleTouchStart);
      containerElement.addEventListener('touchmove', handleTouchMove);
      containerElement.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (containerElement) {
        containerElement.removeEventListener('touchstart', handleTouchStart);
        containerElement.removeEventListener('touchmove', handleTouchMove);
        containerElement.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, []);

  // Función para deshacer
  const handleUndo = useCallback(async (undoItem: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
    if (!undoItem || !userId) {
      // console.error('Cannot undo: missing required data');
      return;
    }
    
    // ✅ CORREGIDO: Permitir deshacer a admins Y creadores de la tarea
    const isTaskCreator = undoItem.task.CreatedBy === userId;
    if (!isAdmin && !isTaskCreator) {
      // console.error('Cannot undo: user not authorized', {
      //   isAdmin,
      //   taskCreatedBy: undoItem.task.CreatedBy,
      //   currentUserId: userId
      // });
      return;
    }

    try {
      // ✅ ACTUALIZACIÓN OPTIMISTA: Sin interferencias del useEffect
      
      if (undoItem.action === 'archive') {
        // ✅ OPTIMISTIC UPDATE: Desarchivar la tarea inmediatamente en el estado local
        const updatedTask = { 
          ...undoItem.task, 
          archived: false, 
          archivedAt: undefined, 
          archivedBy: undefined 
        };
        
        // Actualizar el store de datos para que se refleje en el filtrado
        if (!externalTasks) {
          const currentTasks = useDataStore.getState().tasks;
          const updatedTasks = currentTasks.map(t => 
            t.id === undoItem.task.id ? updatedTask : t
          );
          useDataStore.getState().setTasks(updatedTasks);
          
          // ✅ CLAVE: Actualizar también el estado local del filtrado para que la tarea aparezca inmediatamente
          setFilteredTasks([...filteredTasks, updatedTask]);
        }
        
        // Ejecutar la función de desarchivo
        await unarchiveTask(undoItem.task.id, userId, isAdmin, undoItem.task);
        
      } else if (undoItem.action === 'unarchive') {
        // ✅ OPTIMISTIC UPDATE: Archivar la tarea inmediatamente en el estado local
        const updatedTask = { 
          ...undoItem.task, 
          archived: true, 
          archivedAt: new Date().toISOString(), 
          archivedBy: userId 
        };
        
        // Actualizar el store de datos para que se refleje en el filtrado
        if (!externalTasks) {
          const currentTasks = useDataStore.getState().tasks;
          const updatedTasks = currentTasks.map(t => 
            t.id === undoItem.task.id ? updatedTask : t
          );
          useDataStore.getState().setTasks(updatedTasks);
          
          // ✅ CLAVE: Actualizar también el estado local del filtrado para que la tarea desaparezca inmediatamente
          setFilteredTasks(filteredTasks.filter(t => t.id !== undoItem.task.id));
        }
        
        // Ejecutar la función de archivo
        await archiveTask(undoItem.task.id, userId, isAdmin, undoItem.task);
      }
      
      // ✅ OPERACIÓN COMPLETADA: Undo ejecutado exitosamente
      
      // Remover del undo stack
      setUndoStack(undoStack.filter(item => item.timestamp !== undoItem.timestamp));
      setShowUndo(false);
      
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    } catch (error) {
      // ✅ ROLLBACK: Si falla la operación, revertir el estado optimista
      console.error('Error in undo process:', error);
      
      if (!externalTasks) {
        // Revertir el estado local
        const currentTasks = useDataStore.getState().tasks;
        const revertedTasks = currentTasks.map(t => 
          t.id === undoItem.task.id ? undoItem.task : t
        );
        useDataStore.getState().setTasks(revertedTasks);
        
        // ✅ CLAVE: Revertir también el estado local del filtrado
        if (undoItem.action === 'archive') {
          // Si falló el desarchivo, quitar la tarea del filtrado
          setFilteredTasks(filteredTasks.filter(t => t.id !== undoItem.task.id));
        } else {
          // Si falló el archivado, agregar la tarea al filtrado
          setFilteredTasks([...filteredTasks, undoItem.task]);
        }
      }
      
              // Mostrar error al usuario (opcional)
        // Puedes implementar un toast o notificación aquí
    }
  }, [userId, isAdmin, setUndoStack, setShowUndo, undoStack, externalTasks, setFilteredTasks, filteredTasks]);

  const handleUndoClick = useCallback(() => {
    handleUndo(undoStack[undoStack.length - 1]);
  }, [handleUndo, undoStack]);

  const handleUndoMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    e.currentTarget.style.transform = 'scale(1.05)';
  }, []);

  const handleUndoMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    e.currentTarget.style.transform = 'scale(1)';
  }, []);



  // Cleanup all table listeners when component unmounts
  useEffect(() => {
    return () => {
  
      cleanupTasksTableListeners();
      
      // Cleanup undo timeout
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Handle loading state - PRIORIZADO para mostrar SkeletonLoader inmediatamente
  const shouldShowLoader = useMemo(() => {
    // Si hay datos externos, nunca mostrar loader
    if (externalTasks && externalClients && externalUsers) {
      return false;
    }
    
    // ✅ PRIORIDAD: Mostrar loader SIEMPRE que no haya datos completos
    const hasCompleteData = effectiveTasks.length > 0 && effectiveClients.length > 0 && effectiveUsers.length > 0;
    
    // Mostrar loader si NO hay datos completos O está cargando
    const shouldShow = !hasCompleteData || isLoadingTasks;
    
    return shouldShow;
  }, [externalTasks, externalClients, externalUsers, effectiveTasks.length, effectiveClients.length, effectiveUsers.length, isLoadingTasks]);

  if (shouldShowLoader) {
    return (
      <div className={styles.container}>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          `}
        </style>

        <div className={styles.header} style={{margin:'30px 0px'}}>
          <div className={styles.searchWrapper}>
            <div className={styles.searchInput} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
            </div>
          </div>
          <div className={styles.filtersWrapper}>
            <div className={styles.viewButton} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '20px', height: '20px', background: '#f0f0f0', borderRadius: '4px' }} />
              <div style={{ width: '80px', height: '16px', background: '#f0f0f0', borderRadius: '4px', marginLeft: '8px' }} />
            </div>
            <div className={styles.createButton} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '16px', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
              <div style={{ width: '100px', height: '16px', background: '#f0f0f0', borderRadius: '4px', marginLeft: '8px' }} />
            </div>
          </div>
        </div>
        
        {/* ✅ MEJORADO: Mensaje de carga más prominente */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '8px',
            animation: 'pulse 2s infinite'
          }}>
            ⚡
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 4px'
          }}>
            Cargando tareas...
          </h3>
          <p style={{
            fontSize: '14px',
            margin: '0',
            opacity: 0.9
          }}>
            Preparando tu espacio de trabajo
          </p>
        </div>
        
        <SkeletonLoader type="tasks" rows={12} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        `}
      </style>

      <div className={styles.header} style={{margin:'30px 0px'}}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Buscar Tareas"
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Buscar tareas"
            disabled={shouldShowLoader}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        <div className={styles.filtersWrapper}>
          <div className={styles.buttonWithTooltip}>
            <button
              className={`${styles.viewButton} ${styles.hideOnMobile}`}
              onClick={handleViewButtonClick}
            >
              <Image
                src="/kanban.svg"
                draggable="false"
                alt="kanban"
                width={20}
                height={20}
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease',
                  filter:
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                }}
                onMouseEnter={handleKanbanImageMouseEnter}
                onMouseLeave={handleKanbanImageMouseLeave}
              />
            </button>
            <span className={styles.tooltip}>Vista Kanban</span>
          </div>
          <div className={styles.buttonWithTooltip}>
            <button
              className={styles.viewButton}
              onClick={handleArchiveButtonClick}
            >
              <Image
                src="/archive.svg"
                draggable="false"
                alt="archivo"
                width={20}
                height={20}
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease',
                  filter:
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                }}
                onMouseEnter={handleArchiveImageMouseEnter}
                onMouseLeave={handleArchiveImageMouseLeave}
              />
            </button>
            <span className={styles.tooltip}>Archivo</span>
          </div>
          <div className={styles.buttonWithTooltip}>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={handlePriorityDropdownToggle}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                  <span>{priorityFilter || 'Prioridad'}</span>
                </div>
                {isPriorityDropdownOpen && (
                  <AnimatePresence>
                    <motion.div 
                      className={styles.dropdownItems}
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {['Alta', 'Media', 'Baja', ''].map((priority, index) => (
                        <motion.div
                          key={priority || 'all'}
                          className={styles.dropdownItem}
                          onClick={handlePriorityItemClick(priority)}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          {priority || 'Todos'}
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
            <span className={styles.tooltip}>Filtrar por Prioridad</span>
          </div>
          <div className={styles.buttonWithTooltip}>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={clientDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={handleClientDropdownToggle}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                  <span>{effectiveClients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
                </div>
                {isClientDropdownOpen && (
                  <AnimatePresence>
                    <motion.div 
                      className={styles.dropdownItems}
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {[{ id: '', name: 'Todos' }, ...effectiveClients].map((client, index) => (
                        <motion.div
                          key={client.id || 'all'}
                          className={styles.dropdownItem}
                          onClick={handleClientItemClick(client.id)}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          {client.name}
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
            <span className={styles.tooltip}>Filtrar por Cuenta</span>
          </div>

          {isAdmin && (
            <div className={styles.buttonWithTooltip}>
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={userDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={handleUserDropdownToggle}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                    <span>
                      {userFilter === '' 
                        ? 'Todos' 
                        : userFilter === 'me' 
                        ? 'Mis tareas' 
                        : effectiveUsers.find(u => u.id === userFilter)?.fullName || 'Usuario'}
                    </span>
                  </div>
                  {isUserDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <motion.div
                          className={styles.dropdownItem}
                          style={{fontWeight: userFilter === '' ? 700 : 400}}
                          onClick={handleUserFilterEmpty}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: 0 * 0.05 }}
                        >
                          Todos
                        </motion.div>
                        <motion.div
                          className={styles.dropdownItem}
                          style={{fontWeight: userFilter === 'me' ? 700 : 400}}
                          onClick={handleUserFilterMe}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: 1 * 0.05 }}
                        >
                          Mis tareas
                        </motion.div>
                        {effectiveUsers
                          .filter((u) => u.id !== userId)
                          .map((u, index) => (
                            <motion.div
                              key={u.id}
                              className={styles.dropdownItem}
                              style={{fontWeight: userFilter === u.id ? 700 : 400}}
                              onClick={handleUserItemClick(u.id)}
                              initial={{ opacity: 0, y: -16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: (index + 2) * 0.05 }}
                            >
                              {u.fullName}
                            </motion.div>
                          ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
              <span className={styles.tooltip}>Filtrar por Usuario</span>
            </div>
          )}

          
          <div className={styles.buttonWithTooltip}>
            <button
              className={styles.createButton}
              onClick={handleNewTaskButtonClick}
            >
              <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
              <span className={styles.createButtonText}>Crear Tarea</span>
            </button>
            <span className={styles.tooltip}>Crear Nueva Tarea</span>
          </div>
        </div>
      </div>

      <Table
        key={`tasks-table-${effectiveTasksIds}-${filteredTasks.length}`}
        data={sortedTasks}
        columns={columns}
        itemsPerPage={10}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleTaskRowClick}
        getRowClassName={getRowClassName}
        emptyStateType="tasks"
        enableColumnVisibility={true}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={handleColumnVisibilityChange}
      />

      {/* ✅ NUEVO: Estado vacío cuando no hay tareas filtradas */}
      {filteredTasks.length === 0 && (searchQuery || priorityFilter || clientFilter || userFilter) && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          margin: '20px 0',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.6
          }}>
            🔍
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 8px',
            color: 'var(--text-primary)'
          }}>
            No se encontraron tareas
          </h3>
          <p style={{
            fontSize: '16px',
            margin: '0',
            opacity: 0.7
          }}>
            Intenta ajustar los filtros de búsqueda
          </p>
        </div>
      )}
      

      
      {/* Undo Notification */}
      <AnimatePresence>
        {showUndo && undoStack.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.undoNotification}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              fontWeight: 500,
              minWidth: '280px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span>
                {undoStack[undoStack.length - 1]?.action === 'unarchive' 
                  ? 'Tarea desarchivada' 
                  : 'Tarea archivada'}
              </span>
            </div>
            <button
              onClick={handleUndoClick}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={handleUndoMouseEnter}
              onMouseLeave={handleUndoMouseLeave}
            >
              Deshacer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

TasksTable.displayName = 'TasksTable';

export default TasksTable;