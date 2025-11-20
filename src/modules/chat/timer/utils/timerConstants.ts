/**
 * Timer Module - Constants
 *
 * Application-wide constants for timer configuration.
 *
 * @module timer/utils/constants
 */

import type { TimeEntryFormData } from '../types/timer.types';

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

/**
 * Interval for syncing timer state to Firestore (30 seconds)
 * Based on research recommendations for optimal sync frequency
 */
export const SYNC_INTERVAL_MS = 30000;

/**
 * Debounce interval for Firestore writes (5 seconds)
 * Prevents excessive writes while maintaining reasonable freshness
 */
export const DEBOUNCE_INTERVAL_MS = 5000;

/**
 * Maximum number of retry attempts for failed operations
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay for exponential backoff retry (1 second)
 */
export const RETRY_DELAY_BASE_MS = 1000;

/**
 * Maximum reasonable time for a timer session (24 hours in seconds)
 * Used to detect and handle orphaned or stuck timers
 */
export const MAX_REASONABLE_TIME_SECONDS = 24 * 60 * 60;

/**
 * Maximum delay for exponential backoff (30 seconds)
 */
export const MAX_RETRY_DELAY_MS = 30000;

/**
 * Cache TTL (Time To Live) in milliseconds (60 seconds)
 */
export const CACHE_TTL_MS = 60000;

// ============================================================================
// FIRESTORE COLLECTION NAMES
// ============================================================================

/**
 * Firestore collection name for timers
 */
export const TIMER_COLLECTION_NAME = 'timers';

/**
 * Firestore collection name for tasks
 */
export const TASKS_COLLECTION_NAME = 'tasks';

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values for time entry form
 */
export const DEFAULT_TIMER_VALUES: TimeEntryFormData = {
  time: '00:00',
  date: new Date(),
  comment: '',
};

/**
 * Default device ID prefix
 */
export const DEVICE_ID_PREFIX = 'device';

/**
 * Default page size for paginated queries
 */
export const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Error messages for timer operations
 * All messages are in Spanish for consistency with the app
 */
export const ERROR_MESSAGES = {
  // Timer state errors
  TIMER_ALREADY_RUNNING: 'El timer ya está corriendo',
  TIMER_NOT_RUNNING: 'El timer no está corriendo',
  TIMER_NOT_FOUND: 'Timer no encontrado',
  NO_ACTIVE_TIMER: 'No hay timer activo',

  // Validation errors
  INVALID_TIME_FORMAT: 'Formato de hora inválido (HH:MM)',
  FUTURE_DATE_NOT_ALLOWED: 'No puedes añadir tiempo para fechas futuras',
  TIME_REQUIRED: 'La hora es requerida',
  DATE_REQUIRED: 'La fecha es requerida',
  TIME_CANNOT_BE_ZERO: 'El tiempo no puede ser cero',

  // Network errors
  NETWORK_ERROR: 'Error de red. Por favor verifica tu conexión.',
  SYNC_ERROR: 'Error al sincronizar. Reintentando...',
  FIRESTORE_ERROR: 'Error al guardar en base de datos',

  // Permission errors
  PERMISSION_DENIED: 'No tienes permiso para realizar esta acción',
  USER_NOT_AUTHENTICATED: 'Usuario no autenticado',

  // General errors
  UNKNOWN_ERROR: 'Ha ocurrido un error desconocido',
  OPERATION_FAILED: 'La operación falló. Por favor intenta de nuevo.',
} as const;

/**
 * Success messages for timer operations
 */
export const SUCCESS_MESSAGES = {
  TIMER_STARTED: 'Timer iniciado',
  TIMER_PAUSED: 'Timer pausado',
  TIMER_STOPPED: 'Timer detenido',
  TIMER_RESET: 'Timer reiniciado',
  TIME_ENTRY_ADDED: 'Tiempo añadido exitosamente',
  SYNC_COMPLETE: 'Sincronización completada',
} as const;

// ============================================================================
// TIME FORMAT CONSTANTS
// ============================================================================

/**
 * Regular expression for validating HH:MM time format
 */
export const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Time format string for display
 */
export const TIME_FORMAT_DISPLAY = 'HH:MM:SS';

/**
 * Time format string for input
 */
export const TIME_FORMAT_INPUT = 'HH:MM';

/**
 * Date format options for Spanish locale
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
} as const;

/**
 * Date format options for short display
 */
export const DATE_FORMAT_SHORT_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
} as const;

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

/**
 * Animation duration for panel transitions (milliseconds)
 */
export const PANEL_ANIMATION_DURATION_MS = 300;

