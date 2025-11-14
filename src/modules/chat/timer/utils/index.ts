/**
 * Timer Module - Utils Index
 *
 * Central export point for all utility functions.
 *
 * @module timer/utils
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export * from './timerConstants';

// ============================================================================
// FORMATTERS
// ============================================================================

export {
  // Time formatting
  formatSecondsToHHMMSS,
  formatSecondsToHHMM,
  formatSecondsToHours,
  formatSecondsToReadable,
  formatTimeInput,
  parseTimeInput,

  // Date formatting
  formatDateForDisplay,
  formatDateShort,
  formatTimestamp,
  formatTimestampShort,
  formatDateWithTime,
  formatDateRange,
  formatRelativeDate,

  // Interval formatting
  formatTimeInterval,
  formatIntervalWithDate,

  // Number formatting
  formatWithLeadingZeros,
  formatDecimal,
  formatPercentage,

  // Validation
  isValidTimeFormat,
  sanitizeTimeInput,

  // Namespace
  TimerFormatters,
} from './timerFormatters';

// ============================================================================
// VALIDATION
// ============================================================================

export {
  timeInputSchema,
  dateInputSchema,
  commentInputSchema,
  timerFormSchema,
  validateTimeFormat,
  validateDateNotFuture,
} from './timerValidation';

// ============================================================================
// ANIMATIONS
// ============================================================================

export * from './timerAnimations';

// ============================================================================
// DEBOUNCE (if implemented)
// ============================================================================

// Note: Export debounce utilities when implemented
// export * from './timerDebounce';

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  ParsedTime,
  TimeEntryFormData,
} from '../types/timer.types';
