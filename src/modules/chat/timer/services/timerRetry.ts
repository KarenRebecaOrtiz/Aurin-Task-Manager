/**
 * Timer Module - Retry Service
 *
 * Generic retry logic with exponential backoff for Firebase operations.
 *
 * @module timer/services/retry
 */

import type { RetryOptions } from '../types/timer.types';
import {
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE_MS,
  MAX_RETRY_DELAY_MS,
  RETRYABLE_ERROR_KEYWORDS,
} from '../utils/timerConstants';

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Check if an error is retryable
 * Retryable errors are network-related or temporary failures
 *
 * @param error - Error to check
 * @returns True if error should be retried
 *
 * @example
 * const error = new Error('Network timeout');
 * isRetryableError(error); // true
 *
 * const permanentError = new Error('Invalid credentials');
 * isRetryableError(permanentError); // false
 */
export function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  // Check if error message contains any retryable keywords
  return RETRYABLE_ERROR_KEYWORDS.some((keyword) =>
    errorMessage.includes(keyword.toLowerCase())
  );
}

// ============================================================================
// BACKOFF CALCULATION
// ============================================================================

/**
 * Calculate exponential backoff delay with jitter
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds with random jitter
 *
 * @example
 * calculateBackoffDelay(0, 1000, 30000); // ~1000-2000ms
 * calculateBackoffDelay(1, 1000, 30000); // ~2000-3000ms
 * calculateBackoffDelay(2, 1000, 30000); // ~4000-5000ms
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (random variance between 0 and 1000ms)
  const jitter = Math.random() * 1000;

  return cappedDelay + jitter;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - Async operation to retry
 * @param options - Retry options (maxAttempts, baseDelay, maxDelay, onRetry)
 * @returns Promise resolving to operation result
 * @throws Last error if all retries fail or non-retryable error
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     return await someFlakyOperation();
 *   },
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}:`, error.message);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    baseDelay = RETRY_DELAY_BASE_MS,
    maxDelay = MAX_RETRY_DELAY_MS,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try the operation
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        // Non-retryable error - throw immediately
        throw lastError;
      }

      // Check if this was the last attempt
      if (attempt === maxAttempts - 1) {
        // Last attempt failed - throw error
        throw lastError;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Log retry attempt
      console.warn(
        `[TimerRetry] Attempt ${attempt + 1}/${maxAttempts} failed:`,
        lastError.message
      );

      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);

      console.log(`[TimerRetry] Retrying in ${Math.round(delay)}ms...`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry an operation with a simple constant delay
 * Simpler alternative to exponential backoff
 *
 * @param operation - Async operation to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delay - Delay between attempts in milliseconds
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * const result = await retryWithConstantDelay(
 *   async () => await someOperation(),
 *   3,
 *   1000
 * );
 * ```
 */
export async function retryWithConstantDelay<T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY_BASE_MS
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      console.warn(
        `[TimerRetry] Attempt ${attempt + 1}/${maxAttempts} failed, retrying...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 * Returns a new function that automatically retries on failure
 *
 * @param fn - Function to make retryable
 * @param options - Retry options
 * @returns Retryable version of the function
 *
 * @example
 * ```typescript
 * const retryableFetch = createRetryable(
 *   async (url: string) => {
 *     return await fetch(url);
 *   },
 *   { maxAttempts: 3 }
 * );
 *
 * const response = await retryableFetch('https://api.example.com');
 * ```
 */
export function createRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerRetry = {
  retryWithBackoff,
  retryWithConstantDelay,
  createRetryable,
  isRetryableError,
  calculateBackoffDelay,
} as const;
