'use client';

import React, { useEffect } from 'react';
import TasksTable from './TasksTable';
import { useTasksTableActionsStore } from '@/stores/tasksTableActionsStore';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';

interface TasksTableContainerProps {
  externalTasks?: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string }[];
  externalClients?: { id: string; name: string; imageUrl: string }[];
  externalUsers?: { id: string; imageUrl: string; fullName: string; role: string }[];
  // onMessageSidebarOpen?: (user: { id: string; imageUrl: string; fullName: string; role: string }) => void;
  // getUnreadCountForUser?: (userId: string) => number;
  // markConversationAsRead?: (conversationId: string) => Promise<void>;
}

// Componente completamente aislado para TasksTable
const TasksTableContainer = ({
  externalTasks,
  externalClients,
  externalUsers,
  // onMessageSidebarOpen,
  // getUnreadCountForUser,
  // markConversationAsRead,
}: TasksTableContainerProps) => {
  console.log('[TasksTableContainer] Render');
  
  // Configurar action handlers para TasksTable
  const { setActionHandlers } = useTasksTableActionsStore();
  
  // Obtener las acciones del store de TasksPage
  const {
    openCreateTask,
    openEditTask,
    openDeletePopup,
    openArchiveTable,
    setTaskView,
  } = useTasksPageStore();
  
  // Configurar action handlers para TasksTable
  useEffect(() => {
    setActionHandlers({
      openNewTask: () => {
        console.log('[TasksTableContainer] openNewTask called');
        openCreateTask();
      },
      openEditTask: (taskId: string) => {
        console.log('[TasksTableContainer] openEditTask called', taskId);
        openEditTask(taskId);
      },
      openDeleteTask: (taskId: string) => {
        console.log('[TasksTableContainer] openDeleteTask called', taskId);
        openDeletePopup('task', taskId);
      },
      openArchiveTable: () => {
        console.log('[TasksTableContainer] openArchiveTable called');
        openArchiveTable();
      },
      changeView: (view: 'table' | 'kanban') => {
        console.log('[TasksTableContainer] changeView called', view);
        setTaskView(view);
      },
      openProfile: (user: { id: string; imageUrl: string }) => {
        console.log('[TasksTableContainer] openProfile called', user.id);
        // Profile functionality removed
      },
      openMessageSidebar: (user: { id: string; imageUrl: string; fullName: string; role: string }) => {
        console.log('[TasksTableContainer] openMessageSidebar called', user.id);
        // This will be handled by the sidebar store directly
      },
      openChatSidebar: (task: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string }, clientName: string) => {
    
        // Use the sidebar store directly
        const { openChatSidebar } = useSidebarStateStore.getState();
        openChatSidebar(task, clientName);
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Las funciones de store son estables, no necesitan dependencias.
  // Incluirlas causaría re-renders innecesarios que rompen el filtrado.

  return (
    <TasksTable 
      externalTasks={externalTasks}
      externalClients={externalClients}
      externalUsers={externalUsers}
    />
  );
};

export default TasksTableContainer; 