/**
 * ShareTask Module - Token Service
 * 
 * Secure token generation and validation using nanoid
 */

import { customAlphabet } from 'nanoid';
import { TOKEN_CONFIG } from '../utils/constants';
import { tokenSecurity } from '../config/security.config';

/**
 * Generate a cryptographically secure token
 * Uses customAlphabet to avoid confusing characters
 * 
 * @returns {string} A 21-character URL-safe token (~140 bits entropy)
 * 
 * @example
 * ```typescript
 * const token = generateShareToken();
 * // => "3V7h2d8k9mZ1pQ4rT6yN5"
 * ```
 */
const nanoid = customAlphabet(
  TOKEN_CONFIG.ALPHABET,
  TOKEN_CONFIG.TOKEN_LENGTH
);

export const generateShareToken = (): string => {
  return nanoid();
};

/**
 * Validate token format
 * 
 * @param {string} token - Token to validate
 * @returns {boolean} True if token format is valid
 * 
 * @example
 * ```typescript
 * isValidTokenFormat("3V7h2d8k9mZ1pQ4rT6yN5"); // => true
 * isValidTokenFormat("invalid"); // => false
 * ```
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  if (token.length !== TOKEN_CONFIG.TOKEN_LENGTH) {
    return false;
  }
  
  return tokenSecurity.tokenRegex.test(token);
};

/**
 * Calculate token expiration date
 * 
 * @param {number} [days] - Days until expiration (default: 30)
 * @returns {Date} Expiration date
 * 
 * @example
 * ```typescript
 * const expiresAt = calculateTokenExpiry(7); // Expires in 7 days
 * ```
 */
export const calculateTokenExpiry = (days: number = TOKEN_CONFIG.DEFAULT_EXPIRY_DAYS): Date => {
  const now = new Date();
  const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return expiry;
};

/**
 * Check if token is expired
 * 
 * @param {Date | null} expiresAt - Expiration date
 * @returns {boolean} True if expired
 * 
 * @example
 * ```typescript
 * const expiry = new Date('2025-01-01');
 * isTokenExpired(expiry); // => true (if current date > 2025-01-01)
 * ```
 */
export const isTokenExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) {
    return false; // No expiration set
  }
  
  const now = new Date();
  return now > expiresAt;
};

/**
 * Generate public share URL
 * 
 * @param {string} token - Share token
 * @returns {string} Full public URL
 * 
 * @example
 * ```typescript
 * const url = buildShareUrl("3V7h2d8k9mZ1pQ4rT6yN5");
 * // => "https://yourapp.com/p/3V7h2d8k9mZ1pQ4rT6yN5"
 * ```
 */
export const buildShareUrl = (token: string): string => {
  // Import dynamically to avoid circular dependencies
  const { buildTokenShareUrl } = require('@/lib/url-utils');
  return buildTokenShareUrl(token);
};

/**
 * Extract token from URL
 * 
 * @param {string} url - Full URL or path
 * @returns {string | null} Extracted token or null
 * 
 * @example
 * ```typescript
 * extractTokenFromUrl("/p/3V7h2d8k9mZ1pQ4rT6yN5");
 * // => "3V7h2d8k9mZ1pQ4rT6yN5"
 * ```
 */
export const extractTokenFromUrl = (url: string): string | null => {
  const match = url.match(/\/p\/([a-zA-Z0-9]{21})/);
  return match ? match[1] : null;
};

/**
 * Token Service
 * Main export combining all token utilities
 */
export const tokenService = {
  generate: generateShareToken,
  validate: isValidTokenFormat,
  calculateExpiry: calculateTokenExpiry,
  isExpired: isTokenExpired,
  buildUrl: buildShareUrl,
  extractFromUrl: extractTokenFromUrl,
} as const;
