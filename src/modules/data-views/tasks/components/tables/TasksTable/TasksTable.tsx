'use client';

import { useEffect, useRef, useMemo, useCallback, memo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import Table from '@/modules/shared/components/ui/Table';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import styles from './TasksTable.module.scss';

// Components
import { Button } from '@/modules/shared/components/atoms/Button';
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import SkeletonLoader from '@/components/SkeletonLoader';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useTasksTableState } from './hooks/useTasksTableState';
import { useTasksTableDropdowns } from './hooks/useTasksTableDropdowns';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTaskArchiving } from '@/modules/data-views/tasks/hooks/useTaskArchiving';
import { useTasksTableActionsStore } from '@/modules/data-views/tasks/stores/tasksTableActionsStore';
import { useTasksCommon } from '@/modules/data-views/tasks/hooks/useTasksCommon';

// Utils and components
import { normalizeStatus } from '@/modules/data-views/utils';
import { StatusCell, PriorityCell, ClientCell, UserCell } from '@/modules/data-views/components/shared/cells';
import { getLastActivityTimestamp } from '@/lib/taskUtils';
import { tableAnimations } from '@/modules/data-views/animations/tableAnimations';

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

// ✅ REMOVED: normalizeStatus function moved to @/modules/tasks/utils/statusUtils
// Now imported from shared utilities

// ✅ ELIMINADO: AvatarGroup ahora es un componente atómico reutilizable
// Se importa desde @/modules/shared/components/atoms/Avatar

