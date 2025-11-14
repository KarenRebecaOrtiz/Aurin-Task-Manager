'use client';

import { useEffect, useRef, useMemo, useCallback, memo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from 'zustand';
import Table from '@/modules/shared/components/ui/Table';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import styles from './TasksTable.module.scss';

// Components
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import { TableSkeletonLoader } from '@/modules/data-views/components/shared';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useTasksTableState } from './hooks/useTasksTableState';
import { useTasksTableDropdowns } from './hooks/useTasksTableDropdowns';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTasksCommon } from '@/modules/data-views/tasks/hooks/useTasksCommon';

// Stores
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { useTasksTableActionsStore } from '@/modules/data-views/tasks/stores/tasksTableActionsStore';

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

const cleanupTasksTableListeners = () => {
  // Placeholder for cleanup logic
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
  const { user } = useUser();
  const { isAdmin } = useAuth();

  // ==================== HOOKS CONSOLIDADOS ====================
  const tableState = useTasksTableState({
    externalTasks,
    externalClients,
    externalUsers,
    userId: user?.id,
    isAdmin,
  });

  const dropdowns = useTasksTableDropdowns();

  const {
    openNewTask,
    openNewClient,
    openEditTask,
    openDeleteTask,
    openArchiveTable,
    changeView
  } = useTasksTableActionsStore();

  // Get state and actions from the main tasks store using the vanilla API
  const archiveTask = useStore(tasksTableStore, state => state.archiveTask);
  const undoStack = useStore(tasksTableStore, state => state.undoStack);
  const showUndo = useStore(tasksTableStore, state => state.showUndo);
  // This is a placeholder for the undo action, which should also be in the store
  const unarchiveTask = () => console.log("Undo action needs to be implemented in the store");


  // ==================== LOCAL STATE & REFS ====================
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'clientId', 'name', 'notificationDot', 'assignedTo', 'status', 'priority', 'action'
  ]);

  const effectiveTasksIds = useMemo(
    () => tableState.effectiveTasks.map(t => t.id).join(','),
    [tableState.effectiveTasks]
  );

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

  const {
    getClientName,
    animateClick,
  } = useTasksCommon();

  const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => {
      if (visible) {
        return prev.includes(columnKey) ? prev : [...prev, columnKey];
      } else {
        return prev.filter(key => key !== columnKey);
      }
    });
  }, []);

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

  const sortedTasks = useMemo(() => {
    const sorted = [...tableState.filteredTasks];
    if (!tableState.sortKey || tableState.sortKey === '') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
    }
    // ... other sorting logic
    return sorted;
  }, [tableState.filteredTasks, tableState.sortKey, tableState.sortDirection, tableState.effectiveClients, tableState.effectiveUsers]);

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

  const getRowClassName = useCallback(() => {
    return '';
  }, []);

  const renderClientColumn = useCallback((client: Client) => <ClientCell client={client} />, []);
  const renderTaskNameColumn = useCallback((task: Task) => (
    <div className={styles.taskNameWrapper}><span className={styles.taskName}>{task.name}</span></div>
  ), []);
  const renderNotificationDotColumn = useCallback(() => null, []);
  const renderAssignedToColumn = useCallback((task: Task) => (
    <UserCell assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} users={tableState.effectiveUsers} currentUserId={user?.id} />
  ), [tableState.effectiveUsers, user?.id]);
  const renderStatusColumn = useCallback((task: Task) => <StatusCell status={task.status} />, []);
  const renderPriorityColumn = useCallback((task: Task) => <PriorityCell priority={task.priority} />, []);

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
      await archiveTask(task.id);
      tableState.setActionMenuOpenId(null);
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }, [archiveTask, tableState.setActionMenuOpenId]);

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
    const shouldShowActionMenu = isAdmin || task.CreatedBy === user?.id;
    if (!shouldShowActionMenu) return null;
    
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
    { key: 'clientId', label: 'Cuenta', width: '20%', mobileVisible: false, sortable: true },
    { key: 'name', label: 'Tarea', width: '60%', mobileVisible: true, sortable: true },
    { key: 'notificationDot', label: '', width: '20%', mobileVisible: true, sortable: true, notificationCount: true },
    { key: 'assignedTo', label: 'Asignados', width: '20%', mobileVisible: false, sortable: true },
    { key: 'status', label: 'Estado', width: '30%', mobileVisible: false, sortable: true },
    { key: 'priority', label: 'Prioridad', width: '10%', mobileVisible: false, sortable: true },
    { key: 'action', label: 'Acciones', width: '10%', mobileVisible: false, sortable: false },
  ];

  const columns = baseColumns.map((col) => {
    if (col.key === 'clientId') return { ...col, render: (task: Task) => renderClientColumn(tableState.effectiveClients.find((c) => c.id === task.clientId)) };
    if (col.key === 'name') return { ...col, render: renderTaskNameColumn };
    if (col.key === 'notificationDot') return { ...col, render: renderNotificationDotColumn };
    if (col.key === 'assignedTo') return { ...col, render: renderAssignedToColumn };
    if (col.key === 'status') return { ...col, render: renderStatusColumn };
    if (col.key === 'priority') return { ...col, render: renderPriorityColumn };
    if (col.key === 'action') return { ...col, render: renderActionColumn };
    return col;
  });

  const handleUndoClick = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1];
    if (lastAction) {
      // Call the undo action from the store (which needs to be created)
      // unarchiveTask(lastAction.task.id);
      console.log("Undo clicked for:", lastAction);
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
    return () => {
      cleanupTasksTableListeners();
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
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
          onViewChange={changeView}
          onArchiveTableOpen={openArchiveTable}
          onNewTaskOpen={openNewTask}
          onNewClientOpen={openNewClient}
          onPriorityFiltersChange={tableState.setPriorityFilters}
          onStatusFiltersChange={tableState.setStatusFilters}
          currentView="table"
          disabled
        />
        <TableSkeletonLoader type="tasks" rows={12} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
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
      {tableState.filteredTasks.length === 0 && (tableState.searchQuery || tableState.priorityFilters.length > 0 || tableState.statusFilters.length > 0 || tableState.clientFilter || tableState.userFilter) && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <h3>No se encontraron tareas</h3>
          <p>Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
      <AnimatePresence>
        {showUndo && undoStack.length > 0 && (
          <motion.div
            {...tableAnimations.undoNotification}
            className={styles.undoNotification}
          >
            <span>
              {undoStack[undoStack.length - 1]?.action === 'unarchive' 
                ? 'Tarea desarchivada' 
                : 'Tarea archivada'}
            </span>
            <button
              onClick={handleUndoClick}
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
