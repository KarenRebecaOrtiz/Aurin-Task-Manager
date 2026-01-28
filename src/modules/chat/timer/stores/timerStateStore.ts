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

/**
 * Extended TimerStateStore with per-task initialization tracking
 */
export interface TimerStateStoreExtended {
  // State
  activeTimers: Record<string, LocalTimerState>;
  currentTaskId: string | null;
  currentUserId: string | null;
  /** @deprecated Use initializedTasks instead */
  isInitialized: boolean;
  /** Track which tasks have been initialized from Firebase */
  initializedTasks: Set<string>;
  /** Whether global initialization (all user timers) has been done */
  globalInitialized: boolean;

  // Actions
  setCurrentTask: (taskId: string, userId: string) => void;
  setTimerState: (taskId: string, state: LocalTimerState) => void;
  updateTimerSeconds: (taskId: string, seconds: number) => void;
  addInterval: (taskId: string, interval: TimerInterval) => void;
  clearTimer: (taskId: string) => void;
  resetStore: () => void;
  setInitialized: (value: boolean) => void;
  /** Mark a specific task as initialized */
  markTaskInitialized: (taskId: string) => void;
  /** Check if a task has been initialized */
  isTaskInitialized: (taskId: string) => boolean;
  /** Set global initialization status */
  setGlobalInitialized: (value: boolean) => void;
  /** Bulk set multiple timers at once (for global init) */
  setMultipleTimers: (timers: LocalTimerState[]) => void;

  // Selectors
  getTimerForTask: (taskId: string) => LocalTimerState | undefined;
  getIsTimerRunning: (taskId: string) => boolean;
  getAllActiveTimers: () => LocalTimerState[];
}
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
export const useTimerStateStore = create<TimerStateStoreExtended>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // STATE
      // ============================================================================

      activeTimers: {},
      currentTaskId: null,
      currentUserId: null,
      isInitialized: false,
      initializedTasks: new Set<string>(),
      globalInitialized: false,

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
          const { [taskId]: _removed, ...rest } = prev.activeTimers;
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
       * @deprecated Use markTaskInitialized instead
       * @param value - Initialization status
       */
      setInitialized: (value: boolean) => {
        set({ isInitialized: value });
      },

      /**
       * Mark a specific task as initialized from Firebase
       * @param taskId - Task ID
       */
      markTaskInitialized: (taskId: string) => {
        set((prev) => {
          const newSet = new Set(prev.initializedTasks);
          newSet.add(taskId);
          return { initializedTasks: newSet };
        });
      },

      /**
       * Check if a task has been initialized
       * @param taskId - Task ID
       */
      isTaskInitialized: (taskId: string): boolean => {
        return get().initializedTasks.has(taskId);
      },

      /**
       * Set global initialization status
       * @param value - Whether global init is done
       */
      setGlobalInitialized: (value: boolean) => {
        set({ globalInitialized: value });
      },

      /**
       * Bulk set multiple timers at once (for global initialization)
       * More efficient than calling setTimerState multiple times
       * @param timers - Array of timer states
       */
      setMultipleTimers: (timers: LocalTimerState[]) => {
        set((prev) => {
          const newTimers = { ...prev.activeTimers };
          const newInitialized = new Set(prev.initializedTasks);

          for (const timer of timers) {
            newTimers[timer.taskId] = timer;
            newInitialized.add(timer.taskId);
          }

          return {
            activeTimers: newTimers,
            initializedTasks: newInitialized,
          };
        });
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
        // Convert Set to Array for serialization
        initializedTasks: Array.from(state.initializedTasks),
        globalInitialized: state.globalInitialized,
      }),
      // Merge function to handle rehydration
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TimerStateStoreExtended> & { initializedTasks?: string[] };
        return {
          ...currentState,
          ...persisted,
          // Convert Array back to Set
          initializedTasks: new Set(persisted.initializedTasks || []),
        };
      },
      // Custom storage with serialization to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, (_key, value) => {
            // Restore Date objects from ISO strings
            if (value && typeof value === 'object' && value.__type === 'Date') {
              return new Date(value.value);
            }
            return value;
          });
        },
        setItem: (name, value) => {
          const str = JSON.stringify(value, (_key, val) => {
            // Convert Date objects to ISO strings
            if (val instanceof Date) {
              return { __type: 'Date', value: val.toISOString() };
            }
            // Convert Set to Array
            if (val instanceof Set) {
              return { __type: 'Set', value: Array.from(val) };
            }
            return val;
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name),
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
export const selectTimerForTask = (state: TimerStateStoreExtended, taskId: string) => {
  return state.activeTimers[taskId];
};

/**
 * Select timer status for a task
 *
 * @param state - Store state
 * @param taskId - Task ID
 * @returns Timer status or 'idle'
 */
export const selectTimerStatus = (state: TimerStateStoreExtended, taskId: string) => {
  return state.activeTimers[taskId]?.status ?? TimerStatus.IDLE;
};

/**
 * Select accumulated seconds for a task
 *
 * @param state - Store state
 * @param taskId - Task ID
 * @returns Accumulated seconds
 */
export const selectTimerSeconds = (state: TimerStateStoreExtended, taskId: string): number => {
  return state.activeTimers[taskId]?.accumulatedSeconds ?? 0;
};

/**
 * Select all running timers
 *
 * @param state - Store state
 * @returns Array of running timers
 */
export const selectRunningTimers = (state: TimerStateStoreExtended): LocalTimerState[] => {
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
export const selectActiveTimerCount = (state: TimerStateStoreExtended): number => {
  return Object.keys(state.activeTimers).length;
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { LocalTimerState };
