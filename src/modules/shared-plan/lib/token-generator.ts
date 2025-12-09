/**
 * Generate secure tokens for shared plans
 */

import { randomBytes } from 'crypto'

export function generateShareToken(): string {
  // Generate a cryptographically secure random token
  return randomBytes(32).toString('base64url')
}

export function getTokenExpiration(hours: number = 168): Date {
  // Default: 7 days (168 hours)
  const expiration = new Date()
  expiration.setHours(expiration.getHours() + hours)
  return expiration
}

export function isTokenExpired(expiresAt: string | null, firstAccessedAt: string | null): boolean {
  // Token never expires if no expiration date set
  if (!expiresAt) return false

  const now = new Date()
  const expiration = new Date(expiresAt)

  // If token has been accessed and expiration has passed
  if (firstAccessedAt && now > expiration) {
    return true
  }

  return false
}
