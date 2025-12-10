// src/lib/url-utils.ts

/**
 * Get the base URL for the application
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (production domain)
 * 2. VERCEL_URL (Vercel deployments)
 * 3. window.location.origin (client-side fallback)
 * 4. localhost:3000 (development fallback)
 */
export function getBaseUrl(): string {
  // Priority 1: Custom production URL (set this in Vercel environment variables)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Priority 2: Vercel URL (automatic for all deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Priority 3: Client-side origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Priority 4: Development fallback
  return 'http://localhost:3000';
}

/**
 * Build a guest task share URL
 */
export function buildGuestTaskUrl(taskId: string): string {
  return `${getBaseUrl()}/guest/${taskId}`;
}

/**
 * Build a token-based share URL (legacy)
 */
export function buildTokenShareUrl(token: string): string {
  return `${getBaseUrl()}/p/${token}`;
}
