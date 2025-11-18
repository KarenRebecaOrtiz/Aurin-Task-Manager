/**
 * Timer Module - Type Definitions
 *
 * Central location for all TypeScript types, interfaces, and enums
 * used throughout the timer module.
 *
 * @module timer/types
 */

import type { Timestamp } from 'firebase/firestore';
import type { UseFormReturn } from 'react-hook-form';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Timer status states
 *
 * @enum {string}
 */
export enum TimerStatus {
  /** Timer is idle (not started) */
  IDLE = 'idle',
  /** Timer is actively running */
  RUNNING = 'running',
  /** Timer is paused */
  PAUSED = 'paused',
  /** Timer has been stopped and finalized */
  STOPPED = 'stopped'
}

/**
 * Sync status for Firebase operations
 *
 * @enum {string}
 */
export type TimerSyncStatus = 'idle' | 'syncing' | 'error';

/**
 * Confirmation status for optimistic updates
 *
 * @enum {string}
 */
export type TimerConfirmationStatus = 'pending' | 'confirmed' | 'failed';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Represents a single time interval (session)
 * Used to track individual work sessions within a timer
 *
 * @interface TimerInterval
 */
export interface TimerInterval {
  /** Start time of the interval */
  start: Date;
  /** End time of the interval */
  end: Date;
  /** Duration in seconds */
  duration: number;
}

/**
 * Firestore document structure for timers
 * This is the exact schema stored in Firestore
 *
 * @interface TimerDocument
 */
export interface TimerDocument {
  /** Unique timer ID (format: userId_taskId_timestamp) */
  id: string;
  /** User who owns this timer */
  userId: string;
  /** Task this timer is associated with */
  taskId: string;
  /** Current status of the timer */
  status: TimerStatus;
  /** When the timer was started (null if not running) */
  startedAt: Timestamp | null;
  /** When the timer was paused (null if not paused) */
  pausedAt: Timestamp | null;
  /** Total accumulated seconds across all intervals */
  totalSeconds: number;
  /** Array of work intervals (sessions) */
  intervals: FirestoreTimerInterval[];
  /** Device ID that last modified this timer */
  deviceId: string;
  /** Last time this timer was synced to Firestore */
  lastSync: Timestamp;
  /** When this timer was created */
  createdAt: Timestamp;
  /** When this timer was last updated */
  updatedAt: Timestamp;
}

/**
 * Firestore representation of a timer interval
 * Uses Timestamp instead of Date for Firestore compatibility
 *
 * @interface FirestoreTimerInterval
 */
export interface FirestoreTimerInterval {
  start: Timestamp;
  end: Timestamp;
  duration: number;
}

/**
 * Local (client-side) timer state
 * Uses Date objects instead of Timestamps for easier manipulation
 *
 * @interface LocalTimerState
 */
export interface LocalTimerState {
  /** Unique timer ID */
  timerId: string;
  /** Task ID */
  taskId: string;
  /** User ID */
  userId: string;
  /** Current status */
  status: TimerStatus;
  /** Start time (Date object) */
  startedAt: Date | null;
  /** Pause time (Date object) */
  pausedAt: Date | null;
  /** Accumulated seconds */
  accumulatedSeconds: number;
  /** Array of intervals */
  intervals: TimerInterval[];
  /** Last sync timestamp (performance.now()) */
  lastSyncTime: number | null;
}

// ============================================================================
// STORE INTERFACES
// ============================================================================

/**
 * Timer state store interface
 * Manages local timer state for all active timers
 *
 * @interface TimerStateStore
 */
export interface TimerStateStore {
  // State
  /** Map of taskId to timer state */
  activeTimers: Record<string, LocalTimerState>;
  /** Currently active task ID */
  currentTaskId: string | null;
  /** Currently active user ID */
  currentUserId: string | null;
  /** Whether the store has been initialized */
  isInitialized: boolean;

  // Actions
  setCurrentTask: (taskId: string, userId: string) => void;
  setTimerState: (taskId: string, state: LocalTimerState) => void;
  updateTimerSeconds: (taskId: string, seconds: number) => void;
  addInterval: (taskId: string, interval: TimerInterval) => void;
  clearTimer: (taskId: string) => void;
  resetStore: () => void;
  setInitialized: (value: boolean) => void;

  // Selectors
  getTimerForTask: (taskId: string) => LocalTimerState | undefined;
  getIsTimerRunning: (taskId: string) => boolean;
  getAllActiveTimers: () => LocalTimerState[];
}

/**
 * Timer sync store interface
 * Manages Firebase synchronization state
 *
 * @interface TimerSyncStore
 */
export interface TimerSyncStore {
  // State
  /** Current sync status */
  syncStatus: TimerSyncStatus;
  /** Last successful sync timestamp */
  lastSyncTimestamp: number | null;
  /** Map of timerId to pending write status */
  pendingWrites: Record<string, boolean>;
  /** Map of timerId to error */
  errors: Record<string, Error>;
  /** Online/offline status */
  isOnline: boolean;

