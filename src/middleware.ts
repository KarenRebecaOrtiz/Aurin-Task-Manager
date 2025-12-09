import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Protected routes that require authentication
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api(.*)',
]);

/**
 * Public API routes that don't require authentication
 * Note: These should be carefully reviewed for security implications
 */
const isPublicApi = createRouteMatcher([
  '/api/sendFeedback', // Public feedback endpoint
  '/api/request-delete', // Public deletion request endpoint
  '/api/public/(.*)', // Public task sharing API
]);

/**
 * Public routes that don't require authentication
 * Used for public task sharing functionality
 */
const isPublicRoute = createRouteMatcher([
  '/p/(.*)', // Public shared tasks (legacy token-based)
  '/guest/(.*)', // Public guest task access with token auth
]);

/**
 * Clerk Middleware with defense-in-depth protection
 *
 * Uses auth().protect() for automatic redirect and better security.
 * Follows Clerk 2025 best practices.
 */
export default clerkMiddleware(async (auth, req) => {
  // Allow Next.js not-found page
  if (req.nextUrl.pathname === '/_not-found') {
    return NextResponse.next();
  }

  // Allow public routes to bypass authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Allow public APIs to bypass authentication
  if (isPublicApi(req)) {
    return NextResponse.next();
  }

  // Protect all other matched routes using auth().protect()
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};