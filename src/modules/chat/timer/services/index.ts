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
// RE-EXPORT TYPES
// ============================================================================

export type {
  TimerDocument,
  TimerInterval,
  FirestoreTimerInterval,
  RetryOptions,
  CacheEntry,
} from '../types/timer.types';