  // Actions
  setSyncStatus: (status: TimerSyncStatus) => void;
  setLastSyncTimestamp: (timestamp: number) => void;
  addPendingWrite: (timerId: string) => void;
  removePendingWrite: (timerId: string) => void;
  setError: (timerId: string, error: Error) => void;
  clearError: (timerId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  resetSyncStore: () => void;

  // Selectors
  getIsSyncing: () => boolean;
  hasPendingWrites: (timerId: string) => boolean;
  getError: (timerId: string) => Error | undefined;
}

// ============================================================================
// FORM INTERFACES
// ============================================================================

/**
 * Form data for manual time entry
 *
 * @interface TimeEntryFormData
 */
export interface TimeEntryFormData {
  /** Time in HH:MM format */
  time: string;
  /** Date of the work */
  date: Date;
  /** Optional comment */
  comment?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useTimerState hook
 *
 * @interface UseTimerStateReturn
 */
export interface UseTimerStateReturn {
  /** Current timer seconds */
  timerSeconds: number;
  /** Whether timer is running */
  isRunning: boolean;
  /** Whether timer is paused */
  isPaused: boolean;
  /** Array of timer intervals */
  intervals: TimerInterval[];
  /** Current timer status */
  status: TimerStatus;
  /** Last sync timestamp */
  lastSyncTime: number | null;
}

/**
 * Callback for confirming action when another timer is running
 * Should return true to proceed, false to cancel
 */
export type ConfirmStopOtherTimerCallback = (
  currentTaskId: string,
  newTaskId: string
) => Promise<boolean>;

/**
 * Return type for useTimerActions hook
 *
 * @interface UseTimerActionsReturn
 */
export interface UseTimerActionsReturn {
  /** Start the timer */
  startTimer: () => Promise<void>;
  /** Pause the timer */
  pauseTimer: () => Promise<void>;
  /** Stop and finalize the timer */
  stopTimer: () => Promise<void>;
  /** Reset the timer to zero */
  resetTimer: () => Promise<void>;
  /** Whether any action is currently processing */
  isProcessing: boolean;
  /** ID of currently running timer task (if any) */
  runningTimerTaskId: string | null;
}

/**
 * Return type for useTimerSync hook
 *
 * @interface UseTimerSyncReturn
 */
export interface UseTimerSyncReturn {
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Sync error if any */
  syncError: Error | null;
  /** Last successful sync timestamp */
  lastSyncTime: number | null;
  /** Manually retry sync */
  retrySyncManually: () => Promise<void>;
}

/**
 * Return type for useTimeEntry hook
 *
 * @interface UseTimeEntryReturn
 */
export interface UseTimeEntryReturn {
  /** React Hook Form instance */
  form: UseFormReturn<TimeEntryFormData>;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Submit the time entry */
  submitTimeEntry: () => Promise<void>;
  /** Reset the form */
  resetForm: () => void;
  /** Form errors */
  errors: Record<string, string>;
}

/**
 * Return type for useTimerOptimistic hook
 *
 * @interface UseTimerOptimisticReturn
 */
export interface UseTimerOptimisticReturn {
  /** Whether this is an optimistic update */
  isOptimistic: boolean;
  /** Whether there are pending writes */
  hasPendingWrites: boolean;
  /** Optimistic value (if pending) */
  optimisticValue: number | null;
  /** Confirmation status */
  confirmationStatus: TimerConfirmationStatus;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Options for retry logic
 *
 * @interface RetryOptions
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Base delay in milliseconds */
  baseDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Callback on retry */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Cache entry structure
 *
 * @interface CacheEntry
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Whether there are pending writes */
  hasPendingWrites: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Parsed time result
 *
 * @interface ParsedTime
 */
export interface ParsedTime {
  hours: number;
  minutes: number;
}

/**
 * Timer button variants
 */
export type TimerButtonVariant = 'start' | 'pause' | 'stop' | 'reset';

/**
 * Timer button sizes
 */
export type TimerButtonSize = 'small' | 'medium' | 'large';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for TimerButton component
 */
export interface TimerButtonProps {
  variant: TimerButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: TimerButtonSize;
  className?: string;
}

/**
 * Props for TimeInput component
 */
export interface TimeInputProps {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  label?: string;
  type?: 'hours' | 'minutes';
  error?: string;
}

/**
 * Props for TimerCounter component
 */
export interface TimerCounterProps {
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
  isOptimistic?: boolean;
  syncStatus?: TimerSyncStatus;
}

/**
 * Props for DateSelector component
 */
export interface DateSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props for TimeEntryForm component
 */
export interface TimeEntryFormProps {
  taskId: string;
  userId: string;
  userName: string; // Necesario para crear mensaje de time log
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Props for TimerDisplay component
 */
export interface TimerDisplayProps {
  taskId: string;
  userId: string;
  showControls?: boolean;
  onTogglePanel?: () => void;
  compact?: boolean;
}

/**
 * Props for TimerIntervalsList component
 */
export interface TimerIntervalsListProps {
  intervals: TimerInterval[];
  showTotal?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

/**
 * Props for TimerPanel component
 */
export interface TimerPanelProps {
  isOpen: boolean;
  taskId: string;
  userId: string;
  userName: string; // Nombre completo para time logs
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Props for ConfirmTimerSwitch component
 */
export interface ConfirmTimerSwitchProps {
  isOpen: boolean;
  currentTaskId: string;
  newTaskId: string;
  currentTimerSeconds: number;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Timestamp,
  UseFormReturn,
};
