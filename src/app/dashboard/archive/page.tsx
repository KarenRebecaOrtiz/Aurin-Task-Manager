'use client';

import ArchiveTable from '@/modules/data-views/tasks/components/tables/ArchiveTable';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function ArchivePage() {
  const router = useRouter();

  const handleEditTaskOpen = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleViewChange = useCallback((view: 'table' | 'kanban') => {
    if (view === 'table') {
      router.push('/dashboard/tasks');
    } else {
      router.push('/dashboard/kanban');
    }
  }, [router]);

  const handleDeleteTaskOpen = useCallback((taskId: string) => {
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId);
  }, []);

  const handleClose = useCallback(() => {
    router.push('/dashboard/tasks');
  }, [router]);

  return (
    <ArchiveTable
      onEditTaskOpen={handleEditTaskOpen}
      onViewChange={handleViewChange}
      onDeleteTaskOpen={handleDeleteTaskOpen}
      onClose={handleClose}
      onDataRefresh={() => { /* Implement refresh logic if needed */ }}
    />
  );
}
