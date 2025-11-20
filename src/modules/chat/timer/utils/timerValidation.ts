/**
 * Timer Module - Validation
 *
 * Zod schemas and validation functions for timer data.
 * All error messages are in Spanish for consistency.
 *
 * @module timer/utils/validation
 */

import { z } from 'zod';
import { ERROR_MESSAGES, TIME_FORMAT_REGEX, MAX_COMMENT_LENGTH } from './timerConstants';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for time input validation (HH:MM format)
 */
export const timeInputSchema = z
  .string({ required_error: ERROR_MESSAGES.TIME_REQUIRED })
  .min(1, { message: ERROR_MESSAGES.TIME_REQUIRED })
  .regex(TIME_FORMAT_REGEX, {
    message: ERROR_MESSAGES.INVALID_TIME_FORMAT,
  });

/**
 * Schema for date input validation (no future dates)
 */
export const dateInputSchema = z
  .date({ required_error: ERROR_MESSAGES.DATE_REQUIRED })
  .refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    },
    { message: ERROR_MESSAGES.FUTURE_DATE_NOT_ALLOWED }
  );

/**
 * Schema for comment input validation (optional, max length)
 */
export const commentInputSchema = z
  .string()
  .max(MAX_COMMENT_LENGTH, {
    message: `El comentario no puede tener más de ${MAX_COMMENT_LENGTH} caracteres`,
  })
  .optional();

/**
 * Combined schema for timer form validation
 */
export const timerFormSchema = z.object({
  time: timeInputSchema,
  date: dateInputSchema,
  comment: commentInputSchema,
});

/**
 * Type inference from timer form schema
 */
export type TimerFormData = z.infer<typeof timerFormSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate time format (HH:MM)
 *
 * @param time - Time string to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateTimeFormat("14:30"); // true
 * validateTimeFormat("25:30"); // false
 * validateTimeFormat("14:70"); // false
 */
export function validateTimeFormat(time: string): boolean {
  return timeInputSchema.safeParse(time).success;
}

/**
 * Validate that date is not in the future
 *
 * @param date - Date to validate
 * @returns True if date is today or in the past
 *
 * @example
 * validateDateNotFuture(new Date()); // true
 * validateDateNotFuture(new Date('2099-01-01')); // false
 */
export function validateDateNotFuture(date: Date): boolean {
  return dateInputSchema.safeParse(date).success;
}

/**
 * Validate comment length
 *
 * @param comment - Comment string to validate
 * @returns True if comment is within length limit
 *
 * @example
 * validateCommentLength("Valid comment"); // true
 * validateCommentLength("x".repeat(600)); // false
 */
export function validateCommentLength(comment: string): boolean {
  return commentInputSchema.safeParse(comment).success;
}

/**
 * Validate complete timer form
 *
 * @param data - Form data to validate
 * @returns Validation result with success flag and errors
 *
 * @example
 * const result = validateTimerForm({
 *   time: "14:30",
 *   date: new Date(),
 *   comment: "Work session"
 * });
 * if (result.success) {
 *   console.log("Valid:", result.data);
 * } else {
 *   console.log("Errors:", result.error.errors);
 * }
 */
export function validateTimerForm(data: unknown): {
  success: boolean;
  data?: TimerFormData;
  error?: z.ZodError;
} {
  const result = timerFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

// ============================================================================
// SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Validate hours value
 *
 * @param hours - Hours value (0-23)
 * @returns True if valid hours value
 *
 * @example
 * validateHours(14); // true
 * validateHours(25); // false
 * validateHours(-1); // false
 */
export function validateHours(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 0 && hours <= 23;
}

/**
 * Validate minutes value
 *
 * @param minutes - Minutes value (0-59)
 * @returns True if valid minutes value
 *
 * @example
 * validateMinutes(30); // true
 * validateMinutes(60); // false
 * validateMinutes(-1); // false
 */
export function validateMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 59;
}

/**
 * Validate seconds value
 *
 * @param seconds - Seconds value (0-59)
 * @returns True if valid seconds value
 *
 * @example
 * validateSeconds(45); // true
 * validateSeconds(60); // false
 * validateSeconds(-1); // false
 */
export function validateSeconds(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= 59;
}

/**
 * Validate time components (hours, minutes, seconds)
 *
 * @param hours - Hours value
 * @param minutes - Minutes value
 * @param seconds - Seconds value (optional)
 * @returns True if all components are valid
 *
 * @example
 * validateTimeComponents(14, 30, 45); // true
 * validateTimeComponents(25, 30, 45); // false
 */
