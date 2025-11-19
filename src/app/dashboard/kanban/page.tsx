'use client';

import TasksKanban from '@/modules/data-views/tasks/components/tables/KanbanBoard';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function KanbanPage() {
  const router = useRouter();

  // Data is loaded in layout - just handle UI interactions
  const handleNewTaskOpen = useCallback(() => {
    const { openCreateTask } = useTasksPageStore.getState();
    openCreateTask();
  }, []);

  const handleNewClientOpen = useCallback(() => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId);
  }, []);

  const handleArchiveTableOpen = useCallback(() => {
    router.push('/dashboard/archive');
  }, [router]);

  const handleViewChange = useCallback((view: 'table' | 'kanban') => {
    if (view === 'table') {
      router.push('/dashboard/tasks');
    }
  }, [router]);

  return (
    <TasksKanban
      onNewTaskOpen={handleNewTaskOpen}
      onNewClientOpen={handleNewClientOpen}
      onEditTaskOpen={handleEditTask}
      onViewChange={handleViewChange}
      onDeleteTaskOpen={handleDeleteTask}
      onArchiveTableOpen={handleArchiveTableOpen}
    />
  );
}
