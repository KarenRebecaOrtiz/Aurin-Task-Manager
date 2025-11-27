/**
 * Timer Module - Hooks Index
 *
 * Central export point for all custom hooks.
 *
 * @module timer/hooks
 */

// ============================================================================
// TIMER STATE HOOKS
// ============================================================================

export {
  useTimerState,
  useHasRunningTimer,
  useActiveTimerCount,
  useRunningTimers,
} from './useTimerState';

// ============================================================================
// TIMER ACTIONS HOOKS
// ============================================================================

export { useTimerActions } from './useTimerActions';
export type { UseTimerActionsOptions } from './useTimerActions';

// ============================================================================
// TIMER SYNC HOOKS
// ============================================================================

export { useTimerSync } from './useTimerSync';

// ============================================================================
// TIME ENTRY HOOKS
// ============================================================================

export { useTimeEntry } from './useTimeEntry';

// ============================================================================
// OPTIMISTIC UPDATE HOOKS
// ============================================================================

export {
  useTimerOptimistic,
  useHasAnyPendingWrites,
  useSyncHealth,
} from './useTimerOptimistic';

// ============================================================================
// CLEANUP HOOKS
// ============================================================================

export { useOrphanedTimerCleanup } from './useOrphanedTimerCleanup';

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  UseTimerStateReturn,
  UseTimerActionsReturn,
  UseTimerSyncReturn,
  UseTimeEntryReturn,
  UseTimerOptimisticReturn,
  ConfirmStopOtherTimerCallback,
} from '../types/timer.types';
