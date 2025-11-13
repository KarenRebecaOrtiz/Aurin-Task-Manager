/**
 * Timer Module - Optimistic Updates Hook
 *
 * Hook for handling optimistic UI updates while operations are pending.
 * Provides instant feedback to users before server confirmation.
 *
 * @module timer/hooks/useTimerOptimistic
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTimerStateStore } from '../stores/timerStateStore';
import { useTimerSyncStore } from '../stores/timerSyncStore';
import type { UseTimerOptimisticReturn } from '../types/timer.types';

/**
 * Hook for optimistic UI updates
 * Tracks pending writes and provides confirmation status
 *
 * @param taskId - Task ID
 * @returns Optimistic state information
 *
 * @example
 * ```typescript
 * function TimerDisplay({ taskId }: Props) {
 *   const {
 *     isOptimistic,
 *     hasPendingWrites,
 *     confirmationStatus
 *   } = useTimerOptimistic(taskId);
 *
 *   const timerState = useTimerState(taskId);
 *
 *   return (
 *     <div>
 *       <TimerCounter {...timerState} />
 *
 *       {isOptimistic && (
 *         <Badge variant="warning">
 *           <Spinner size="sm" />
 *           Guardando...
 *         </Badge>
 *       )}
 *
 *       {confirmationStatus === 'confirmed' && (
 *         <Badge variant="success">
 *           <CheckIcon />
 *           Guardado
 *         </Badge>
 *       )}
 *
 *       {confirmationStatus === 'failed' && (
 *         <Badge variant="error">
 *           <ErrorIcon />
 *           Error al guardar
 *         </Badge>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimerOptimistic(taskId: string): UseTimerOptimisticReturn {
  // Get timer state
  const timer = useTimerStateStore(useShallow((state) => state.getTimerForTask(taskId)));

  // Get sync state
  const hasPendingWrites = useTimerSyncStore(
    useShallow((state) => {
      if (!timer) return false;
      return state.hasPendingWrites(timer.timerId);
    })
  );

  const syncError = useTimerSyncStore(
    useShallow((state) => {
      if (!timer) return null;
      return state.getError(timer.timerId);
    })
  );

  const isSyncing = useTimerSyncStore(useShallow((state) => state.syncStatus === 'syncing'));

  // Calculate confirmation status
  const confirmationStatus = useMemo(() => {
    if (syncError) return 'failed';
    if (hasPendingWrites || isSyncing) return 'pending';
    return 'confirmed';
  }, [hasPendingWrites, isSyncing, syncError]);

  // Timer is optimistic if there are pending writes or currently syncing
  const isOptimistic = hasPendingWrites || isSyncing;

  // Optimistic value is the current local value (may not be confirmed)
  const optimisticValue = timer?.accumulatedSeconds ?? null;

  return {
    isOptimistic,
    hasPendingWrites,
    optimisticValue,
    confirmationStatus,
  };
}

/**
 * Hook to check if any timer has pending operations
 * Useful for global indicators
 *
 * @returns True if any timer has pending writes
 *
 * @example
 * ```typescript
 * function GlobalSyncIndicator() {
 *   const hasAnyPending = useHasAnyPendingWrites();
 *
 *   if (!hasAnyPending) return null;
 *
 *   return (
 *     <Badge>
 *       <Spinner />
 *       Sincronizando timers...
 *     </Badge>
 *   );
 * }
 * ```
 */
export function useHasAnyPendingWrites(): boolean {
  return useTimerSyncStore(
    useShallow((state) => Object.keys(state.pendingWrites).length > 0)
  );
}

/**
 * Hook to get sync health status
 * Provides overall health of sync system
 *
 * @returns Sync health information
 *
 * @example
 * ```typescript
 * function SyncHealthIndicator() {
 *   const health = useSyncHealth();
 *
 *   return (
 *     <div>
 *       <p>Status: {health.status}</p>
 *       <p>Errors: {health.errorCount}</p>
 *       <p>Pending: {health.pendingCount}</p>
 *       {!health.isOnline && <Badge>Sin conexión</Badge>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncHealth() {
  return useTimerSyncStore(
    useShallow((state) => {
      const hasErrors = Object.keys(state.errors).length > 0;
      const hasPending = Object.keys(state.pendingWrites).length > 0;
      const isOffline = !state.isOnline;

      return {
        healthy: !hasErrors && !isOffline,
        status: hasErrors ? 'error' : isOffline ? 'offline' : hasPending ? 'pending' : 'ok',
        errorCount: Object.keys(state.errors).length,
        pendingCount: Object.keys(state.pendingWrites).length,
        isOnline: state.isOnline,
        lastSync: state.lastSyncTimestamp,
      };
    })
  );
}
