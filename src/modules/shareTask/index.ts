/**
 * ShareTask Module
 *
 * Sistema completo para compartir tareas con clientes externos
 *
 * @module shareTask
 */

// ============================================================================
// SERVICES
// ============================================================================
export { tokenService } from './services/tokenService';

// ============================================================================
// CONSTANTS
// ============================================================================
export {
  TOKEN_CONFIG,
  ERROR_MESSAGES,
} from './utils/constants';

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================
export type {
  PublicTask,
  GuestIdentity,
  PublicComment,
  ValidationResult,
} from './schemas/validation.schemas';

export {
  PublicTaskSchema,
  sanitizeTaskForPublic,
  safeValidate,
} from './schemas/validation.schemas';
