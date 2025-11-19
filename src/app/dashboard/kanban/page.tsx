'use client';

import TasksKanban from '@/modules/data-views/tasks/components/tables/KanbanBoard';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useCallback } from 'react';

export default function KanbanPage() {
  // These handlers will need to be connected to the global store
  // or other state management logic as they were in the original page.
  const handleNewTaskOpen = useCallback(() => {
    const { openCreateTask } = useTasksPageStore.getState();
    openCreateTask();
  }, []);

  const handleNewClientOpen = useCallback(() => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleTasksKanbanEditTask = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleTasksKanbanDeleteTask = useCallback((taskId: string) => {
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId);
  }, []);

  const handleTasksKanbanArchiveTableOpen = useCallback(() => {
    // This should now navigate to the archive page
    // For now, it opens the modal as per original logic
    // This can be changed to router.push('/dashboard/archive')
    const { openArchiveTable } = useTasksPageStore.getState();
    openArchiveTable();
  }, []);

  const handleTasksKanbanViewChange = useCallback((view: 'table' | 'kanban') => {
    // This would now be handled by navigation
    // For example, router.push('/dashboard/tasks')
    const { setTaskView } = useTasksPageStore.getState();
    setTaskView(view);
  }, []);

  return (
    <TasksKanban
      onNewTaskOpen={handleNewTaskOpen}
      onNewClientOpen={handleNewClientOpen}
      onEditTaskOpen={handleTasksKanbanEditTask}
      onViewChange={handleTasksKanbanViewChange}
      onDeleteTaskOpen={handleTasksKanbanDeleteTask}
      onArchiveTableOpen={handleTasksKanbanArchiveTableOpen}
    />
  );
}
