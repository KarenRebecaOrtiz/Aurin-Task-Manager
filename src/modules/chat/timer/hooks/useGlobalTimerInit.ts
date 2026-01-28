/**
 * Timer Module - Global Timer Initialization Hook
 *
 * Hook for initializing all user timers at app startup.
 * Should be called once at the root level (e.g., in AuthProvider or layout).
 *
 * @module timer/hooks/useGlobalTimerInit
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTimerStateStore } from '../stores/timerStateStore';
import { useTimerSyncStore } from '../stores/timerSyncStore';
import {
  getUserActiveTimers,
  listenToUserTimers,
  generateDeviceId,
} from '../services/timerFirebase';
import type { LocalTimerState, TimerDocument } from '../types/timer.types';

interface UseGlobalTimerInitOptions {
  /** User ID */
  userId: string | null;
  /** Array of task IDs the user has access to */
  userTaskIds: string[];
  /** Whether initialization is enabled */
  enabled?: boolean;
}

interface UseGlobalTimerInitReturn {
  /** Whether global initialization is complete */
  isInitialized: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Error if initialization failed */
  error: Error | null;
  /** Manually retry initialization */
  retry: () => Promise<void>;
}

/**
 * Convert Firestore timer document to local state
 */
function convertToLocalState(doc: TimerDocument): LocalTimerState {
  return {
    timerId: doc.id,
    taskId: doc.taskId,
    userId: doc.userId,
    status: doc.status,
    startedAt: doc.startedAt ? doc.startedAt.toDate() : null,
    pausedAt: doc.pausedAt ? doc.pausedAt.toDate() : null,
    accumulatedSeconds: doc.totalSeconds || 0,
    intervals: (doc.intervals || []).map((interval) => ({
      start: interval.start.toDate(),
      end: interval.end.toDate(),
      duration: interval.duration,
    })),
    lastSyncTime: performance.now(),
  };
}

/**
 * Global timer initialization hook
 *
 * Call this hook once at the app root level to:
 * - Load all active timers for the user from Firebase
 * - Set up real-time listeners for multi-device sync
 * - Persist state across page refreshes
 *
 * @param options - Configuration options
 * @returns Initialization status and controls
 *
 * @example
 * ```typescript
 * // In AuthProvider or root layout
 * function AppProvider({ children }) {
 *   const { user } = useAuth();
 *   const tasks = useDataStore(state => state.tasks);
 *   const userTaskIds = tasks
 *     .filter(t => t.AssignedTo?.includes(user?.id) || t.LeadedBy?.includes(user?.id))
 *     .map(t => t.id);
 *
 *   useGlobalTimerInit({
 *     userId: user?.id || null,
 *     userTaskIds,
 *     enabled: !!user,
 *   });
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export function useGlobalTimerInit({
  userId,
  userTaskIds,
  enabled = true,
}: UseGlobalTimerInitOptions): UseGlobalTimerInitReturn {
  // Store access
  const globalInitialized = useTimerStateStore((state) => state.globalInitialized);
  const setGlobalInitialized = useTimerStateStore((state) => state.setGlobalInitialized);
  const setMultipleTimers = useTimerStateStore((state) => state.setMultipleTimers);
  const setTimerState = useTimerStateStore((state) => state.setTimerState);
  const clearTimer = useTimerStateStore((state) => state.clearTimer);
  const activeTimers = useTimerStateStore((state) => state.activeTimers);

  const setSyncStatus = useTimerSyncStore((state) => state.setSyncStatus);
  const setLastSyncTimestamp = useTimerSyncStore((state) => state.setLastSyncTimestamp);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const deviceIdRef = useRef<string>(generateDeviceId());
  const isLoadingRef = useRef(false);
  const errorRef = useRef<Error | null>(null);

  /**
   * Initialize all timers from Firebase
   */
  const initialize = useCallback(async () => {
    if (!enabled || !userId || userTaskIds.length === 0) {
      return;
    }

    // Skip if already initialized and we have timers
    if (globalInitialized && Object.keys(activeTimers).length > 0) {
      console.log('[useGlobalTimerInit] Already initialized, skipping');
      return;
    }

    try {
      isLoadingRef.current = true;
      errorRef.current = null;
      setSyncStatus('syncing');

      console.log(`[useGlobalTimerInit] Initializing timers for user ${userId} with ${userTaskIds.length} tasks`);

      // Fetch all active timers from Firebase
      const firebaseTimers = await getUserActiveTimers(userId, userTaskIds);

      if (firebaseTimers.length > 0) {
        // Convert to local state
        const localTimers = firebaseTimers.map(convertToLocalState);

        // Bulk update store
        setMultipleTimers(localTimers);

        console.log(`[useGlobalTimerInit] Loaded ${localTimers.length} active timers`);
      } else {
        console.log('[useGlobalTimerInit] No active timers found');
      }

      setGlobalInitialized(true);
      setSyncStatus('idle');
      setLastSyncTimestamp(Date.now());
    } catch (error) {
      console.error('[useGlobalTimerInit] Initialization failed:', error);
      errorRef.current = error as Error;
      setSyncStatus('error');
    } finally {
      isLoadingRef.current = false;
    }
  }, [
    enabled,
    userId,
    userTaskIds,
    globalInitialized,
    activeTimers,
    setMultipleTimers,
    setGlobalInitialized,
    setSyncStatus,
    setLastSyncTimestamp,
  ]);

  /**
   * Set up real-time listeners for multi-device sync
   */
  useEffect(() => {
    if (!enabled || !userId || userTaskIds.length === 0 || !globalInitialized) {
      return;
    }

    console.log('[useGlobalTimerInit] Setting up global timer listeners');

    const unsubscribe = listenToUserTimers(userId, userTaskIds, (timers) => {
      console.log(`[useGlobalTimerInit] Received ${timers.length} timer updates`);

      // Update local state with remote changes
      const currentDeviceId = deviceIdRef.current;

      for (const timer of timers) {
        // Only apply changes from other devices
        const isRemoteUpdate = timer.deviceId !== currentDeviceId;

        if (isRemoteUpdate) {
          console.log(`[useGlobalTimerInit] Remote update for task ${timer.taskId}`);
          const localState = convertToLocalState(timer);
          setTimerState(timer.taskId, localState);
        }
      }

      setLastSyncTimestamp(Date.now());
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      console.log('[useGlobalTimerInit] Cleaning up global timer listeners');
      unsubscribe();
    };
  }, [
    enabled,
    userId,
    userTaskIds,
    globalInitialized,
    setTimerState,
    clearTimer,
    setLastSyncTimestamp,
  ]);

  /**
   * Initialize on mount or when dependencies change
   */
  useEffect(() => {
    if (enabled && userId && userTaskIds.length > 0) {
      initialize();
    }
  }, [enabled, userId, userTaskIds.length, initialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  /**
   * Reset when user logs out
   */
  useEffect(() => {
    if (!userId) {
      console.log('[useGlobalTimerInit] User logged out, resetting state');
      setGlobalInitialized(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [userId, setGlobalInitialized]);

  return {
    isInitialized: globalInitialized,
    isLoading: isLoadingRef.current,
    error: errorRef.current,
    retry: initialize,
  };
}

export default useGlobalTimerInit;
