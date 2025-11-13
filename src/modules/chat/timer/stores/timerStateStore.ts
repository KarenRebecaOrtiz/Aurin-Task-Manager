/**
 * Timer Module - State Store
 *
 * Zustand store for local timer state (pure client-side state).
 * Separated from sync logic for better separation of concerns.
 *
 * @module timer/stores/state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalTimerState, TimerInterval, TimerStateStore } from '../types/timer.types';
import { TimerStatus } from '../types/timer.types';
import { TIMER_STATE_STORAGE_KEY } from '../utils/timerConstants';

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Timer state store using Zustand
 * Manages local timer state with persistence
 *
 * @example
 * ```typescript
 * // In a component
 * const { activeTimers, setTimerState } = useTimerStateStore();
 *
 * // Set timer state
 * setTimerState('task123', {
 *   timerId: 'timer123',
 *   taskId: 'task123',
 *   userId: 'user456',
 *   status: TimerStatus.RUNNING,
 *   startedAt: new Date(),
 *   pausedAt: null,
 *   accumulatedSeconds: 0,
 *   intervals: [],
 *   lastSyncTime: performance.now(),
 * });
 * ```
 */
export const useTimerStateStore = create<TimerStateStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // STATE
      // ============================================================================

      activeTimers: {},
      currentTaskId: null,
      currentUserId: null,
      isInitialized: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      /**
       * Set the current active task and user
       *
       * @param taskId - Task ID
       * @param userId - User ID
       */
      setCurrentTask: (taskId: string, userId: string) => {
        set({
          currentTaskId: taskId,
          currentUserId: userId,
        });
      },

      /**
       * Set or update timer state for a task
       *
       * @param taskId - Task ID
       * @param state - Timer state
       */
      setTimerState: (taskId: string, state: LocalTimerState) => {
        set((prev) => ({
          activeTimers: {
            ...prev.activeTimers,
            [taskId]: state,
          },
        }));
      },

      /**
       * Update accumulated seconds for a timer
       *
       * @param taskId - Task ID
       * @param seconds - New accumulated seconds
       */
      updateTimerSeconds: (taskId: string, seconds: number) => {
        set((prev) => {
          const timer = prev.activeTimers[taskId];
          if (!timer) return prev;

          return {
            activeTimers: {
              ...prev.activeTimers,
              [taskId]: {
                ...timer,
                accumulatedSeconds: seconds,
              },
            },
          };
        });
      },

      /**
       * Add an interval to a timer
       *
       * @param taskId - Task ID
       * @param interval - Timer interval to add
       */
      addInterval: (taskId: string, interval: TimerInterval) => {
        set((prev) => {
          const timer = prev.activeTimers[taskId];
          if (!timer) return prev;

          return {
            activeTimers: {
              ...prev.activeTimers,
              [taskId]: {
                ...timer,
                intervals: [...timer.intervals, interval],
              },
            },
          };
        });
      },

      /**
       * Clear timer state for a task
       *
       * @param taskId - Task ID
       */
      clearTimer: (taskId: string) => {
        set((prev) => {
          const { [taskId]: removed, ...rest } = prev.activeTimers;
          return { activeTimers: rest };
        });
      },

      /**
       * Reset the entire store
       */
      resetStore: () => {
        set({
          activeTimers: {},
          currentTaskId: null,
          currentUserId: null,
          isInitialized: false,
        });
      },

      /**
       * Set initialization status
       *
       * @param value - Initialization status
       */
      setInitialized: (value: boolean) => {
        set({ isInitialized: value });
      },

      // ============================================================================
      // SELECTORS
      // ============================================================================

      /**
       * Get timer state for a specific task
       *
       * @param taskId - Task ID
       * @returns Timer state or undefined
       */
      getTimerForTask: (taskId: string): LocalTimerState | undefined => {
        return get().activeTimers[taskId];
      },

      /**
       * Check if a timer is running for a task
       *
       * @param taskId - Task ID
       * @returns True if timer is running
       */
      getIsTimerRunning: (taskId: string): boolean => {
        const timer = get().activeTimers[taskId];
        return timer?.status === TimerStatus.RUNNING;
      },

      /**
       * Get all active timers
       *
       * @returns Array of all timer states
       */
      getAllActiveTimers: (): LocalTimerState[] => {
        return Object.values(get().activeTimers);
      },
    }),
    {
      name: TIMER_STATE_STORAGE_KEY,
      // Partialize to only persist certain fields
      partialize: (state) => ({
        activeTimers: state.activeTimers,
        currentTaskId: state.currentTaskId,
        currentUserId: state.currentUserId,
      }),
      // Custom serialization to handle Date objects
      serialize: (state) => {
        return JSON.stringify(state, (key, value) => {
          // Convert Date objects to ISO strings
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          return value;
        });
      },
      // Custom deserialization to restore Date objects
      deserialize: (str) => {
        return JSON.parse(str, (key, value) => {
          // Restore Date objects from ISO strings
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        });
      },
    }
  )
);

// ============================================================================
// UTILITY SELECTORS
// ============================================================================

/**
 * Select timer state for a specific task
 * Use with useShallow for optimal re-rendering
 *
 * @param taskId - Task ID
 * @returns Selector function
 *
 * @example
 * ```typescript
 * import { useShallow } from 'zustand/react/shallow';
 *
 * const timer = useTimerStateStore(
 *   useShallow((state) => selectTimerForTask(state, 'task123'))
 * );
 * ```
 */
export const selectTimerForTask = (state: TimerStateStore, taskId: string) => {
  return state.activeTimers[taskId];
};

/**
 * Select timer status for a task
 *
 * @param state - Store state
 * @param taskId - Task ID
 * @returns Timer status or 'idle'
 */
export const selectTimerStatus = (state: TimerStateStore, taskId: string) => {
  return state.activeTimers[taskId]?.status ?? TimerStatus.IDLE;
};

/**
 * Select accumulated seconds for a task
 *
 * @param state - Store state
 * @param taskId - Task ID
 * @returns Accumulated seconds
 */
export const selectTimerSeconds = (state: TimerStateStore, taskId: string): number => {
  return state.activeTimers[taskId]?.accumulatedSeconds ?? 0;
};

/**
 * Select all running timers
 *
 * @param state - Store state
 * @returns Array of running timers
 */
export const selectRunningTimers = (state: TimerStateStore): LocalTimerState[] => {
  return Object.values(state.activeTimers).filter(
    (timer) => timer.status === TimerStatus.RUNNING
  );
};

/**
 * Select count of active timers
 *
 * @param state - Store state
 * @returns Number of active timers
 */
export const selectActiveTimerCount = (state: TimerStateStore): number => {
  return Object.keys(state.activeTimers).length;
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { TimerStateStore, LocalTimerState };
