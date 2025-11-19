'use client';

import ArchiveTable from '@/modules/data-views/tasks/components/tables/ArchiveTable';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import { unarchiveTask, archiveTask } from '@/lib/taskUtils';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  CreatedBy?: string;
}

export default function ArchivePage() {
  const { user } = useUser();
  const { isAdmin } = useAuth();
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

  const handleTaskArchive = useCallback(async (task: unknown, action: 'archive' | 'unarchive') => {
    if (!user?.id) return false;

    const taskData = task as Task;
    const isTaskCreator = taskData.CreatedBy === user.id;
    if (!isAdmin && !isTaskCreator) {
      return false;
    }

    try {
      if (action === 'unarchive') {
        await unarchiveTask(taskData.id, user.id, isAdmin, taskData);
      } else {
        await archiveTask(taskData.id, user.id, isAdmin, taskData);
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [user?.id, isAdmin]);

  return (
    <ArchiveTable
      onEditTaskOpen={handleEditTaskOpen}
      onViewChange={handleViewChange}
      onDeleteTaskOpen={handleDeleteTaskOpen}
      onClose={handleClose}
      onTaskArchive={handleTaskArchive}
      onDataRefresh={() => { /* Implement refresh logic if needed */ }}
    />
  );
}
