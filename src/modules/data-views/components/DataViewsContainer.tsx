'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useDataStore } from '@/stores/dataStore';
import { useUserDataStore } from '@/stores/userDataStore';
import { useAuth } from '@/contexts/AuthContext';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import TasksTableIsolated from '../tasks/components/tables/TasksTableIsolated';
import TasksKanban from '../tasks/components/tables/KanbanBoard/TasksKanban';
import ArchiveTable from '../tasks/components/tables/ArchiveTable/ArchiveTable';

type ViewType = 'table' | 'kanban' | 'archive';

/**
 * DataViewsContainer - Optimized container for instant view switching
 *
 * Uses conditional rendering instead of router.push() to avoid component remounting.
 * All views stay mounted in memory with display:none for instant switching.
 *
 * Performance: ~50ms vs ~2000ms with router.push
 */
export default function DataViewsContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine current view from URL
  const getCurrentView = useCallback((): ViewType => {
    // Check searchParams first (for ?view=kanban)
    const viewParam = searchParams.get('view') as ViewType | null;
    if (viewParam && ['table', 'kanban', 'archive'].includes(viewParam)) {
      return viewParam;
    }

    // Fallback to pathname
    if (pathname.includes('/kanban')) return 'kanban';
    if (pathname.includes('/archive')) return 'archive';
    return 'table';
  }, [pathname, searchParams]);

  const [currentView, setCurrentView] = useState<ViewType>(getCurrentView());

  // Track which views have been mounted (for lazy loading optimization)
  const [mountedViews, setMountedViews] = useState<Set<ViewType>>(
    new Set([getCurrentView()])
  );

  // Sync with URL changes (browser back/forward and pushState events)
  useEffect(() => {
    const handleUrlChange = () => {
      const newView = getCurrentView();
      if (newView !== currentView) {
        setCurrentView(newView);
        // Mark this view as mounted for future instant switches
        setMountedViews(prev => new Set(prev).add(newView));
      }
    };

    // Listen to popstate events (browser back/forward + our custom pushState events)
    window.addEventListener('popstate', handleUrlChange);

    // Initial check
    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [getCurrentView, currentView]);

  // ============================================================
  // TASK URL SYNC - Share task links via ?task=taskId
  // ============================================================

  // Get data from store for task lookup
  const tasks = useDataStore((state) => state.tasks);
  const clients = useDataStore((state) => state.clients);

  // Get current user info for permission check
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const { isAdmin } = useAuth();
  const { error: showError } = useSonnerToast();

  // Track if we've already processed the initial URL task param
  const initialTaskProcessed = useRef(false);

  // Helper to check if user is involved in task
  const isUserInvolvedInTask = useCallback((task: any, currentUserId: string): boolean => {
    if (!currentUserId) return false;
    const isCreator = task.CreatedBy === currentUserId;
    const isAssigned = task.AssignedTo?.includes(currentUserId) ?? false;
    const isLeader = task.LeadedBy?.includes(currentUserId) ?? false;
    return isCreator || isAssigned || isLeader;
  }, []);

  // Read ?task=taskId from URL on mount and open sidebar
  useEffect(() => {
    // Only process once and when data is loaded
    if (initialTaskProcessed.current || tasks.length === 0 || !userId) return;

    const taskId = searchParams.get('task');
    if (!taskId) {
      initialTaskProcessed.current = true;
      return;
    }

    // Find the task
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      // Task not found - remove invalid param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      window.history.replaceState(null, '', url.toString());
      showError('Tarea no encontrada', 'La tarea solicitada no existe o fue eliminada.');
      initialTaskProcessed.current = true;
      return;
    }

    // Check permissions: Only admin or involved users can view
    const canViewTask = isAdmin || isUserInvolvedInTask(task, userId);
    if (!canViewTask) {
      // User doesn't have permission - remove param and show error
      const url = new URL(window.location.href);
      url.searchParams.delete('task');
      window.history.replaceState(null, '', url.toString());
      showError('Acceso denegado', 'No tienes permisos para ver esta tarea.');
      initialTaskProcessed.current = true;
      return;
    }

    // Find client name
    const client = clients.find((c) => c.id === task.clientId);
    const clientName = client?.name || 'Sin cuenta';

    // Open the sidebar
    const { openChatSidebar } = useSidebarStateStore.getState();
    openChatSidebar(task as any, clientName);

    initialTaskProcessed.current = true;
  }, [tasks, clients, searchParams, userId, isAdmin, isUserInvolvedInTask, showError]);

  // Sync sidebar state changes to URL
  useEffect(() => {
    const unsubscribe = useSidebarStateStore.subscribe((state, prevState) => {
      const isTaskSidebar = state.sidebarType === 'chat';
      const wasTaskSidebar = prevState.sidebarType === 'chat';
      const taskId = state.chatSidebar.taskId;
      const prevTaskId = prevState.chatSidebar.taskId;

      // Task sidebar opened or task changed
      if (isTaskSidebar && state.isOpen && taskId && taskId !== prevTaskId) {
        const url = new URL(window.location.href);
        url.searchParams.set('task', taskId);
        window.history.pushState(null, '', url.toString());
      }

      // Task sidebar closed
      if (wasTaskSidebar && !state.isOpen) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('task')) {
          url.searchParams.delete('task');
          window.history.pushState(null, '', url.toString());
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Task handlers from store
  const handleNewTaskOpen = useCallback(() => {
    const { openCreateTask } = useTasksPageStore.getState();
    openCreateTask();
  }, []);

  const handleNewClientOpen = useCallback(() => {
    const { setContainer, setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setContainer('cuentas');
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId, task?.name);
  }, [tasks]);

  const handleArchiveTableOpen = useCallback(() => {
    // Use window.history.pushState for instant navigation without remount
    const newUrl = '/dashboard/archive';
    window.history.pushState(null, '', newUrl);
    setCurrentView('archive');
  }, []);

  const handleViewChange = useCallback((view: 'table' | 'kanban') => {
    const routes = {
      table: '/dashboard/tasks',
      kanban: '/dashboard/kanban',
    };

    const newUrl = routes[view];
    window.history.pushState(null, '', newUrl);
    setCurrentView(view);
  }, []);

  const handleArchiveClose = useCallback(() => {
    const newUrl = '/dashboard/tasks';
    window.history.pushState(null, '', newUrl);
    setCurrentView('table');
  }, []);

  const handleDataRefresh = useCallback(() => {
    // Data refresh is handled by global store - no need to do anything
  }, []);

  // Lazy render: Only mount views that have been visited, then keep them mounted for instant switching
  return (
    <>
      {/* Table View - Lazy mounted, hidden when not active */}
      {mountedViews.has('table') && (
        <div style={{ display: currentView === 'table' ? 'block' : 'none' }}>
          <TasksTableIsolated currentView={currentView} onViewChange={handleViewChange} />
        </div>
      )}

      {/* Kanban View - Lazy mounted, hidden when not active */}
      {mountedViews.has('kanban') && (
        <div style={{ display: currentView === 'kanban' ? 'block' : 'none' }}>
          <TasksKanban
            currentView={currentView}
            onNewClientOpen={handleNewClientOpen}
            onEditTaskOpen={handleEditTask}
            onViewChange={handleViewChange}
            onDeleteTaskOpen={handleDeleteTask}
            onArchiveTableOpen={handleArchiveTableOpen}
          />
        </div>
      )}

      {/* Archive View - Lazy mounted, hidden when not active */}
      {mountedViews.has('archive') && (
        <div style={{ display: currentView === 'archive' ? 'block' : 'none' }}>
          <ArchiveTable
            onEditTaskOpen={handleEditTask}
            onViewChange={handleViewChange}
            onDeleteTaskOpen={handleDeleteTask}
            onClose={handleArchiveClose}
            onDataRefresh={handleDataRefresh}
          />
        </div>
      )}
    </>
  );
}
