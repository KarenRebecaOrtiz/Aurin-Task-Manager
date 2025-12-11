/**
 * useTaskData Hooks - Optimized Task Data Access
 *
 * Provides hooks for accessing task data from tasksDataStore.
 * All hooks automatically subscribe to real-time updates.
 *
 * Usage:
 * - useTaskData(taskId) - Full task object
 * - useTaskName(taskId) - Only task name
 * - useTaskStatus(taskId) - Only task status
 * - useTaskState(taskId) - Task + loading + error states
 */

import { useEffect, useMemo } from 'react';
import { useTasksDataStore } from '@/stores/tasksDataStore';
import { useShallow } from 'zustand/react/shallow';
import { Task } from '@/types';

// --- Options ---

interface UseTaskOptions {
  /**
   * Auto-subscribe to task on mount.
   * Default: true
   */
  autoSubscribe?: boolean;

  /**
   * Auto-unsubscribe on unmount.
   * Default: false (keeps cache for other components)
   */
  unsubscribeOnUnmount?: boolean;
}

// --- Individual Hooks (Optimized Selectors) ---

/**
 * Subscribe to a task and get its full data.
 * Auto-subscribes to real-time updates.
 *
 * @example
 * const taskData = useTaskData(taskId);
 * if (!taskData) return <Skeleton />;
 * return <div>{taskData.name}</div>;
 */
export function useTaskData(
  taskId: string,
  options: UseTaskOptions = {}
): Task | null {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);
  const getTask = useTasksDataStore((state) => state.getTask);

  // Subscribe on mount
  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);

  // Use selector to only re-render when this specific task changes
  const taskData = useTasksDataStore((state) => state.getTask(taskId));

  return taskData;
}

/**
 * Get only the task name (optimized - only re-renders when name changes).
 *
 * @example
 * const taskName = useTaskName(taskId);
 * return <span>{taskName}</span>;
 */
export function useTaskName(
  taskId: string,
  options: UseTaskOptions = {}
): string {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);

  // Only re-render when name changes
  return useTasksDataStore((state) => state.getTaskName(taskId));
}

/**
 * Get only the task status (optimized - only re-renders when status changes).
 *
 * @example
 * const taskStatus = useTaskStatus(taskId);
 * return <Badge status={taskStatus} />;
 */
export function useTaskStatus(
  taskId: string,
  options: UseTaskOptions = {}
): string {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);

  // Only re-render when status changes
  return useTasksDataStore((state) => state.getTaskStatus(taskId));
}

/**
 * Get task priority (optimized selector).
 */
export function useTaskPriority(
  taskId: string,
  options: UseTaskOptions = {}
): string {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);

  return useTasksDataStore((state) => {
    const task = state.getTask(taskId);
    return task?.priority || 'Media';
  });
}

/**
 * Get task client ID (optimized selector).
 */
export function useTaskClientId(
  taskId: string,
  options: UseTaskOptions = {}
): string {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);

  return useTasksDataStore((state) => {
    const task = state.getTask(taskId);
    return task?.clientId || '';
  });
}

// --- Composite Hooks ---

/**
 * Get task data with loading and error states.
 * Use this for components that need to handle all states.
 *
 * @example
 * const { taskData, isLoading, error } = useTaskState(taskId);
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!taskData) return null;
 * return <TaskCard task={taskData} />;
 */
export function useTaskState(
  taskId: string,
  options: UseTaskOptions = {}
) {
  const taskData = useTaskData(taskId, options);

  const isLoading = useTasksDataStore((state) => state.isTaskLoading(taskId));
  const error = useTasksDataStore((state) => state.getTaskError(taskId));

  return useMemo(() => ({
    taskData,
    isLoading,
    error,
  }), [taskData, isLoading, error]);
}

// --- Utility Hooks ---

/**
 * Just subscribe to a task without getting its data.
 * Useful when you want to ensure the task is cached.
 *
 * @example
 * useSubscribeToTask(taskId);
 */
export function useSubscribeToTask(
  taskId: string,
  options: UseTaskOptions = {}
): void {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe && taskId) {
      subscribeToTask(taskId);
    }

    return () => {
      if (unsubscribeOnUnmount && taskId) {
        unsubscribeFromTask(taskId);
      }
    };
  }, [taskId, autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);
}

/**
 * Subscribe to multiple tasks at once.
 * Useful for lists where you want to cache all tasks.
 *
 * @example
 * const taskIds = messages.map(m => m.taskId).filter(Boolean);
 * useSubscribeToMultipleTasks(taskIds);
 */
export function useSubscribeToMultipleTasks(
  taskIds: string[],
  options: UseTaskOptions = {}
): void {
  const { autoSubscribe = true, unsubscribeOnUnmount = false } = options;

  const subscribeToTask = useTasksDataStore((state) => state.subscribeToTask);
  const unsubscribeFromTask = useTasksDataStore((state) => state.unsubscribeFromTask);

  useEffect(() => {
    if (autoSubscribe) {
      taskIds.forEach((taskId) => {
        if (taskId) {
          subscribeToTask(taskId);
        }
      });
    }

    return () => {
      if (unsubscribeOnUnmount) {
        taskIds.forEach((taskId) => {
          if (taskId) {
            unsubscribeFromTask(taskId);
          }
        });
      }
    };
  }, [taskIds.join(','), autoSubscribe, unsubscribeOnUnmount, subscribeToTask, unsubscribeFromTask]);
}

/**
 * Get multiple tasks data at once.
 *
 * @example
 * const tasksData = useMultipleTasksData(taskIds);
 */
export function useMultipleTasksData(
  taskIds: string[],
  options: UseTaskOptions = {}
): (Task | null)[] {
  useSubscribeToMultipleTasks(taskIds, options);

  return useTasksDataStore((state) => {
    return taskIds.map((taskId) => state.getTask(taskId));
  });
}

// --- Loading State Hooks ---

/**
 * Check if a task is loading.
 */
export function useIsTaskLoading(taskId: string): boolean {
  return useTasksDataStore((state) => state.isTaskLoading(taskId));
}

/**
 * Get task error if any.
 */
export function useTaskError(taskId: string): Error | null {
  return useTasksDataStore((state) => state.getTaskError(taskId));
}
