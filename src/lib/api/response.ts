/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all API routes.
 * Ensures predictable client-side parsing and error handling.
 */

import { NextResponse } from 'next/server';

/**
 * Standard success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standard error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * Response options for customization
 */
export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

/**
 * Create a standardized success response
 *
 * @param data - The data to return in the response
 * @param options - Optional status code and headers
 * @returns NextResponse with standardized success structure
 *
 * @example
 * ```typescript
 * return apiSuccess({ users: [...] });
 * // Response: { success: true, data: { users: [...] } }
 *
 * return apiSuccess({ id: 123 }, { status: 201 });
 * // Response: { success: true, data: { id: 123 } } with 201 status
 * ```
 */
export function apiSuccess<T = unknown>(
  data: T,
  options: ResponseOptions = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, headers } = options;

  return NextResponse.json(
    {
      success: true as const,
      data,
    },
    { status, headers }
  );
}

/**
 * Create a standardized error response
 *
 * @param message - Error message for the client
 * @param options - Optional status code, details, error code, and headers
 * @returns NextResponse with standardized error structure
 *
 * @example
 * ```typescript
 * return apiError('User not found', { status: 404 });
 * // Response: { success: false, error: 'User not found' } with 404 status
 *
 * return apiError('Validation failed', {
 *   status: 400,
 *   details: { field: 'email', message: 'Invalid format' },
 *   code: 'VALIDATION_ERROR'
 * });
 * ```
 */
export function apiError(
  message: string,
  options: ResponseOptions & {
    details?: unknown;
    code?: string;
  } = {}
): NextResponse<ApiErrorResponse> {
  const { status = 500, details, code, headers } = options;

  const response: ApiErrorResponse = {
    success: false,
    error: message,
  };

  if (details !== undefined) {
    response.details = details;
  }

  if (code) {
    response.code = code;
  }

  return NextResponse.json(response, { status, headers });
}

/**
 * Create a 400 Bad Request error response
 *
 * @param message - Error message
 * @param details - Optional validation details
 * @returns NextResponse with 400 status
 */
export function apiBadRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    status: 400,
    details,
    code: 'BAD_REQUEST',
  });
}

/**
 * Create a 401 Unauthorized error response
 *
 * @param message - Error message (defaults to 'Unauthorized')
 * @returns NextResponse with 401 status
 */
export function apiUnauthorized(message = 'Unauthorized'): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    status: 401,
    code: 'UNAUTHORIZED',
  });
}

/**
 * Create a 403 Forbidden error response
 *
 * @param message - Error message (defaults to 'Forbidden')
 * @returns NextResponse with 403 status
 */
export function apiForbidden(message = 'Forbidden'): NextResponse<ApiErrorResponse> {
  return apiError(message, {
    status: 403,
    code: 'FORBIDDEN',
  });
}

/**
 * Create a 404 Not Found error response
 *
 * @param resource - Name of the resource that wasn't found
 * @returns NextResponse with 404 status
 */
export function apiNotFound(resource = 'Resource'): NextResponse<ApiErrorResponse> {
  return apiError(`${resource} not found`, {
    status: 404,
    code: 'NOT_FOUND',
  });
}

/**
 * Create a 500 Internal Server Error response
 *
 * @param message - Error message (defaults to generic message)
 * @param error - Optional error object for logging
 * @returns NextResponse with 500 status
 */
export function apiServerError(
  message = 'Internal server error',
  error?: unknown
): NextResponse<ApiErrorResponse> {
  if (error) {
    console.error('[API Error]', {
      message,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  // Don't expose internal error details in production
  const details =
    process.env.NODE_ENV === 'development' && error instanceof Error
      ? { message: error.message, stack: error.stack }
      : undefined;

  return apiError(message, {
    status: 500,
    details,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

/**
 * Create a 201 Created success response
 *
 * @param data - The created resource data
 * @param location - Optional location header (URL of created resource)
 * @returns NextResponse with 201 status
 *
 * @example
 * ```typescript
 * return apiCreated({ id: 123, name: 'New Task' }, '/api/tasks/123');
 * ```
 */
export function apiCreated<T = unknown>(
  data: T,
  location?: string
): NextResponse<ApiSuccessResponse<T>> {
  const headers: HeadersInit = location ? { Location: location } : {};
  return apiSuccess(data, { status: 201, headers });
}

/**
 * Create a 204 No Content success response
 *
 * Used for successful operations that don't return data (e.g., DELETE)
 *
 * @returns NextResponse with 204 status and no body
 *
 * @example
 * ```typescript
 * export async function DELETE() {
 *   await deleteResource();
 *   return apiNoContent();
 * }
 * ```
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Handle common API errors with appropriate responses
 *
 * @param error - The error to handle
 * @param context - Optional context for logging
 * @returns Appropriate error response based on error type
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   try {
 *     const data = await fetchData();
 *     return apiSuccess(data);
 *   } catch (error) {
 *     return handleApiError(error, 'GET /api/data');
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const prefix = context ? `[${context}]` : '[API Error]';

  console.error(prefix, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('CLERK_SECRET_KEY')) {
      return apiServerError('Authentication service configuration error');
    }

    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return apiUnauthorized('Authentication failed');
    }

    if (error.message.includes('not found')) {
      return apiNotFound();
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return apiBadRequest(error.message);
    }
  }

  // Default to 500 for unknown errors
  return apiServerError();
}
