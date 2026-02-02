'use client';

import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useStore } from 'zustand';
import { Task, Client, User } from '@/types';
import Table from '@/modules/data-views/components/shared/table/Table';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import { SharedBadge } from '@/modules/shared/components/ui';
import { useUserDataStore } from '@/stores/userDataStore';
import styles from './TasksTable.module.scss';
import { Folder } from 'lucide-react';

// Components
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import { NotesWrapper } from '@/modules/data-views/components/ui/NotesWrapper';
import { TableSkeletonLoader } from '@/modules/data-views/components/shared';
import { ViewToggle } from '@/modules/data-views/components/ui/ViewToggle';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useTasksTableState } from './hooks/useTasksTableState';
import { useTasksTableDropdowns } from './hooks/useTasksTableDropdowns';
import { useTasksCommon } from '@/modules/data-views/tasks/hooks/useTasksCommon';

// Stores
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { useTasksTableActionsStore } from '@/modules/data-views/tasks/stores/tasksTableActionsStore';
import { usePinnedTasksStore } from '@/modules/data-views/tasks/stores/pinnedTasksStore';

// Utils and components
import { StatusCell, PriorityCell, UserCell, ClientCell, TimeCell } from '@/modules/data-views/components/shared/cells';

const cleanupTasksTableListeners = () => {
  // Placeholder for cleanup logic
};

interface TasksTableProps {
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
  currentView?: 'table' | 'kanban' | 'archive';
  onViewChange?: (view: 'table' | 'kanban') => void;
}

