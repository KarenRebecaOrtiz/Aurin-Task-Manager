/**
 * Timer Module - Timer State Hook
 *
 * Basic hook for accessing timer state from the store.
 * Provides read-only access to timer data.
 *
 * @module timer/hooks/useTimerState
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTimerStateStore } from '../stores/timerStateStore';
import { TimerStatus } from '../types/timer.types';
import type { UseTimerStateReturn } from '../types/timer.types';

/**
 * Hook to access timer state for a specific task
 * Provides memoized read-only access to timer data
 *
 * @param taskId - Task ID to get timer state for
 * @returns Timer state object
 *
 * @example
 * ```typescript
 * function TimerComponent({ taskId }: { taskId: string }) {
 *   const {
 *     timerSeconds,
 *     isRunning,
 *     isPaused,
 *     status,
 *     intervals
 *   } = useTimerState(taskId);
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       <p>Seconds: {timerSeconds}</p>
 *       <p>Running: {isRunning ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimerState(taskId: string): UseTimerStateReturn {
  // Use shallow comparison to prevent unnecessary re-renders
  const timer = useTimerStateStore(
    useShallow((state) => state.getTimerForTask(taskId))
  );

  // Memoize the return object to prevent re-renders when values don't change
  return useMemo(
    () => ({
      timerSeconds: timer?.accumulatedSeconds ?? 0,
      isRunning: timer?.status === TimerStatus.RUNNING,
      isPaused: timer?.status === TimerStatus.PAUSED,
      intervals: timer?.intervals ?? [],
      status: timer?.status ?? TimerStatus.IDLE,
      lastSyncTime: timer?.lastSyncTime ?? null,
    }),
    [timer]
  );
}

/**
 * Hook to check if any timer is running
 * Useful for global timer indicators
 *
 * @returns True if any timer is running
 *
 * @example
 * ```typescript
 * function GlobalTimerIndicator() {
 *   const hasRunningTimer = useHasRunningTimer();
 *
 *   if (!hasRunningTimer) return null;
 *
 *   return <Badge>Timer Running</Badge>;
 * }
 * ```
 */
export function useHasRunningTimer(): boolean {
  return useTimerStateStore(
    useShallow((state) => {
      const timers = state.getAllActiveTimers();
      return timers.some((timer) => timer.status === TimerStatus.RUNNING);
    })
  );
}

/**
 * Hook to get count of active timers
 *
 * @returns Number of active timers
 *
 * @example
 * ```typescript
 * function TimerCount() {
 *   const count = useActiveTimerCount();
 *   return <span>{count} active timers</span>;
 * }
 * ```
 */
export function useActiveTimerCount(): number {
  return useTimerStateStore(
    useShallow((state) => Object.keys(state.activeTimers).length)
  );
}

/**
 * Hook to get all running timers
 * Returns array of timer states
 *
 * @returns Array of running timer states
 *
 * @example
 * ```typescript
 * function RunningTimersList() {
 *   const runningTimers = useRunningTimers();
 *
 *   return (
 *     <ul>
 *       {runningTimers.map(timer => (
 *         <li key={timer.timerId}>
 *           Task {timer.taskId}: {timer.accumulatedSeconds}s
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRunningTimers() {
  return useTimerStateStore(
    useShallow((state) =>
      Object.values(state.activeTimers).filter(
        (timer) => timer.status === TimerStatus.RUNNING
      )
    )
  );
}
