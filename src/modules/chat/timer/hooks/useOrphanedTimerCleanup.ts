/**
 * Timer Module - Orphaned Timer Cleanup Hook
 *
 * Detects and cleans up timers for tasks that have been deleted.
 * This handles edge cases where a task is deleted but the timer
 * still exists in local state or Firestore.
 *
 * @module timer/hooks/useOrphanedTimerCleanup
 */

import { useEffect, useCallback } from 'react';
import { useTimerStateStore } from '../stores/timerStateStore';
import { deleteTimer } from '../services/timerFirebase';

/**
 * Hook to clean up timers for deleted tasks
 *
 * This hook monitors active timers and checks if their associated tasks
 * still exist. If a task is deleted, it will:
 * 1. Clear the timer from local state
 * 2. Attempt to delete it from Firestore
 *
 * @param existingTaskIds - Array of valid task IDs that currently exist
 * @param userId - Current user ID
 *
 * @example
 * ```typescript
 * function TasksView({ userId }: Props) {
 *   const tasks = useTasksStore(state => state.tasks);
 *   const taskIds = tasks.map(t => t.id);
 *
 *   // Automatically clean up orphaned timers
 *   useOrphanedTimerCleanup(taskIds, userId);
 *
 *   return <TaskList tasks={tasks} />;
 * }
 * ```
 */
export function useOrphanedTimerCleanup(
  existingTaskIds: string[],
  userId: string | null
) {
  const getAllActiveTimers = useTimerStateStore((state) => state.getAllActiveTimers);
  const clearTimer = useTimerStateStore((state) => state.clearTimer);

  const cleanupOrphanedTimers = useCallback(async () => {
    if (!userId) return;

    const activeTimers = getAllActiveTimers();
    const existingTaskIdSet = new Set(existingTaskIds);

    // Find orphaned timers (timers for tasks that no longer exist)
    const orphanedTimers = activeTimers.filter(
      (timer) => timer.userId === userId && !existingTaskIdSet.has(timer.taskId)
    );

    if (orphanedTimers.length === 0) return;

    console.log(
      `[useOrphanedTimerCleanup] Found ${orphanedTimers.length} orphaned timer(s)`
    );

    // Clean up each orphaned timer
    for (const timer of orphanedTimers) {
      try {
        // Clear from local state
        clearTimer(timer.taskId);

        // Try to delete from Firestore
        // This may fail if the task document is already deleted, which is fine
        await deleteTimer(timer.taskId, timer.userId);

        console.log(
          `[useOrphanedTimerCleanup] Cleaned up timer for deleted task: ${timer.taskId}`
        );
      } catch (error) {
        // Silently fail - the timer document might already be deleted
        console.warn(
          `[useOrphanedTimerCleanup] Failed to delete timer for task ${timer.taskId}:`,
          error
        );
      }
    }
  }, [existingTaskIds, userId, getAllActiveTimers, clearTimer]);

  // Run cleanup when task list changes
  useEffect(() => {
    cleanupOrphanedTimers();
  }, [cleanupOrphanedTimers]);

  return {
    cleanupOrphanedTimers,
  };
}