const TasksTable: React.FC<TasksTableProps> = memo(({
  externalTasks,
  externalClients,
  externalUsers,
  currentView = 'table',
  onViewChange,
}) => {
  // ✅ Obtener userId desde userDataStore (Single Source of Truth)
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const { isAdmin } = useAuth();

  // ==================== HOOKS CONSOLIDADOS ====================
  const tableState = useTasksTableState({
    externalTasks,
    externalClients,
    externalUsers,
    userId,
    isAdmin,
  });

  const dropdowns = useTasksTableDropdowns();

  const {
    openEditTask,
    openDeleteTask,
  } = useTasksTableActionsStore();

  // Get state and actions from the main tasks store using the vanilla API
  const archiveTask = useStore(tasksTableStore, state => state.archiveTask);
  const undoStack = useStore(tasksTableStore, state => state.undoStack);
  const showUndo = useStore(tasksTableStore, state => state.showUndo);


  // ==================== LOCAL STATE & REFS ====================
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const effectiveTasksIds = useMemo(
    () => tableState.effectiveTasks.map(t => t.id).join(','),
    [tableState.effectiveTasks]
  );

  const {
    getClientName,
    animateClick,
  } = useTasksCommon();

  // ==================== EFFECTS ====================
  useEffect(() => {
    tableState.setFilteredTasks(tableState.filteredTasks);
  }, [tableState.filteredTasks, tableState]);

  useEffect(() => {
    const tableElement = document.querySelector('[data-table="tasks"]');
    if (tableElement) {
      const resetEvent = new CustomEvent('resetPagination', { detail: { reason: 'filterChanged' } });
      tableElement.dispatchEvent(resetEvent);
    }
  }, [tableState.filteredTasks.length]);

  const handleTaskRowClick = useCallback(async (task: Task) => {
    const { openChatSidebar } = useTasksTableActionsStore.getState();
    const clientName = getClientName(task.clientId);
    openChatSidebar(task, clientName);
  }, [getClientName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        !actionButtonRefs.current.get(tableState.actionMenuOpenId || '')?.contains(event.target as Node)
      ) {
        tableState.setActionMenuOpenId(null);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isPriorityDropdownOpen
      ) {
        dropdowns.setIsPriorityDropdownOpen(false);
      }
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isClientDropdownOpen
      ) {
        dropdowns.setIsClientDropdownOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node) &&
        dropdowns.isUserDropdownOpen
      ) {
        dropdowns.setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tableState.actionMenuOpenId, dropdowns.isPriorityDropdownOpen, dropdowns.isClientDropdownOpen, dropdowns.isUserDropdownOpen, tableState.setActionMenuOpenId, dropdowns.setIsPriorityDropdownOpen, dropdowns.setIsClientDropdownOpen, dropdowns.setIsUserDropdownOpen]);

  const handleSort = useCallback((key: string) => {
    if (!key || key === '') {
      tableState.setSortKey('');
      tableState.setSortDirection('asc');
      return;
    }
    
    if (key === tableState.sortKey) {
      tableState.setSortDirection(tableState.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      tableState.setSortKey(key);
      tableState.setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
  }, [tableState.sortKey, tableState.sortDirection, tableState.setSortKey, tableState.setSortDirection]);

  // Pinned tasks store
  const pinnedTaskIds = usePinnedTasksStore(state => state.pinnedTaskIds);

  const sortedTasks = useMemo(() => {
    const sorted = [...tableState.filteredTasks];
    if (!tableState.sortKey || tableState.sortKey === '') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // ... other sorting logic

    // Pinned tasks go first, maintaining their pin order
    const pinnedTasks: Task[] = [];
    const unpinnedTasks: Task[] = [];

    sorted.forEach(task => {
      if (pinnedTaskIds.includes(task.id)) {
        pinnedTasks.push(task);
      } else {
        unpinnedTasks.push(task);
      }
    });

    // Sort pinned tasks by their position in pinnedTaskIds array
    pinnedTasks.sort((a, b) => {
      return pinnedTaskIds.indexOf(a.id) - pinnedTaskIds.indexOf(b.id);
    });

    return [...pinnedTasks, ...unpinnedTasks];
  }, [tableState.filteredTasks, tableState.sortKey, pinnedTaskIds]);

  const getRowClassName = useCallback((task: Task) => {
    if (pinnedTaskIds.includes(task.id)) {
      return styles.pinnedRow;
    }
    return '';
  }, [pinnedTaskIds]);

  const renderTaskNameColumn = useCallback((task: Task) => {
    return (
      <div className={styles.taskNameWrapper}>
        <span className={styles.taskName}>{task.name}</span>
        {task.shared && <SharedBadge />}
      </div>
    );
  }, []);

  const renderProjectColumn = useCallback((task: Task) => {
    // Truncate project name if too long
    const projectName = task.project || 'Sin proyecto';
    const truncatedName = projectName.length > 24 ? projectName.slice(0, 21) + '...' : projectName;
    return (
      <div className={styles.projectWrapper}>
        <span className={styles.projectName}>
          <Folder size={16} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline-block' }} />
          <span style={{ verticalAlign: 'middle', display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncatedName}</span>
        </span>
      </div>
    );
  }, []);
  const renderAssignedToColumn = useCallback((task: Task) => (
    <UserCell assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} currentUserId={userId} />
  ), [userId]);
  const renderStatusColumn = useCallback((task: Task) => <StatusCell status={task.status} />, []);
  const renderPriorityColumn = useCallback((task: Task) => <PriorityCell priority={task.priority} />, []);
  const renderTimeColumn = useCallback((task: Task) => (
    <TimeCell timeTracking={task.timeTracking} totalHours={task.totalHours} />
  ), []);

  const renderClientColumn = useCallback((task: Task) => {
    const client = tableState.effectiveClients.find(c => c.id === task.clientId);
    return <ClientCell client={client} />;
  }, [tableState.effectiveClients]);

  const handleEditTask = useCallback((taskId: string) => {
    openEditTask(taskId);
    tableState.setActionMenuOpenId(null);
  }, [openEditTask, tableState.setActionMenuOpenId]);

  const handleDeleteTask = useCallback((taskId: string) => {
    openDeleteTask(taskId);
    tableState.setActionMenuOpenId(null);
  }, [openDeleteTask, tableState.setActionMenuOpenId]);

  const handleArchiveTask = useCallback(async (task: Task) => {
    try {
      if (!userId) {
        console.error('User not authenticated');
        return;
      }
      await archiveTask(task.id, userId);
      tableState.setActionMenuOpenId(null);
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }, [archiveTask, tableState.setActionMenuOpenId, userId]);

  const handleEditTaskForActionMenu = useCallback((taskId: string) => () => handleEditTask(taskId), [handleEditTask]);
  const handleDeleteTaskForActionMenu = useCallback((taskId: string) => () => handleDeleteTask(taskId), [handleDeleteTask]);
  const handleArchiveTaskForActionMenu = useCallback((task: Task) => () => handleArchiveTask(task), [handleArchiveTask]);

  const handleActionButtonRef = useCallback((taskId: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      actionButtonRefs.current.set(taskId, el);
    } else {
      actionButtonRefs.current.delete(taskId);
    }
  }, []);

  const renderActionColumn = useCallback((task: Task) => {
    // El ActionMenu ahora maneja internamente los permisos:
    // - Usuarios involucrados (AssignedTo, LeadedBy, CreatedBy) pueden ver el menú y fijar
    // - Solo Admin o Creator pueden editar/archivar/eliminar
    // Pasamos el userId y dejamos que ActionMenu decida qué mostrar
    return (
      <ActionMenu
        task={task}
        userId={userId}
        onEdit={handleEditTaskForActionMenu(task.id)}
        onDelete={handleDeleteTaskForActionMenu(task.id)}
        onArchive={handleArchiveTaskForActionMenu(task)}
        showPinOption={true}
        animateClick={animateClick}
        actionMenuRef={actionMenuRef}
        actionButtonRef={handleActionButtonRef(task.id)}
      />
    );
  }, [userId, handleEditTaskForActionMenu, handleDeleteTaskForActionMenu, handleArchiveTaskForActionMenu, animateClick, actionMenuRef, handleActionButtonRef]);

  // Columnas ordenadas: Cuenta, Tarea, Asignados, Proyecto, Estado, Prioridad, Tiempo, Acciones
  // Mobile: solo Tarea, Proyecto y Acciones visibles
  // Desktop: 60px + 24% + 12% + 16% + 12% + 10% + 10% + 8% (uses min-width for table)
  // Mobile: 50% + 35% + 15% = 100%
  const baseColumns = [
    { key: 'client', label: 'Cuenta', width: '60px', mobileVisible: false, sortable: false },
    { key: 'name', label: 'Tarea', width: '24%', mobileVisible: true, mobileWidth: '50%', sortable: true },
    { key: 'assignedTo', label: 'Asignados', width: '12%', mobileVisible: false, sortable: true },
    { key: 'project', label: 'Proyecto', width: '16%', mobileVisible: true, mobileWidth: '35%', sortable: true },
    { key: 'status', label: 'Estado', width: '12%', mobileVisible: false, sortable: true },
    { key: 'priority', label: 'Prioridad', width: '10%', mobileVisible: false, sortable: true },
    { key: 'timeTracking', label: 'Tiempo', width: '10%', mobileVisible: false, sortable: true },
    { key: 'action', label: 'Acciones', width: '8%', mobileVisible: true, mobileWidth: '15%', sortable: false },
  ];

  const columns = baseColumns.map((col) => {
    if (col.key === 'client') return { ...col, render: renderClientColumn };
    if (col.key === 'name') return { ...col, render: renderTaskNameColumn };
    if (col.key === 'assignedTo') return { ...col, render: renderAssignedToColumn };
    if (col.key === 'project') return { ...col, render: renderProjectColumn };
    if (col.key === 'status') return { ...col, render: renderStatusColumn };
    if (col.key === 'priority') return { ...col, render: renderPriorityColumn };
    if (col.key === 'timeTracking') return { ...col, render: renderTimeColumn };
    if (col.key === 'action') return { ...col, render: renderActionColumn };
    return col;
  });

  const handleUndoClick = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1];
    if (lastAction) {
      // TODO: Call the undo action from the store (which needs to be created)
      // unarchiveTask(lastAction.task.id);
    }
  }, [undoStack]);

  const handleUndoMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    e.currentTarget.style.transform = 'scale(1.05)';
  }, []);

  const handleUndoMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

  useEffect(() => {
    const timeoutRef = undoTimeoutRef.current;
    return () => {
      cleanupTasksTableListeners();
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, []);

  const shouldShowLoader = useMemo(() => {
    if (externalTasks && externalClients && externalUsers) return false;
    const hasCompleteData = tableState.effectiveTasks.length > 0 && tableState.effectiveClients.length > 0 && tableState.effectiveUsers.length > 0;
    return !hasCompleteData || tableState.isLoadingTasks;
  }, [externalTasks, externalClients, externalUsers, tableState.effectiveTasks.length, tableState.effectiveClients.length, tableState.effectiveUsers.length, tableState.isLoadingTasks]);

  if (shouldShowLoader) {
    return (
      <div className={styles.container}>
        <TasksHeader
          searchQuery={tableState.searchQuery}
          setSearchQuery={tableState.setSearchQuery}
          searchCategory={tableState.searchCategory}
          setSearchCategory={tableState.setSearchCategory}
          onPriorityFiltersChange={tableState.setPriorityFilters}
          onStatusFiltersChange={tableState.setStatusFilters}
          currentView="table"
        />
        <TableSkeletonLoader type="tasks" rows={12} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <NotesWrapper />
      <TasksHeader
        searchQuery={tableState.searchQuery}
        setSearchQuery={tableState.setSearchQuery}
        searchCategory={tableState.searchCategory}
        setSearchCategory={tableState.setSearchCategory}
        onPriorityFiltersChange={tableState.setPriorityFilters}
        onStatusFiltersChange={tableState.setStatusFilters}
        currentView="table"
      />
      {/* View Toggle - Below header */}
      {onViewChange && (
        <div className={styles.viewToggleWrapper}>
          <ViewToggle
            currentView={currentView as 'table' | 'kanban'}
            onViewChange={onViewChange}
          />
        </div>
      )}
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
      />
      {tableState.filteredTasks.length === 0 && (tableState.searchQuery.length > 0 || tableState.priorityFilters.length > 0 || tableState.statusFilters.length > 0 || tableState.clientFilter || tableState.userFilter) && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <h3>No se encontraron tareas</h3>
          <p>Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
      {showUndo && undoStack.length > 0 && (
        <div
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
              borderRadius: '50%'
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
        </div>
      )}
    </div>
  );
});

TasksTable.displayName = 'TasksTable';

export default TasksTable;
