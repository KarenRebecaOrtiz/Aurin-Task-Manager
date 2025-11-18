/**
 * Timer Module - Main Entry Point
 *
 * Public API for the timer module.
 * Only export what should be accessible from outside the module.
 *
 * @module timer
 */

// ============================================================================
// PUBLIC COMPONENTS
// ============================================================================

export { TimerPanel } from './components/organisms/TimerPanel';
export { TimerDisplay } from './components/molecules/TimerDisplay';
export { TimeEntryForm } from './components/molecules/TimeEntryForm';

// ============================================================================
// PUBLIC HOOKS
// ============================================================================

export {
  useTimerState,
  useTimerActions,
  useTimerSync,
  useTimeEntry,
  useTimerOptimistic,
  useHasRunningTimer,
  useActiveTimerCount,
  useRunningTimers,
  useHasAnyPendingWrites,
  useSyncHealth,
} from './hooks';

export type {
  UseTimerActionsOptions,
  ConfirmStopOtherTimerCallback,
} from './hooks';

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export {
  TimerStatus,
} from './types/timer.types';

export type {
  TimerInterval,
  TimeEntryFormData,
  TimerDisplayProps,
  TimerPanelProps,
  UseTimerStateReturn,
  UseTimerActionsReturn,
  UseTimerSyncReturn,
  UseTimeEntryReturn,
  UseTimerOptimisticReturn,
} from './types/timer.types';

// ============================================================================
// DO NOT EXPORT
// ============================================================================
// - Internal stores (keep encapsulated)
// - Internal services (use through hooks)
// - Internal utils (keep private)
