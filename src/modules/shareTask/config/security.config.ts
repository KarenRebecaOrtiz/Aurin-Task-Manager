/**
 * ShareTask Module - Security Configuration
 * 
 * Security settings following OWASP and W3C best practices
 */

import { TOKEN_CONFIG, RATE_LIMIT_CONFIG } from '../utils/constants';

/**
 * Token Security Configuration
 */
export const tokenSecurity = {
  /**
   * Token length ensures ~140 bits of entropy
   * This makes brute-force attacks computationally infeasible
   */
  length: TOKEN_CONFIG.TOKEN_LENGTH,
  
  /**
   * Custom alphabet excludes visually similar characters
   * Reduces user confusion when sharing links verbally
   */
  alphabet: TOKEN_CONFIG.ALPHABET,
  
  /**
   * Token validation regex
   */
  tokenRegex: /^[0-9a-zA-Z]{21}$/,
} as const;

/**
 * Input Sanitization Rules
 */
export const sanitizationRules = {
  /**
   * HTML tags to strip from user input
   */
  stripTags: /<[^>]*>/g,
  
  /**
   * Script tags (more aggressive matching)
   */
  stripScripts: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  
  /**
   * SQL injection patterns
   */
  sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  
  /**
   * Max lengths for various fields
   */
  maxLengths: {
    guestName: 50,
    comment: 2000,
    taskTitle: 200,
  },
} as const;

/**
 * Rate Limiting Rules
 */
export const rateLimiting = {
  /**
   * Comment submission limits
   */
  comments: {
    maxPerHour: RATE_LIMIT_CONFIG.MAX_COMMENTS_PER_HOUR,
    cooldownMinutes: RATE_LIMIT_CONFIG.COOLDOWN_MINUTES,
  },
  
  /**
   * API request limits
   */
  api: {
    maxPerMinute: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE,
    burstLimit: 50, // Burst allowance
  },
  
  /**
   * IP-based limits
   */
  ip: {
    maxTasksPerDay: 100, // Max different tasks accessed per IP per day
    maxCommentsPerDay: 50, // Max comments per IP per day
  },
} as const;

/**
 * CORS Configuration for Public Routes
 */
export const corsConfig = {
  /**
   * Allowed origins (adjust for production)
   */
  allowedOrigins: [
    process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  ],
  
  /**
   * Allowed methods
   */
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  
  /**
   * Allowed headers
   */
  allowedHeaders: ['Content-Type', 'Authorization'],
  
  /**
   * Max age for preflight requests (seconds)
   */
  maxAge: 86400, // 24 hours
} as const;

/**
 * Content Security Policy for Public Pages
 */
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Next.js
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
} as const;

/**
 * Validation Schemas (used with Zod)
 */
export const validationRules = {
  /**
   * Share token validation
   */
  token: {
    minLength: TOKEN_CONFIG.TOKEN_LENGTH,
    maxLength: TOKEN_CONFIG.TOKEN_LENGTH,
    pattern: tokenSecurity.tokenRegex,
  },
  
  /**
   * Guest name validation
   */
  guestName: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]+$/, // Alphanumeric + Spanish chars
  },
  
  /**
   * Comment content validation
   */
  comment: {
    minLength: 1,
    maxLength: 2000,
  },
} as const;
