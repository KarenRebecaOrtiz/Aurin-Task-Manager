/**
 * Request cache with TTL (Time To Live) and metrics tracking.
 * Inspired by apps.apple.com network layer.
 *
 * Features:
 * - Automatic cache invalidation based on TTL
 * - Request metrics tracking (timing, correlation)
 * - Manual cache invalidation
 * - Cache hit/miss tracking
 */

export interface RequestMetrics {
  requestStartTime: number;
  responseStartTime: number;
  responseEndTime: number;
  clientCorrelationKey?: string | null;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  metrics: RequestMetrics;
  source: 'cache' | 'network';
}

export interface RequestCacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of entries (default: 50)
}

export class RequestCache {
  private cache: Map<string, CacheEntry<any>>;
  private ttl: number;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: RequestCacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 50;
  }

  /**
   * Get cached data if fresh, otherwise return null.
   */
  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return {
      ...entry,
      source: 'cache',
    };
  }

  /**
   * Set cache entry with metrics.
   */
  set<T>(key: string, data: T, metrics: RequestMetrics): void {
    // Prune if at max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      metrics,
      source: 'network',
    });
  }

  /**
   * Invalidate specific cache entry.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern.
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      ttl: this.ttl,
      maxSize: this.maxSize,
    };
  }

  /**
   * Check if cache has fresh data for a key.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get all cache keys.
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Update TTL setting.
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  /**
   * Prune expired entries.
   */
  pruneExpired(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}

/**
 * Global request cache instance.
 * Can be used across the application for consistent caching.
 */
export const globalRequestCache = new RequestCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
});

/**
 * Utility to generate cache keys from request parameters.
 */
export function generateCacheKey(
  endpoint: string,
  params?: Record<string, any>
): string {
  if (!params) {
    return endpoint;
  }

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${endpoint}?${sortedParams}`;
}

/**
 * Utility to create request metrics.
 */
export function createRequestMetrics(
  requestStartTime: number,
  correlationKey?: string | null
): RequestMetrics {
  const responseStartTime = Date.now();

  return {
    requestStartTime,
    responseStartTime,
    responseEndTime: responseStartTime, // Will be updated when response completes
    clientCorrelationKey: correlationKey,
  };
}
