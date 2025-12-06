import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useTasksTableActionsStore } from '../../stores/tasksTableActionsStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useOrphanedTimerCleanup } from '@/modules/chat/timer';
import TasksTable from './TasksTable';

export default function TasksTableIsolated() {
  const { user } = useUser();

  // ✅ SOLUCIÓN: Usar directamente useDataStore para actualización inmediata
  const {
    tasks,
    clients,
    users,
  } = useDataStore(useShallow(state => ({
    tasks: state.tasks,
    clients: state.clients,
    users: state.users,
  })));

  // 🧹 CLEANUP: Automatically clean up timers for deleted tasks
  const taskIds = tasks.map(task => task.id);
  useOrphanedTimerCleanup(taskIds, user?.id || null);

  // Configure action handlers for TasksTable
  useEffect(() => {
    const { setActionHandlers } = useTasksTableActionsStore.getState();
    
    setActionHandlers({
      openNewTask: () => {
        const { openCreateTask } = useTasksPageStore.getState();
        openCreateTask();
      },
      openNewClient: () => {
        const { setContainer, setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
        setContainer('cuentas');
        setClientSidebarData({ isEdit: false });
        setIsClientSidebarOpen(true);
      },
      openEditTask: (taskId: string) => {
        const { openEditTask } = useTasksPageStore.getState();
        openEditTask(taskId);
      },
      openDeleteTask: (taskId: string) => {
        const { openDeletePopup } = useTasksPageStore.getState();
        openDeletePopup('task', taskId);
      },
      openArchiveTable: () => {
        const { openArchiveTable } = useTasksPageStore.getState();
        openArchiveTable();
      },
      changeView: (view: 'table' | 'kanban') => {
        const { setTaskView } = useTasksPageStore.getState();
        setTaskView(view);
      },
      openProfile: () => {
        // Profile functionality removed
      },
      openMessageSidebar: (user: { id: string; imageUrl: string; fullName: string; role: string }) => {
        const { openMessageSidebar } = useSidebarStateStore.getState();
        const conversationId = `conversation_${user.id}_${user?.id}`;
        openMessageSidebar(user?.id || '', {
          id: user.id,
          imageUrl: user.imageUrl,
          fullName: user.fullName,
          role: user.role,
        }, conversationId);
      },
      openChatSidebar: (task: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string; timeTracking?: { totalHours: number; totalMinutes: number; lastLogDate: string | null; memberHours?: { [userId: string]: number } }; totalHours?: number; memberHours?: { [userId: string]: number } }, clientName: string) => {
        const { openChatSidebar } = useSidebarStateStore.getState();
        openChatSidebar(task, clientName);
      },
    });
  }, []);

  const hasData = tasks.length > 0 || clients.length > 0 || users.length > 0;
  
  
  if (!hasData) {
    return null;
  }

  return (
    <TasksTable
      externalTasks={tasks}
      externalClients={clients}
      externalUsers={users}
    />
  );
}
 