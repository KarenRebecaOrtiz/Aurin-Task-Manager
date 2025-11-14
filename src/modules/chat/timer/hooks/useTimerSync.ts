/**
 * Timer Module - Timer Sync Hook
 *
 * Hook for real-time Firebase synchronization.
 * Sets up listeners and handles multi-device updates.
 *
 * @module timer/hooks/useTimerSync
 */

import { useEffect, useCallback, useRef } from 'react';
import { useTimerStateStore } from '../stores/timerStateStore';
import { useTimerSyncStore } from '../stores/timerSyncStore';
import {
  getUserTimerForTask,
  listenToTimer,
  generateDeviceId,
} from '../services/timerFirebase';
import { TimerStatus } from '../types/timer.types';
import type { UseTimerSyncReturn, LocalTimerState } from '../types/timer.types';
import { SYNC_INTERVAL_MS } from '../utils/timerConstants';

/**
 * Hook for real-time timer synchronization with Firebase
 * Handles initialization, real-time updates, and multi-device sync
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param enabled - Whether sync is enabled (default: true)
 * @returns Sync status and controls
 *
 * @example
 * ```typescript
 * function TimerComponent({ taskId, userId }: Props) {
 *   const { isSyncing, syncError, retrySyncManually } = useTimerSync(
 *     taskId,
 *     userId
 *   );
 *
 *   if (syncError) {
 *     return (
 *       <div>
 *         Error: {syncError.message}
 *         <button onClick={retrySyncManually}>Retry</button>
 *       </div>
 *     );
 *   }
 *
 *   return <TimerDisplay isSyncing={isSyncing} />;
 * }
 * ```
 */
export function useTimerSync(
  taskId: string,
  userId: string,
  enabled: boolean = true
): UseTimerSyncReturn {
  // Stores
  const setTimerState = useTimerStateStore((state) => state.setTimerState);
  const getTimerForTask = useTimerStateStore((state) => state.getTimerForTask);
  const isInitialized = useTimerStateStore((state) => state.isInitialized);
  const setInitialized = useTimerStateStore((state) => state.setInitialized);

  const setSyncStatus = useTimerSyncStore((state) => state.setSyncStatus);
  const setLastSyncTimestamp = useTimerSyncStore((state) => state.setLastSyncTimestamp);
  const setError = useTimerSyncStore((state) => state.setError);
  const clearError = useTimerSyncStore((state) => state.clearError);
  const getError = useTimerSyncStore((state) => state.getError);
  const lastSyncTime = useTimerSyncStore((state) => state.lastSyncTimestamp);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceId = useRef<string>(generateDeviceId());

  /**
   * Initialize timer from Firebase
   */
  const initialize = useCallback(async () => {
    if (!enabled || isInitialized) return;

    try {
      console.log('[useTimerSync] Initializing timer sync...');
      setSyncStatus('syncing');

      // Fetch timer from Firebase
      const firebaseTimer = await getUserTimerForTask(userId, taskId);

      if (firebaseTimer) {
        // Convert to local state
        const localState: LocalTimerState = {
          timerId: firebaseTimer.id,
          taskId: firebaseTimer.taskId,
          userId: firebaseTimer.userId,
          status: firebaseTimer.status,
          startedAt: firebaseTimer.startedAt ? firebaseTimer.startedAt.toDate() : null,
          pausedAt: firebaseTimer.pausedAt ? firebaseTimer.pausedAt.toDate() : null,
          accumulatedSeconds: firebaseTimer.totalSeconds || 0,
          intervals: (firebaseTimer.intervals || []).map((interval) => ({
            start: interval.start.toDate(),
            end: interval.end.toDate(),
            duration: interval.duration,
          })),
          lastSyncTime: performance.now(),
        };

        setTimerState(taskId, localState);
        console.log('[useTimerSync] Timer initialized from Firebase');
      }

      setInitialized(true);
      setSyncStatus('idle');
      setLastSyncTimestamp(Date.now());
    } catch (error) {
      console.error('[useTimerSync] Initialization failed:', error);
      setError(taskId, error as Error);
      setSyncStatus('error');
    }
  }, [
    taskId,
    userId,
    enabled,
    isInitialized,
    setTimerState,
    setInitialized,
    setSyncStatus,
    setLastSyncTimestamp,
    setError,
  ]);

  /**
   * Set up real-time listener
   */
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const localTimer = getTimerForTask(taskId);
    if (!localTimer) return;

    console.log('[useTimerSync] Setting up real-time listener for timer:', localTimer.timerId);

    // Set up listener with taskId and userId
    const unsubscribe = listenToTimer(taskId, userId, (timerDoc) => {
      if (!timerDoc) {
        console.log('[useTimerSync] Timer document deleted');
        return;
      }

      // Check if update is from another device
      const isRemoteUpdate = timerDoc.deviceId !== deviceId.current;

      if (isRemoteUpdate) {
        console.log('[useTimerSync] Remote update detected, syncing local state');

        // Update local state with remote data
        const localState: LocalTimerState = {
          timerId: timerDoc.id,
          taskId: timerDoc.taskId,
          userId: timerDoc.userId,
          status: timerDoc.status,
          startedAt: timerDoc.startedAt ? timerDoc.startedAt.toDate() : null,
          pausedAt: timerDoc.pausedAt ? timerDoc.pausedAt.toDate() : null,
          accumulatedSeconds: timerDoc.totalSeconds || 0,
          intervals: (timerDoc.intervals || []).map((interval) => ({
            start: interval.start.toDate(),
            end: interval.end.toDate(),
            duration: interval.duration,
          })),
          lastSyncTime: performance.now(),
        };

        setTimerState(taskId, localState);
        setLastSyncTimestamp(Date.now());
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('[useTimerSync] Cleaning up listener');
      unsubscribe();
    };
  }, [
    taskId,
    userId,
    enabled,
    isInitialized,
    getTimerForTask,
    setTimerState,
    setLastSyncTimestamp,
  ]);

  /**
   * Set up periodic sync for running timers
   */
  useEffect(() => {
    if (!enabled || !isInitialized) return;

    const syncInterval = setInterval(() => {
      const localTimer = getTimerForTask(taskId);

      // Only sync if timer is running
      if (localTimer?.status === TimerStatus.RUNNING) {
        console.log('[useTimerSync] Periodic sync check');
        setLastSyncTimestamp(Date.now());
      }
    }, SYNC_INTERVAL_MS);

    syncIntervalRef.current = syncInterval;

    return () => {
      clearInterval(syncInterval);
    };
  }, [taskId, enabled, isInitialized, getTimerForTask, setLastSyncTimestamp]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    if (!enabled) return;

    const handleOnline = () => {
      console.log('[useTimerSync] App is online');
      // Clear any sync errors and retry
      const error = getError(taskId);
      if (error) {
        clearError(taskId);
        initialize();
      }
    };

    const handleOffline = () => {
      console.log('[useTimerSync] App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, taskId, getError, clearError, initialize]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (enabled) {
      initialize();
    }
  }, [enabled, initialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  /**
   * Manual retry function
   */
  const retrySyncManually = useCallback(async () => {
    console.log('[useTimerSync] Manual retry triggered');
    clearError(taskId);
    await initialize();
  }, [taskId, clearError, initialize]);

  const syncError = getError(taskId) ?? null;
  const isSyncing = useTimerSyncStore((state) => state.syncStatus === 'syncing');

  return {
    isSyncing,
    syncError,
    lastSyncTime,
    retrySyncManually,
  };
}
