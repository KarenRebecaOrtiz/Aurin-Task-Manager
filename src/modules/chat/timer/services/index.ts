/**
 * Timer Module - Services Index
 *
 * Central export point for all service layer functions.
 *
 * @module timer/services
 */

// ============================================================================
// TIMER CALCULATIONS
// ============================================================================

export {
  calculateElapsedSeconds,
  calculateTotalFromIntervals,
  aggregateIntervals,
  isTimeReasonable,
  convertSecondsToHours,
  convertHoursToSeconds,
  convertSecondsToMinutes,
  convertMinutesToSeconds,
  extractTimeComponents,
  calculateTimeComponentsFromDates,
  createInterval,
  isValidInterval,
  filterValidIntervals,
  calculateAverageIntervalDuration,
  findLongestInterval,
  findShortestInterval,
  TimerCalculations,
} from './timerCalculations';

// ============================================================================
// TIMER RETRY
// ============================================================================

export {
  retryWithBackoff,
  retryWithConstantDelay,
  createRetryable,
  isRetryableError,
  calculateBackoffDelay,
  TimerRetry,
} from './timerRetry';

// ============================================================================
// TIMER CACHE
// ============================================================================

export {
  TimerCache,
  timerCache,
  getCachedOrFetch,
  fetchAndCache,
  TimerCacheService,
} from './timerCache';

// ============================================================================
// TIMER FIREBASE
// ============================================================================

export {
  // CRUD operations
  createTimer,
  getTimer,
  updateTimer,
  deleteTimer,

  // State operations
  startTimerInFirestore,
  pauseTimerInFirestore,
  stopTimerInFirestore,

  // Batch operations
  updateTaskAggregates,
  batchStopTimer,

  // Transactions
  addTimeToTaskTransaction,

  // Listeners
  listenToTimer,
  listenToTaskTimers,

  // Queries
  getActiveTimersForTask,
  getUserTimerForTask,
  getAllUserTimers,

  // Service object
  TimerFirebaseService,
} from './timerFirebase';

// ============================================================================
// TIME LOG FIREBASE
// ============================================================================

export {
  // CRUD operations
  createTimeLog,
  getTimeLogs,
  getUserTimeLogs,
  getTimeLog,
  updateTimeLog,
  deleteTimeLog,

  // Listeners
  listenToTimeLogs,
  listenToTimeTracking,

  // Migration helpers
  migrateLegacyTimeLogs,
  recalculateTimeTracking,

  // Service object
  TimeLogFirebaseService,
} from './timeLogFirebase';

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  TimerDocument,
  TimerInterval,
  FirestoreTimerInterval,
  TimeLog,
  TimeTracking,
  CreateTimeLogInput,
  TimeLogSource,
  RetryOptions,
  CacheEntry,
} from '../types/timer.types';
