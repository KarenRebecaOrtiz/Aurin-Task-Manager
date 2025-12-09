/**
 * ShareTask Module - Configuration Constants
 * 
 * Constants and configuration for the share task module
 */

/**
 * Token Configuration
 */
export const TOKEN_CONFIG = {
  // Length of the share token (21 chars = ~140 bits entropy)
  TOKEN_LENGTH: 21,
  
  // URL-safe alphabet (excludes confusing characters)
  ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  
  // Default expiration (30 days)
  DEFAULT_EXPIRY_DAYS: 30,
} as const;

/**
 * Comment Configuration
 */
export const COMMENT_CONFIG = {
  // Maximum comment length
  MAX_LENGTH: 2000,
  
  // Minimum comment length
  MIN_LENGTH: 1,
  
  // Maximum guest name length
  MAX_GUEST_NAME_LENGTH: 50,
  
  // Minimum guest name length
  MIN_GUEST_NAME_LENGTH: 1,
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Maximum comments per guest per hour
  MAX_COMMENTS_PER_HOUR: 10,
  
  // Maximum requests per IP per minute
  MAX_REQUESTS_PER_MINUTE: 30,
  
  // Cooldown period after limit (minutes)
  COOLDOWN_MINUTES: 5,
} as const;

/**
 * LocalStorage Keys
 */
export const STORAGE_KEYS = {
  GUEST_IDENTITY: 'aurin_guest_identity',
  GUEST_SESSION: 'aurin_guest_session',
} as const;

/**
 * Public Route Patterns
 */
export const PUBLIC_ROUTES = {
  TASK_VIEW: '/p/:token',
  API_TASK: '/api/public/:token',
  API_COMMENTS: '/api/public/comments',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  INVALID_TOKEN: 'El enlace es inválido o ha expirado',
  TASK_NOT_PUBLIC: 'Esta tarea no está disponible públicamente',
  UNAUTHORIZED: 'No tienes permiso para realizar esta acción',
  RATE_LIMIT_EXCEEDED: 'Has excedido el límite de solicitudes. Intenta nuevamente en unos minutos',
  COMMENT_TOO_LONG: `El comentario no puede exceder ${COMMENT_CONFIG.MAX_LENGTH} caracteres`,
  COMMENT_TOO_SHORT: 'El comentario no puede estar vacío',
  GUEST_NAME_REQUIRED: 'Por favor, ingresa tu nombre para continuar',
  GUEST_NAME_TOO_LONG: `El nombre no puede exceder ${COMMENT_CONFIG.MAX_GUEST_NAME_LENGTH} caracteres`,
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  SHARE_ENABLED: 'Compartir activado. El enlace ha sido generado',
  SHARE_DISABLED: 'Compartir desactivado. El enlace ya no es válido',
  TOKEN_REGENERATED: 'Enlace regenerado. El enlace anterior ya no es válido',
  COMMENT_POSTED: 'Comentario publicado correctamente',
  LINK_COPIED: '¡Enlace copiado al portapapeles!',
} as const;

/**
 * UI Constants
 */
export const UI_CONSTANTS = {
  // Toast durations (ms)
  TOAST_DURATION: 3000,
  TOAST_DURATION_SHORT: 1500,
  
  // Animation durations (ms)
  TRANSITION_DURATION: 200,
  FADE_DURATION: 150,
  
  // Polling intervals (ms)
  COMMENT_POLL_INTERVAL: 5000,
} as const;
