// src/modules/shareTask/services/session.server.ts
'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const GUEST_SESSION_COOKIE = 'guest_session';
const secret = new TextEncoder().encode(
  process.env.GUEST_SESSION_SECRET || 'super-secret-key-for-guest-sessions-dev-only'
);

if (!process.env.GUEST_SESSION_SECRET) {
  console.warn(
    'GUEST_SESSION_SECRET is not set. Using a default secret for development. This is not secure for production.'
  );
}

interface GuestPayload {
  guestName: string;
  avatar: string;
  taskId: string;
  [key: string]: unknown; // Index signature para compatibilidad con JWTPayload
}

/**
 * Creates a guest session and sets it as a cookie.
 */
export async function createGuestSession(payload: GuestPayload) {
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Verifies the guest session from the cookie.
 */
export async function getGuestSession(): Promise<GuestPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE);
  if (!sessionCookie) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    return payload as unknown as GuestPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Deletes the guest session cookie.
 */
export async function deleteGuestSession() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE);
}