/**
 * Animation easing for panel transitions
 */
export const PANEL_ANIMATION_EASING = 'power2.out';

/**
 * Animation duration for number transitions (milliseconds)
 */
export const NUMBER_ANIMATION_DURATION_MS = 600;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Minimum hours value
 */
export const MIN_HOURS = 0;

/**
 * Maximum hours value (23 for 24-hour format)
 */
export const MAX_HOURS = 23;

/**
 * Minimum minutes value
 */
export const MIN_MINUTES = 0;

/**
 * Maximum minutes value
 */
export const MAX_MINUTES = 59;

/**
 * Maximum comment length
 */
export const MAX_COMMENT_LENGTH = 500;

// ============================================================================
// STORAGE KEYS
// ============================================================================

/**
 * LocalStorage key for timer state persistence
 */
export const TIMER_STATE_STORAGE_KEY = 'timer-state-storage';

/**
 * SessionStorage key for temporary timer data
 */
export const TIMER_SESSION_STORAGE_KEY = 'timer-session-data';

// ============================================================================
// FIRESTORE FIELD NAMES
// ============================================================================

/**
 * Firestore field names for consistent access
 */
export const FIRESTORE_FIELDS = {
  // Timer fields
  TIMER_ID: 'id',
  USER_ID: 'userId',
  TASK_ID: 'taskId',
  STATUS: 'status',
  STARTED_AT: 'startedAt',
  PAUSED_AT: 'pausedAt',
  TOTAL_SECONDS: 'totalSeconds',
  INTERVALS: 'intervals',
  DEVICE_ID: 'deviceId',
  LAST_SYNC: 'lastSync',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',

  // Task fields
  TOTAL_HOURS: 'totalHours',
  MEMBER_HOURS: 'memberHours',
  LAST_UPDATED: 'lastUpdated',
} as const;

// ============================================================================
// TIMER STATUS VALUES
// ============================================================================

/**
 * Timer status values (matching TimerStatus enum)
 */
export const TIMER_STATUS_VALUES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
} as const;

// ============================================================================
// SYNC STATUS VALUES
// ============================================================================

/**
 * Sync status values
 */
export const SYNC_STATUS_VALUES = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
} as const;

// ============================================================================
// RETRY ERROR TYPES
// ============================================================================

/**
 * Error types that should trigger a retry
 */
export const RETRYABLE_ERROR_KEYWORDS = [
  'network',
  'timeout',
  'unavailable',
  'offline',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
] as const;

// ============================================================================
// ICON PATHS
// ============================================================================

/**
 * Icon paths for timer buttons
 */
export const TIMER_ICONS = {
  PLAY: '/Play.svg',
  PAUSE: '/Stop.svg',
  STOP: '/Stop.svg',
  RESET: '/refresh.svg',
  CLOCK: '/Clock.svg',
  CHECK: '/check-check.svg',
  CLOSE: '/x.svg',
  CHEVRON_LEFT: '/chevron-left.svg',
  CHEVRON_RIGHT: '/chevron-right.svg',
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export all constants as a single object for convenience
 */
export const TIMER_CONSTANTS = {
  // Timing
  SYNC_INTERVAL_MS,
  DEBOUNCE_INTERVAL_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE_MS,
  MAX_REASONABLE_TIME_SECONDS,
  MAX_RETRY_DELAY_MS,
  CACHE_TTL_MS,

  // Collections
  TIMER_COLLECTION_NAME,
  TASKS_COLLECTION_NAME,

  // Defaults
  DEFAULT_TIMER_VALUES,
  DEVICE_ID_PREFIX,
  DEFAULT_PAGE_SIZE,

  // Messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,

  // Formats
  TIME_FORMAT_REGEX,
  TIME_FORMAT_DISPLAY,
  TIME_FORMAT_INPUT,
  DATE_FORMAT_OPTIONS,
  DATE_FORMAT_SHORT_OPTIONS,

  // Animations
  PANEL_ANIMATION_DURATION_MS,
  PANEL_ANIMATION_EASING,
  NUMBER_ANIMATION_DURATION_MS,

  // Validation
  MIN_HOURS,
  MAX_HOURS,
  MIN_MINUTES,
  MAX_MINUTES,
  MAX_COMMENT_LENGTH,

  // Storage
  TIMER_STATE_STORAGE_KEY,
  TIMER_SESSION_STORAGE_KEY,

  // Firestore
  FIRESTORE_FIELDS,
  TIMER_STATUS_VALUES,
  SYNC_STATUS_VALUES,
  RETRYABLE_ERROR_KEYWORDS,

  // Icons
  TIMER_ICONS,
} as const;
