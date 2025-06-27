import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api(.*)',
]);

// APIs que no requieren autenticación
const publicApis = [
  '/api/detect-inactive-users',
  '/api/reset-status',
  '/api/init-user-activity',
  '/api/auto-detect-inactive'
];

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname === '/_not-found') {
    return NextResponse.next();
  }
  
  // Verificar si es una API pública
  if (publicApis.includes(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};