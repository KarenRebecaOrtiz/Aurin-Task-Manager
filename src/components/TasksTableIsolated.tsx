import React, { useMemo, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSharedTasksState } from '@/hooks/useSharedTasksState';
import { useTasksTableActionsStore } from '@/stores/tasksTableActionsStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import TasksTable from './TasksTable';

export default function TasksTableIsolated() {
  // Solo log cuando realmente cambia algo importante
  // Debug logging disabled to reduce console spam
  
  const { user } = useUser();
  
  // Get data from shared state
  const {
    tasks,
    clients,
    users,
    isInitialLoadComplete
  } = useSharedTasksState(user?.id);

  // Memoized data
  const memoizedTasks = useMemo(() => tasks, [tasks]);
  const memoizedClients = useMemo(() => clients, [clients]);
  const memoizedUsers = useMemo(() => users, [users]);

  // Configure action handlers for TasksTable
  useEffect(() => {
    const { setActionHandlers } = useTasksTableActionsStore.getState();
    
    setActionHandlers({
      openNewTask: () => {
        console.log('[TasksTableIsolated] openNewTask called');
        const { openCreateTask } = useTasksPageStore.getState();
        openCreateTask();
      },
      openEditTask: (taskId: string) => {
        console.log('[TasksTableIsolated] openEditTask called', taskId);
        const { openEditTask } = useTasksPageStore.getState();
        openEditTask(taskId);
      },
      openDeleteTask: (taskId: string) => {
        console.log('[TasksTableIsolated] openDeleteTask called', taskId);
        const { openDeletePopup } = useTasksPageStore.getState();
        openDeletePopup('task', taskId);
      },
      openArchiveTable: () => {
        console.log('[TasksTableIsolated] openArchiveTable called');
        const { openArchiveTable } = useTasksPageStore.getState();
        openArchiveTable();
      },
      changeView: (view: 'table' | 'kanban') => {
        console.log('[TasksTableIsolated] changeView called', view);
        const { setTaskView } = useTasksPageStore.getState();
        setTaskView(view);
      },
      openProfile: (user: { id: string; imageUrl: string }) => {
        console.log('[TasksTableIsolated] openProfile called', user.id);
        // Profile functionality removed
      },
      openMessageSidebar: (user: { id: string; imageUrl: string; fullName: string; role: string }) => {
        console.log('[TasksTableIsolated] openMessageSidebar called', user.id);
        const { openMessageSidebar } = useSidebarStateStore.getState();
        const conversationId = `conversation_${user.id}_${user?.id}`;
        openMessageSidebar(user?.id || '', {
          id: user.id,
          imageUrl: user.imageUrl,
          fullName: user.fullName,
          role: user.role,
        }, conversationId);
      },
      openChatSidebar: (task: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string }, clientName: string) => {
        console.log('[TasksTableIsolated] openChatSidebar called', task.id);
        const { openChatSidebar } = useSidebarStateStore.getState();
        openChatSidebar(task, clientName);
      },
    });
  }, []);

  // Only render if data is ready
  if (!isInitialLoadComplete) {
    return null;
  }

  return (
    <TasksTable
      externalTasks={memoizedTasks}
      externalClients={memoizedClients}
      externalUsers={memoizedUsers}
    />
  );
} 