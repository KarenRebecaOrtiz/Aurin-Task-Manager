/**
 * Error metadata enrichment system.
 * Inspired by apps.apple.com error handling architecture.
 *
 * Allows attaching context, retry actions, and metadata to errors
 * for better error recovery and debugging.
 */

export interface ErrorIntent {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  taskId?: string;
  clientId?: string;
  [key: string]: any;
}

export interface RetryAction {
  type: string;
  payload: any;
  maxAttempts?: number;
  currentAttempt?: number;
  backoffMs?: number;
}

/**
 * Enriched error with metadata for better handling and recovery.
 */
export class EnrichedError extends Error {
  public readonly originalError?: Error;
  public readonly timestamp: number;
  public intent?: ErrorIntent;
  public context?: ErrorContext;
  public retryAction?: RetryAction;
  public retryable: boolean = false;
  public userFacing: boolean = false;
  public statusCode?: number;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'EnrichedError';
    this.originalError = originalError;
    this.timestamp = Date.now();

    // Maintain stack trace
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Add rejected intent metadata to error.
 * Useful for tracking what action/request failed.
 */
export function addRejectedIntent(
  error: Error,
  intent: ErrorIntent
): EnrichedError {
  if (error instanceof EnrichedError) {
    error.intent = intent;
    return error;
  }

  const enriched = new EnrichedError(error.message, error);
  enriched.intent = intent;
  return enriched;
}

/**
 * Get rejected intent from error if it exists.
 */
export function getRejectedIntent(error: Error): ErrorIntent | null {
  if (error instanceof EnrichedError && error.intent) {
    return error.intent;
  }
  return null;
}

/**
 * Add retry action metadata to error.
 * Enables automatic retry functionality.
 */
export function addRetryAction(
  error: Error,
  action: RetryAction
): EnrichedError {
  if (error instanceof EnrichedError) {
    error.retryAction = action;
    error.retryable = true;
    return error;
  }

  const enriched = new EnrichedError(error.message, error);
  enriched.retryAction = action;
  enriched.retryable = true;
  return enriched;
}

/**
 * Get retry action from error if it exists.
 */
export function getRetryAction(error: Error): RetryAction | null {
  if (error instanceof EnrichedError && error.retryAction) {
    return error.retryAction;
  }
  return null;
}

/**
 * Add context metadata to error.
 * Useful for debugging and logging.
 */
export function addContext(error: Error, context: ErrorContext): EnrichedError {
  if (error instanceof EnrichedError) {
    error.context = { ...error.context, ...context };
    return error;
  }

  const enriched = new EnrichedError(error.message, error);
  enriched.context = context;
  return enriched;
}

/**
 * Get context from error if it exists.
 */
export function getContext(error: Error): ErrorContext | null {
  if (error instanceof EnrichedError && error.context) {
    return error.context;
  }
  return null;
}

/**
 * Mark error as user-facing (safe to show to users).
 */
export function markUserFacing(
  error: Error,
  userMessage?: string
): EnrichedError {
  if (error instanceof EnrichedError) {
    error.userFacing = true;
    if (userMessage) {
      error.message = userMessage;
    }
    return error;
  }

  const enriched = new EnrichedError(userMessage || error.message, error);
  enriched.userFacing = true;
  return enriched;
}

/**
 * Check if error is user-facing.
 */
export function isUserFacing(error: Error): boolean {
  return error instanceof EnrichedError && error.userFacing;
}

/**
 * Create error from HTTP response.
 */
export function createHttpError(
  statusCode: number,
  message?: string,
  context?: ErrorContext
): EnrichedError {
  const defaultMessage = `HTTP Error ${statusCode}`;
  const error = new EnrichedError(message || defaultMessage);

  error.statusCode = statusCode;
  error.context = context;

  // Common HTTP errors are user-facing
  if (statusCode >= 400 && statusCode < 500) {
    error.userFacing = true;
  }

  // Some errors are retryable
  if (statusCode >= 500 || statusCode === 429 || statusCode === 408) {
    error.retryable = true;
  }

  return error;
}

/**
 * Calculate retry delay with exponential backoff.
 */
export function calculateRetryDelay(attempt: number, baseMs: number = 1000): number {
  const maxDelay = 30000; // 30 seconds max
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxDelay);

  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);

  return Math.floor(delay + jitter);
}

/**
 * Check if error should be retried based on attempt count.
 */
export function shouldRetry(error: Error): boolean {
  if (!(error instanceof EnrichedError) || !error.retryable) {
    return false;
  }

  const action = error.retryAction;
  if (!action) {
    return false;
  }

  const maxAttempts = action.maxAttempts ?? 3;
  const currentAttempt = action.currentAttempt ?? 0;

  return currentAttempt < maxAttempts;
}

/**
 * Increment retry attempt counter on error.
 */
export function incrementRetryAttempt(error: EnrichedError): void {
  if (error.retryAction) {
    error.retryAction.currentAttempt = (error.retryAction.currentAttempt ?? 0) + 1;
  }
}
