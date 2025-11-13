/**
 * Timer Module - Sync Store
 *
 * Zustand store for Firebase synchronization state.
 * Tracks sync status, pending writes, and errors.
 *
 * @module timer/stores/sync
 */

import { create } from 'zustand';
import type { TimerSyncStore, TimerSyncStatus } from '../types/timer.types';

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Timer sync store using Zustand
 * Manages Firebase sync state (no persistence needed)
 *
 * @example
 * ```typescript
 * // In a component
 * const { syncStatus, addPendingWrite, removePendingWrite } = useTimerSyncStore();
 *
 * // Mark write as pending
 * addPendingWrite('timer123');
 *
 * // Later, when confirmed
 * removePendingWrite('timer123');
 * ```
 */
export const useTimerSyncStore = create<TimerSyncStore>((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================

  syncStatus: 'idle',
  lastSyncTimestamp: null,
  pendingWrites: {},
  errors: {},
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Set the current sync status
   *
   * @param status - Sync status ('idle', 'syncing', or 'error')
   */
  setSyncStatus: (status: TimerSyncStatus) => {
    set({ syncStatus: status });
  },

  /**
   * Update the last successful sync timestamp
   *
   * @param timestamp - Unix timestamp in milliseconds
   */
  setLastSyncTimestamp: (timestamp: number) => {
    set({ lastSyncTimestamp: timestamp });
  },

  /**
   * Mark a timer as having pending writes
   *
   * @param timerId - Timer ID
   */
  addPendingWrite: (timerId: string) => {
    set((prev) => ({
      pendingWrites: {
        ...prev.pendingWrites,
        [timerId]: true,
      },
    }));
  },

  /**
   * Remove pending write flag for a timer
   *
   * @param timerId - Timer ID
   */
  removePendingWrite: (timerId: string) => {
    set((prev) => {
      const { [timerId]: removed, ...rest } = prev.pendingWrites;
      return { pendingWrites: rest };
    });
  },

  /**
   * Set an error for a specific timer
   *
   * @param timerId - Timer ID
   * @param error - Error object
   */
  setError: (timerId: string, error: Error) => {
    set((prev) => ({
      errors: {
        ...prev.errors,
        [timerId]: error,
      },
      syncStatus: 'error',
    }));
  },

  /**
   * Clear error for a specific timer
   *
   * @param timerId - Timer ID
   */
  clearError: (timerId: string) => {
    set((prev) => {
      const { [timerId]: removed, ...rest } = prev.errors;

      // If no more errors, set status back to idle
      const hasOtherErrors = Object.keys(rest).length > 0;

      return {
        errors: rest,
        syncStatus: hasOtherErrors ? 'error' : 'idle',
      };
    });
  },

  /**
   * Set online/offline status
   *
   * @param isOnline - Whether the app is online
   */
  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
  },

  /**
   * Reset the sync store to initial state
   */
  resetSyncStore: () => {
    set({
      syncStatus: 'idle',
      lastSyncTimestamp: null,
      pendingWrites: {},
      errors: {},
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    });
  },

  // ============================================================================
  // SELECTORS
  // ============================================================================

  /**
   * Check if currently syncing
   *
   * @returns True if syncing
   */
  getIsSyncing: (): boolean => {
    return get().syncStatus === 'syncing';
  },

  /**
   * Check if a timer has pending writes
   *
   * @param timerId - Timer ID
   * @returns True if has pending writes
   */
  hasPendingWrites: (timerId: string): boolean => {
    return Boolean(get().pendingWrites[timerId]);
  },

  /**
   * Get error for a specific timer
   *
   * @param timerId - Timer ID
   * @returns Error or undefined
   */
  getError: (timerId: string): Error | undefined => {
    return get().errors[timerId];
  },
}));

// ============================================================================
// UTILITY SELECTORS
// ============================================================================

/**
 * Select sync status
 *
 * @param state - Store state
 * @returns Sync status
 */
export const selectSyncStatus = (state: TimerSyncStore): TimerSyncStatus => {
  return state.syncStatus;
};

/**
 * Select if currently syncing
 *
 * @param state - Store state
 * @returns True if syncing
 */
export const selectIsSyncing = (state: TimerSyncStore): boolean => {
  return state.syncStatus === 'syncing';
};

/**
 * Select if online
 *
 * @param state - Store state
 * @returns True if online
 */
export const selectIsOnline = (state: TimerSyncStore): boolean => {
  return state.isOnline;
};

/**
 * Select pending writes for a specific timer
 *
 * @param state - Store state
 * @param timerId - Timer ID
 * @returns True if has pending writes
 */
export const selectHasPendingWrites = (state: TimerSyncStore, timerId: string): boolean => {
  return Boolean(state.pendingWrites[timerId]);
};

/**
 * Select error for a specific timer
 *
 * @param state - Store state
 * @param timerId - Timer ID
 * @returns Error or undefined
 */
export const selectErrorForTimer = (state: TimerSyncStore, timerId: string): Error | undefined => {
  return state.errors[timerId];
};

/**
 * Select sync health status
 * Combines multiple indicators into overall health
 *
 * @param state - Store state
 * @returns Health status object
 */
export const selectSyncHealth = (state: TimerSyncStore) => {
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
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { TimerSyncStore, TimerSyncStatus };