// Eliminar todo el sistema de caché global
const cleanupTasksTableListeners = () => {
  
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

  // ==================== HOOKS CONSOLIDADOS ====================

  // Table state hook (replaces 100+ lines of Zustand selectors)
  const tableState = useTasksTableState({
    externalTasks,
    externalClients,
    externalUsers,
    userId: user?.id,
    isAdmin,
  });

  // Dropdown management hook
  const dropdowns = useTasksTableDropdowns();

  // Actions store
  const {
    openNewTask,
    openNewClient,
    openEditTask,
    openDeleteTask,
    openArchiveTable,
    changeView
  } = useTasksTableActionsStore();

  // Archiving hook
  const {
    handleArchiveTask: archiveTaskCentralized,
    handleUndo: undoCentralized,
    undoStack: centralizedUndoStack,
    showUndo: centralizedShowUndo
  } = useTaskArchiving({
    onSuccess: (task, action) => {
      if (action === 'archive') {
        // Task filtered out automatically by tableState
      }
    },
    onError: (error, task, action) => {
      console.error(`Error ${action}ing task:`, error);
    }
  });

  // ==================== LOCAL STATE & REFS ====================

  // Refs
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'clientId', 'name', 'notificationDot', 'assignedTo', 'status', 'priority', 'action'
  ]);

  // Memoize IDs for stable dependencies
  const effectiveTasksIds = useMemo(
    () => tableState.effectiveTasks.map(t => t.id).join(','),
    [tableState.effectiveTasks]
  );

  // Filters hook
  const filters = useTaskFilters({
    clients: tableState.effectiveClients,
    users: tableState.effectiveUsers,
    priorityFilter: tableState.priorityFilter,
    clientFilter: tableState.clientFilter,
    userFilter: tableState.userFilter,
    setPriorityFilter: tableState.setPriorityFilter,
    setClientFilter: tableState.setClientFilter,
    setUserFilter: tableState.setUserFilter,
    isAdmin,
  });

  // Common utilities hook
  const {
    getClientName,
    animateClick,
  } = useTasksCommon();

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

  // ==================== EFFECTS ====================

  // Update legacy store with filtered tasks (for compatibility)
  useEffect(() => {
    tableState.setFilteredTasks(tableState.filteredTasks);
  }, [tableState.filteredTasks, tableState]);

  // Reset pagination when filtered tasks change
  useEffect(() => {
    const tableElement = document.querySelector('[data-table="tasks"]');
    if (tableElement) {
      const resetEvent = new CustomEvent('resetPagination', { detail: { reason: 'filterChanged' } });
      tableElement.dispatchEvent(resetEvent);
    }
  }, [tableState.filteredTasks.length]);

  // Función para manejar el clic en una fila de tarea
  const handleTaskRowClick = useCallback(async (task: Task) => {

    
    // Notification system removed - using NodeMailer instead
    
    // Usar los action handlers configurados en TasksTableContainer
    const { openChatSidebar } = useTasksTableActionsStore.getState();
    
    // ✅ CENTRALIZADO: Buscar el nombre del cliente usando función común
    const clientName = getClientName(task.clientId);
    
    // Abrir el sidebar inmediatamente (red dot ya desapareció)
    openChatSidebar(task, clientName);
    
    
  }, [getClientName]);

  // ✅ GSAP animations removed - using Framer Motion in Dropdown component instead

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        !actionButtonRefs.current.get(tableState.actionMenuOpenId || '')?.contains(event.target as Node)
      ) {
        tableState.setActionMenuOpenId(null);
        // console.log('[TasksTable] Action menu closed via outside click');
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isPriorityDropdownOpen
      ) {
        dropdowns.setIsPriorityDropdownOpen(false);
        // console.log('[TasksTable] Priority dropdown closed via outside click');
      }
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isClientDropdownOpen
      ) {
        dropdowns.setIsClientDropdownOpen(false);
        // console.log('[TasksTable] Client dropdown closed via outside click');
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isUserDropdownOpen
      ) {
        dropdowns.setIsUserDropdownOpen(false);
        // console.log('[TasksTable] User dropdown closed via outside click');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tableState.actionMenuOpenId, dropdowns.isPriorityDropdownOpen, dropdowns.isClientDropdownOpen, dropdowns.isUserDropdownOpen, tableState.setActionMenuOpenId, dropdowns.setIsPriorityDropdownOpen, dropdowns.setIsClientDropdownOpen, dropdowns.setIsUserDropdownOpen]);

  const handleSort = useCallback((key: string) => {
    if (!key || key === '') {
      // Remover ordenamiento
      tableState.setSortKey('');
      tableState.setSortDirection('asc');
      // console.log('[TasksTable] Removed sorting');
      return;
    }
    
    if (key === tableState.sortKey) {
      tableState.setSortDirection(tableState.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      tableState.setSortKey(key);
      tableState.setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
    // console.log('[TasksTable] Sorting tasks:', { sortKey: key, sortDirection });
  }, [tableState.sortKey, tableState.sortDirection, tableState.setSortKey, tableState.setSortDirection]);

  // ✅ OPTIMIZACIÓN: Usar directamente el estado local del store
  const sortedTasks = useMemo(() => {
    // console.log('[TasksTable] sortedTasks recalculating', {
    //   filteredTasksCount: tableState.filteredTasks.length,
    //   sortKey: tableState.sortKey,
    //   sortDirection: tableState.sortDirection,
    //   effectiveClientsCount: tableState.effectiveClients.length,
    //   effectiveUsersCount: tableState.effectiveUsers.length
    // });
    
    const sorted = [...tableState.filteredTasks];
    
    // Si no hay sortKey o está vacío, aplicar ordenamiento por defecto por createdAt
    if (!tableState.sortKey || tableState.sortKey === '') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Orden descendente (más recientes primero)
      });
      return sorted;
    }
    
    if (tableState.sortKey === 'lastActivity') {
      sorted.sort((a, b) => {
        const activityA = getLastActivityTimestamp(a);
        const activityB = getLastActivityTimestamp(b);
        return tableState.sortDirection === 'asc' ? activityA - activityB : activityB - activityA;
      });
    } else if (tableState.sortKey === 'clientId') {
      sorted.sort((a, b) => {
        const clientA = tableState.effectiveClients.find((c) => c.id === a.clientId)?.name || '';
        const clientB = tableState.effectiveClients.find((c) => c.id === b.clientId)?.name || '';
        return tableState.sortDirection === 'asc'
          ? clientA.localeCompare(clientB)
          : clientB.localeCompare(clientA);
      });
    } else if (tableState.sortKey === 'notificationDot') {
      // Notification system removed - using NodeMailer instead
      sorted.sort(() => {
        const countA = 0;
        const countB = 0;
        return tableState.sortDirection === 'asc' ? countA - countB : countB - countA;
      });
    } else if (tableState.sortKey === 'assignedTo') {
      // Ordenamiento por número de asignados y luego alfabético por primer asignado
      sorted.sort((a, b) => {
        const assignedCountA = (a.AssignedTo?.length || 0) + (a.LeadedBy?.length || 0);
        const assignedCountB = (b.AssignedTo?.length || 0) + (b.LeadedBy?.length || 0);
        
        if (assignedCountA !== assignedCountB) {
          return tableState.sortDirection === 'asc' ? assignedCountA - assignedCountB : assignedCountB - assignedCountA;
        }
        
        // En caso de empate, ordenar por nombre del primer asignado
        const firstAssignedA = tableState.effectiveUsers.find(u => a.AssignedTo?.[0] === u.id || a.LeadedBy?.[0] === u.id)?.fullName || '';
        const firstAssignedB = tableState.effectiveUsers.find(u => b.AssignedTo?.[0] === u.id || b.LeadedBy?.[0] === u.id)?.fullName || '';
        
        return tableState.sortDirection === 'asc'
          ? firstAssignedA.localeCompare(firstAssignedB)
          : firstAssignedB.localeCompare(firstAssignedA);
      });
    } else if (tableState.sortKey === 'status') {
      // Ordenamiento personalizado para estados
      const statusOrder = ['Por Iniciar', 'En Proceso', 'En Revisión', 'Finalizado', 'Archivado', 'Cancelado'];
      sorted.sort((a, b) => {
        const indexA = statusOrder.indexOf(normalizeStatus(a.status));
        const indexB = statusOrder.indexOf(normalizeStatus(b.status));
        const validIndexA = indexA === -1 ? statusOrder.length : indexA;
        const validIndexB = indexB === -1 ? statusOrder.length : indexB;
        return tableState.sortDirection === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
      });
    } else if (tableState.sortKey === 'priority') {
      // Ordenamiento personalizado para prioridades
      const priorityOrder = ['Alta', 'Media', 'Baja'];
      sorted.sort((a, b) => {
        const indexA = priorityOrder.indexOf(a.priority);
        const indexB = priorityOrder.indexOf(b.priority);
        const validIndexA = indexA === -1 ? priorityOrder.length : indexA;
        const validIndexB = indexB === -1 ? priorityOrder.length : indexB;
        return tableState.sortDirection === 'asc' ? validIndexA - validIndexB : validIndexB - validIndexA;
      });
    } else if (tableState.sortKey === 'createdAt') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return tableState.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (tableState.sortKey === 'name') {
      // Ordenamiento alfabético para nombres de tareas
      sorted.sort((a, b) =>
        tableState.sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else {
      // Ordenamiento genérico para otras columnas
      sorted.sort((a, b) =>
        tableState.sortDirection === 'asc'
          ? String(a[tableState.sortKey as keyof Task]).localeCompare(String(b[tableState.sortKey as keyof Task]))
          : String(b[tableState.sortKey as keyof Task]).localeCompare(String(a[tableState.sortKey as keyof Task])),
      );
    }
    
    // console.log('[TasksTable] sortedTasks result', {
    //   sortedCount: sorted.length,
    //   sortKey: tableState.sortKey,
    //   sortDirection: tableState.sortDirection
    // });
    
    return sorted;
  }, [tableState.filteredTasks, tableState.sortKey, tableState.sortDirection, tableState.effectiveClients, tableState.effectiveUsers]);

  // ✅ ELIMINADO: animateClick ahora viene del hook centralizado useTasksCommon

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

  // Función para obtener las clases CSS de una fila de tarea
  const getRowClassName = useCallback(() => {
    return ''; // Removido el indicador de actualización de la fila completa
  }, []);

  // ✅ FUNCIONES MEMOIZADAS PARA RENDERS DE COLUMNAS - Using new cell components
  const renderClientColumn = useCallback((client: Client) => {
    return <ClientCell client={client} />;
  }, []);

  const renderTaskNameColumn = useCallback((task: Task) => {
    return (
      <div className={styles.taskNameWrapper}>
        <span className={styles.taskName}>{task.name}</span>
      </div>
    );
  }, []);

  const renderNotificationDotColumn = useCallback(() => {
    // Notification system removed - using NodeMailer instead
    return null;
  }, []);

  const renderAssignedToColumn = useCallback((task: Task) => {
    return <UserCell assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} users={tableState.effectiveUsers} currentUserId={user?.id} />;
  }, [tableState.effectiveUsers, user?.id]);

  const renderStatusColumn = useCallback((task: Task) => {
    return <StatusCell status={task.status} />;
  }, []);

  const renderPriorityColumn = useCallback((task: Task) => {
    return <PriorityCell priority={task.priority} />;
  }, []);

  // ✅ CORREGIDO: Memoizar handlers para ActionMenu
  const handleEditTask = useCallback((taskId: string) => {
    openEditTask(taskId);
    tableState.setActionMenuOpenId(null);
  }, [openEditTask, tableState.setActionMenuOpenId]);

  const handleDeleteTask = useCallback((taskId: string) => {
    openDeleteTask(taskId);
    tableState.setActionMenuOpenId(null);
  }, [openDeleteTask, tableState.setActionMenuOpenId]);

  // ✅ CENTRALIZADO: Usar hook centralizado para archivar tareas
  const handleArchiveTask = useCallback(async (task: Task) => {
    try {
      await archiveTaskCentralized(task, user?.id, isAdmin);
      tableState.setActionMenuOpenId(null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error archiving task:', error);
    }
  }, [archiveTaskCentralized, user?.id, isAdmin, tableState.setActionMenuOpenId]);

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
    const shouldShowActionMenu = isAdmin || task.CreatedBy === user?.id;
    if (!shouldShowActionMenu) {
      return null;
    }
    
    return (
      <ActionMenu
        task={task}
        userId={user?.id}
        onEdit={handleEditTaskForActionMenu(task.id)}
        onDelete={handleDeleteTaskForActionMenu(task.id)}
        onArchive={handleArchiveTaskForActionMenu(task)}
        animateClick={animateClick}
        actionMenuRef={actionMenuRef}
        actionButtonRef={handleActionButtonRef(task.id)}
      />
    );
  }, [isAdmin, user?.id, handleEditTaskForActionMenu, handleDeleteTaskForActionMenu, handleArchiveTaskForActionMenu, animateClick, actionMenuRef, handleActionButtonRef]);

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
          const client = tableState.effectiveClients.find((c) => c.id === task.clientId);
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

  // ✅ CENTRALIZADO: Usar hook centralizado para deshacer
  const handleUndo = useCallback(async (undoItem?: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
    try {
      // Usar la función centralizada de undo
      if (undoItem) {
        const mappedUndoItem = {
          task: undoItem.task,
          action: undoItem.action,
          timestamp: undoItem.timestamp
        };
        await undoCentralized(mappedUndoItem);
      } else {
        await undoCentralized();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in undo process:', error);
    }
  }, [undoCentralized]);

  const handleUndoClick = useCallback(() => {
    handleUndo(centralizedUndoStack[centralizedUndoStack.length - 1]);
  }, [handleUndo, centralizedUndoStack]);

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
      const timeoutId = undoTimeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
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
    const hasCompleteData = tableState.effectiveTasks.length > 0 && tableState.effectiveClients.length > 0 && tableState.effectiveUsers.length > 0;
    
    // Mostrar loader si NO hay datos completos O está cargando
    const shouldShow = !hasCompleteData || tableState.isLoadingTasks;
    
    return shouldShow;
  }, [externalTasks, externalClients, externalUsers, tableState.effectiveTasks.length, tableState.effectiveClients.length, tableState.effectiveUsers.length, tableState.isLoadingTasks]);

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

      {/* ✅ REFACTORIZADO: Usando TasksHeader modular */}
      <TasksHeader
        searchQuery={tableState.searchQuery}
        setSearchQuery={tableState.setSearchQuery}
        searchCategory={tableState.searchCategory}
        setSearchCategory={tableState.setSearchCategory}
        onViewChange={changeView}
        onArchiveTableOpen={openArchiveTable}
        onNewTaskOpen={openNewTask}
        onNewClientOpen={openNewClient}
        onPriorityFiltersChange={tableState.setPriorityFilters}
        onStatusFiltersChange={tableState.setStatusFilters}
        currentView="table"
      />

      <Table
        key={`tasks-table-${effectiveTasksIds}-${tableState.filteredTasks.length}`}
        data={sortedTasks}
        columns={columns}
        itemsPerPage={10}
        sortKey={tableState.sortKey}
        sortDirection={tableState.sortDirection}
        onSort={handleSort}
        onRowClick={handleTaskRowClick}
        getRowClassName={getRowClassName}
        emptyStateType="tasks"
        enableColumnVisibility={true}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={handleColumnVisibilityChange}
      />

      {/* ✅ NUEVO: Estado vacío cuando no hay tareas filtradas */}
      {tableState.filteredTasks.length === 0 && (tableState.searchQuery || tableState.priorityFilter || tableState.clientFilter || tableState.userFilter) && (
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
        {centralizedShowUndo && centralizedUndoStack.length > 0 && (
          <motion.div
            {...tableAnimations.undoNotification}
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
                {centralizedUndoStack[centralizedUndoStack.length - 1]?.action === 'unarchive' 
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