export function validateTimeComponents(
  hours: number,
  minutes: number,
  seconds?: number
): boolean {
  const validHours = validateHours(hours);
  const validMinutes = validateMinutes(minutes);
  const validSeconds = seconds === undefined || validateSeconds(seconds);

  return validHours && validMinutes && validSeconds;
}

// ============================================================================
// ERROR EXTRACTION
// ============================================================================

/**
 * Extract validation errors from Zod error
 *
 * @param error - Zod error object
 * @returns Object mapping field names to error messages
 *
 * @example
 * const errors = extractValidationErrors(zodError);
 * console.log(errors.time); // "Formato de hora inválido (HH:MM)"
 */
export function extractValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return errors;
}

/**
 * Get first error message from Zod error
 *
 * @param error - Zod error object
 * @returns First error message or empty string
 *
 * @example
 * const message = getFirstError(zodError);
 * console.log(message); // "Formato de hora inválido (HH:MM)"
 */
export function getFirstError(error: z.ZodError): string {
  if (error.errors.length === 0) return '';
  return error.errors[0].message;
}

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Sanitize and validate time input
 *
 * @param time - Raw time input string
 * @returns Sanitized time string or null if invalid
 *
 * @example
 * sanitizeTimeInput("9:5"); // "09:05"
 * sanitizeTimeInput("14:30"); // "14:30"
 * sanitizeTimeInput("invalid"); // null
 */
export function sanitizeTimeInput(time: string): string | null {
  const trimmed = time.trim();

  // Try to parse and reformat
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;
  if (!validateTimeComponents(hours, minutes)) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Sanitize date to start of day
 *
 * @param date - Date to sanitize
 * @returns Date with time set to 00:00:00
 *
 * @example
 * const sanitized = sanitizeDateToStartOfDay(new Date('2025-01-15T14:30:00'));
 * // Returns: 2025-01-15T00:00:00
 */
export function sanitizeDateToStartOfDay(date: Date): Date {
  const sanitized = new Date(date);
  sanitized.setHours(0, 0, 0, 0);
  return sanitized;
}

/**
 * Sanitize comment string
 *
 * @param comment - Comment string to sanitize
 * @returns Sanitized comment (trimmed, length-limited)
 *
 * @example
 * sanitizeComment("  Hello  "); // "Hello"
 * sanitizeComment("x".repeat(600)); // Truncated to MAX_COMMENT_LENGTH
 */
export function sanitizeComment(comment: string): string {
  const trimmed = comment.trim();

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return trimmed.substring(0, MAX_COMMENT_LENGTH);
  }

  return trimmed;
}

// ============================================================================
// BUSINESS LOGIC VALIDATIONS
// ============================================================================

/**
 * Validate that time entry is not zero
 *
 * @param hours - Hours value
 * @param minutes - Minutes value
 * @returns True if time is greater than zero
 *
 * @example
 * validateNonZeroTime(1, 30); // true
 * validateNonZeroTime(0, 0); // false
 */
export function validateNonZeroTime(hours: number, minutes: number): boolean {
  return hours > 0 || minutes > 0;
}

/**
 * Validate time entry with business rules
 *
 * @param time - Time string (HH:MM)
 * @param date - Date object
 * @returns Validation result with errors
 *
 * @example
 * const result = validateTimeEntry("14:30", new Date());
 * if (result.valid) {
 *   console.log("Valid time entry");
 * } else {
 *   console.log("Errors:", result.errors);
 * }
 */
export function validateTimeEntry(
  time: string,
  date: Date
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate time format
  if (!validateTimeFormat(time)) {
    errors.push(ERROR_MESSAGES.INVALID_TIME_FORMAT);
  }

  // Validate date
  if (!validateDateNotFuture(date)) {
    errors.push(ERROR_MESSAGES.FUTURE_DATE_NOT_ALLOWED);
  }

  // Validate non-zero time
  const [hours, minutes] = time.split(':').map(Number);
  if (!validateNonZeroTime(hours, minutes)) {
    errors.push(ERROR_MESSAGES.TIME_CANNOT_BE_ZERO);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerValidation = {
  // Schemas
  timeInputSchema,
  dateInputSchema,
  commentInputSchema,
  timerFormSchema,

  // Basic validations
  validateTimeFormat,
  validateDateNotFuture,
  validateCommentLength,
  validateTimerForm,

  // Component validations
  validateHours,
  validateMinutes,
  validateSeconds,
  validateTimeComponents,

  // Error handling
  extractValidationErrors,
  getFirstError,

  // Sanitization
  sanitizeTimeInput,
  sanitizeDateToStartOfDay,
  sanitizeComment,

  // Business logic
  validateNonZeroTime,
  validateTimeEntry,
} as const;
