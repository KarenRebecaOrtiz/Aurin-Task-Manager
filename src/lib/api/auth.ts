/**
 * Centralized API Authentication Utilities
 *
 * Provides consistent authentication patterns across all API routes.
 * Follows Clerk 2025 best practices with defense-in-depth approach.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Authentication result interface
 */
export interface AuthResult {
  error: NextResponse | null;
  userId: string | null;
}

/**
 * Require authentication for API routes
 *
 * Uses Clerk's auth() helper for App Router.
 * Returns either an error response or the authenticated userId.
 *
 * @returns Object with error (if unauthenticated) or userId
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const { error, userId } = await requireAuth();
 *   if (error) return error;
 *
 *   // Continue with authenticated logic
 *   const data = await fetchUserData(userId);
 *   return NextResponse.json(data);
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
      userId: null,
    };
  }

  return { error: null, userId };
}


/**
 * Higher-order function wrapper for authenticated API routes
 *
 * Automatically handles authentication and provides userId to handler.
 * Reduces boilerplate code in API routes.
 *
 * @param handler - Async function that receives userId and returns a response
 * @returns NextResponse with either error or handler result
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (userId) => {
 *   const client = await clerkClient();
 *   const users = await client.users.getUserList();
 *   return NextResponse.json(users);
 * });
 * ```
 */
export function withAuth<T = unknown>(
  handler: (userId: string, ...args: any[]) => Promise<NextResponse<T>>
): (...args: any[]) => Promise<NextResponse> {
  return async (...args: any[]) => {
    const { error, userId } = await requireAuth();

    if (error || !userId) {
      return error;
    }

    try {
      return await handler(userId, ...args);
    } catch (handlerError) {
      console.error('[Auth] Handler error:', handlerError);
      throw handlerError;
    }
  };
}


/**
 * Optional authentication for API routes
 *
 * Returns userId if authenticated, null if not.
 * Useful for routes that have different behavior based on auth state.
 *
 * @returns userId string or null
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const userId = await optionalAuth();
 *
 *   if (userId) {
 *     // Return personalized data
 *     return NextResponse.json({ data: personalizedData });
 *   } else {
 *     // Return public data
 *     return NextResponse.json({ data: publicData });
 *   }
 * }
 * ```
 */
export async function optionalAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId || null;
}
