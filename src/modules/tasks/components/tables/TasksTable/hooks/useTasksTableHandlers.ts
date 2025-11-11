import { useCallback } from 'react';
import { useTasksTableActionsStore } from '../../../../stores/tasksTableActionsStore';

export const useTasksTableHandlers = () => {
  const {
    openNewTask,
    openEditTask,
    openDeleteTask,
    openArchiveTable,
    changeView,
  } = useTasksTableActionsStore();

  const handleNewTask = useCallback(() => {
    openNewTask();
  }, [openNewTask]);

  const handleEditTask = useCallback(
    (taskId: string) => {
      openEditTask(taskId);
    },
    [openEditTask]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      openDeleteTask(taskId);
    },
    [openDeleteTask]
  );

  const handleArchiveOpen = useCallback(() => {
    openArchiveTable();
  }, [openArchiveTable]);

  const handleViewChange = useCallback(() => {
    changeView('kanban');
  }, [changeView]);

  const handleSort = useCallback(
    (key: string, setSortKey: (key: string) => void, setSortDirection: (dir: 'asc' | 'desc') => void, currentSortKey: string, currentSortDirection: 'asc' | 'desc') => {
      if (key === currentSortKey) {
        setSortDirection(currentSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    []
  );

  return {
    handleNewTask,
    handleEditTask,
    handleDeleteTask,
    handleArchiveOpen,
    handleViewChange,
    handleSort,
  };
};
