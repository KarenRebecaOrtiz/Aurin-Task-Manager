import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useTasksTableActionsStore } from '../../stores/tasksTableActionsStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import TasksTable from './TasksTable';

export default function TasksTableIsolated() {
  const { user } = useUser();
  
  // ✅ SOLUCIÓN: Usar directamente useDataStore para actualización inmediata
  const {
    tasks,
    clients,
    users,
    isInitialLoadComplete
  } = useDataStore(useShallow(state => ({
    tasks: state.tasks,
    clients: state.clients,
    users: state.users,
    isInitialLoadComplete: state.isInitialLoadComplete
  })));

  // Configure action handlers for TasksTable
  useEffect(() => {
    const { setActionHandlers } = useTasksTableActionsStore.getState();
    
    setActionHandlers({
      openNewTask: () => {
        console.log('[TasksTableIsolated] openNewTask called');
        const { openCreateTask } = useTasksPageStore.getState();
        openCreateTask();
      },
      openNewClient: () => {
        console.log('[TasksTableIsolated] openNewClient called');
        const { setContainer, setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
        setContainer('cuentas');
        setClientSidebarData({ isEdit: false });
        setIsClientSidebarOpen(true);
      },
      openEditTask: (taskId: string) => {
        console.log('[TasksTableIsolated] openEditTask called', taskId);
        const { openEditTask } = useTasksPageStore.getState();
        openEditTask(taskId);
      },
      openDeleteTask: (taskId: string) => {
        console.log('[TasksTableIsolated] openDeleteTask called', taskId);
        const { openDeletePopup } = useTasksPageStore.getState();
        console.log('[TasksTableIsolated] Calling openDeletePopup with:', { type: 'task', id: taskId });
        openDeletePopup('task', taskId);
        console.log('[TasksTableIsolated] openDeletePopup called successfully');
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
        const { openChatSidebar } = useSidebarStateStore.getState();
        openChatSidebar(task, clientName);
      },
    });
  }, []);

  // ✅ SOLUCIÓN: Mostrar TasksTable solo si hay datos disponibles
  // No depender de isInitialLoadComplete del store ya que puede no estar sincronizado
  const hasData = tasks.length > 0 || clients.length > 0 || users.length > 0;
  
  // Debug: Log para verificar que los datos se estén recibiendo
  console.log('[TasksTableIsolated] Data from store:', {
    tasksCount: tasks.length,
    clientsCount: clients.length,
    usersCount: users.length,
    hasData
  });
  
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