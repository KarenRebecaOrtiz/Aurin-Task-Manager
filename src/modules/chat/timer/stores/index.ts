/**
 * Timer Module - Stores Index
 *
 * Central export point for all Zustand stores.
 *
 * @module timer/stores
 */

// ============================================================================
// TIMER STATE STORE
// ============================================================================

export {
  useTimerStateStore,
  selectTimerForTask,
  selectTimerStatus,
  selectTimerSeconds,
  selectRunningTimers,
  selectActiveTimerCount,
} from './timerStateStore';

export type { TimerStateStore, LocalTimerState } from './timerStateStore';

// ============================================================================
// TIMER SYNC STORE
// ============================================================================

export {
  useTimerSyncStore,
  selectSyncStatus,
  selectIsSyncing,
  selectIsOnline,
  selectHasPendingWrites,
  selectErrorForTimer,
  selectSyncHealth,
} from './timerSyncStore';

export type { TimerSyncStore, TimerSyncStatus } from './timerSyncStore';
