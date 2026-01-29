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

  const setSyncStatus = useTimerSyncStore((state) => state.setSyncStatus);
  const setLastSyncTimestamp = useTimerSyncStore((state) => state.setLastSyncTimestamp);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const deviceIdRef = useRef<string>(generateDeviceId());
  const isLoadingRef = useRef(false);
  const errorRef = useRef<Error | null>(null);

  /**
   * Initialize all timers from Firebase
   * Always reconciles local state with Firestore to remove ghost timers
   */
  const initialize = useCallback(async () => {
    if (!enabled || !userId || userTaskIds.length === 0) {
      return;
    }

    // Prevent concurrent initialization
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      errorRef.current = null;
      setSyncStatus('syncing');

      // Always fetch from Firebase to get the source of truth
      const firebaseTimers = await getUserActiveTimers(userId, userTaskIds);

      // Create a Set of taskIds that have real timers in Firestore
      const firebaseTaskIds = new Set(firebaseTimers.map(t => t.taskId));

      // Get current local timers (use getState to avoid stale closures)
      const currentActiveTimers = useTimerStateStore.getState().activeTimers;
      const localTaskIds = Object.keys(currentActiveTimers);

      // Find ghost timers: exist locally but NOT in Firestore
      const ghostTimerTaskIds = localTaskIds.filter(taskId => !firebaseTaskIds.has(taskId));

      if (ghostTimerTaskIds.length > 0) {
        // Remove ghost timers from local state
        for (const taskId of ghostTimerTaskIds) {
          clearTimer(taskId);
        }
      }

      if (firebaseTimers.length > 0) {
        // Convert to local state
        const localTimers = firebaseTimers.map(convertToLocalState);

        // Bulk update store with real timers from Firestore
        setMultipleTimers(localTimers);
      }

      setGlobalInitialized(true);
      setSyncStatus('idle');
      setLastSyncTimestamp(Date.now());
    } catch (error) {
      errorRef.current = error as Error;
      setSyncStatus('error');
    } finally {
      isLoadingRef.current = false;
    }
  }, [
    enabled,
    userId,
    userTaskIds,
    clearTimer,
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

    const unsubscribe = listenToUserTimers(userId, userTaskIds, (timers) => {

      // Update local state with remote changes
      const currentDeviceId = deviceIdRef.current;

      for (const timer of timers) {
        // Only apply changes from other devices
        const isRemoteUpdate = timer.deviceId !== currentDeviceId;

        if (isRemoteUpdate) {
          const localState = convertToLocalState(timer);
          setTimerState(timer.taskId, localState);
        }
      }

      setLastSyncTimestamp(Date.now());
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
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
   * Re-sync when window becomes visible (important for PWA/multi-tab)
   * This ensures ghost timers are cleaned up when user returns to the app
   */
  useEffect(() => {
    if (!enabled || !userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && globalInitialized) {
        // Reset globalInitialized to force a re-sync
        setGlobalInitialized(false);
        // Small delay to ensure state is updated before re-initializing
        setTimeout(() => {
          initialize();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, userId, globalInitialized, setGlobalInitialized, initialize]);

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
