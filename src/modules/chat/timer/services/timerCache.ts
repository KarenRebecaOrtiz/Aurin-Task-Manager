/**
 * Timer Module - Cache Service
 *
 * In-memory cache for timer data with TTL support.
 * Reduces Firestore reads and improves performance.
 *
 * @module timer/services/cache
 */

import type { TimerDocument, CacheEntry } from '../types/timer.types';
import { CACHE_TTL_MS } from '../utils/timerConstants';

// ============================================================================
// TIMER CACHE CLASS
// ============================================================================

/**
 * In-memory cache for timer documents with TTL and pending writes tracking
 *
 * @class TimerCache
 *
 * @example
 * ```typescript
 * const cache = new TimerCache(60000); // 60 second TTL
 *
 * // Set cache entry
 * cache.set('timer123', timerDoc, false);
 *
 * // Get cache entry
 * const doc = cache.get('timer123');
 *
 * // Check for pending writes
 * if (cache.hasPendingWrites('timer123')) {
 *   console.log('Timer has pending writes');
 * }
 *
 * // Invalidate entry
 * cache.invalidate('timer123');
 * ```
 */
export class TimerCache {
  private cache: Map<string, CacheEntry<TimerDocument>>;
  private ttl: number;

  /**
   * Create a new TimerCache instance
   *
   * @param ttl - Time to live in milliseconds (default: 60000ms = 1 minute)
   */
  constructor(ttl: number = CACHE_TTL_MS) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Get a timer document from cache
   * Returns null if not found or expired
   *
   * @param timerId - Timer ID
   * @returns Timer document or null
   */
  get(timerId: string): TimerDocument | null {
    const entry = this.cache.get(timerId);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.ttl) {
      // Entry expired - remove and return null
      this.cache.delete(timerId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a timer document in cache
   *
   * @param timerId - Timer ID
   * @param data - Timer document
   * @param hasPendingWrites - Whether there are pending writes (default: false)
   */
  set(
    timerId: string,
    data: TimerDocument,
    hasPendingWrites: boolean = false
  ): void {
    this.cache.set(timerId, {
      data,
      timestamp: Date.now(),
      hasPendingWrites,
    });
  }

  /**
   * Update pending writes status for a cache entry
   *
   * @param timerId - Timer ID
   * @param hasPendingWrites - New pending writes status
   * @returns True if entry was updated, false if not found
   */
  updatePendingWrites(timerId: string, hasPendingWrites: boolean): boolean {
    const entry = this.cache.get(timerId);

    if (!entry) {
      return false;
    }

    entry.hasPendingWrites = hasPendingWrites;
    return true;
  }

  /**
   * Check if a timer has pending writes
   *
   * @param timerId - Timer ID
   * @returns True if has pending writes, false otherwise
   */
  hasPendingWrites(timerId: string): boolean {
    const entry = this.cache.get(timerId);
    return entry?.hasPendingWrites ?? false;
  }

  /**
   * Invalidate (remove) a specific timer from cache
   *
   * @param timerId - Timer ID
   * @returns True if entry was removed, false if not found
   */
  invalidate(timerId: string): boolean {
    return this.cache.delete(timerId);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Invalidate expired entries
   * Useful for periodic cleanup
   *
   * @returns Number of entries removed
   */
  invalidateExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [timerId, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;

      if (age > this.ttl) {
        this.cache.delete(timerId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all timer IDs in cache
   *
   * @returns Array of timer IDs
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of entries)
   *
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if cache has an entry for a timer
   *
   * @param timerId - Timer ID
   * @returns True if cache has entry
   */
  has(timerId: string): boolean {
    return this.cache.has(timerId);
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   */
  getStats(): {
    size: number;
    pendingWrites: number;
    expired: number;
  } {
    const now = Date.now();
    let pendingWrites = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (entry.hasPendingWrites) {
        pendingWrites++;
      }

      const age = now - entry.timestamp;
      if (age > this.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      pendingWrites,
      expired,
    };
  }

  /**
   * Update TTL for the cache
   *
   * @param newTtl - New TTL in milliseconds
   */
  setTTL(newTtl: number): void {
    this.ttl = newTtl;
  }

  /**
   * Get current TTL setting
   *
   * @returns Current TTL in milliseconds
   */
  getTTL(): number {
    return this.ttl;
  }
}

// ============================================================================
// CACHE STRATEGIES
// ============================================================================

/**
 * Get cached data or fetch from source
 * Cache-first strategy: tries cache first, falls back to fetch
 *
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not in cache
 * @param cache - Cache instance
 * @returns Cached or fetched data
 *
 * @example
 * ```typescript
 * const timer = await getCachedOrFetch(
 *   'timer123',
 *   async () => await getTimerFromFirebase('timer123'),
 *   timerCache
 * );
 * ```
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cache: TimerCache
): Promise<T> {
  // Try cache first
  const cached = cache.get(key);
  if (cached !== null) {
    return cached as unknown as T;
  }

  // Fetch from source
  const data = await fetchFn();

  // Store in cache
  if (data) {
    cache.set(key, data as unknown as TimerDocument);
  }

  return data;
}

/**
 * Fetch data and update cache
 * Network-first strategy: always fetches, updates cache
 *
 * @param key - Cache key
 * @param fetchFn - Function to fetch data
 * @param cache - Cache instance
 * @returns Fetched data
 *
 * @example
 * ```typescript
 * const timer = await fetchAndCache(
 *   'timer123',
 *   async () => await getTimerFromFirebase('timer123'),
 *   timerCache
 * );
 * ```
 */
export async function fetchAndCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cache: TimerCache
): Promise<T> {
  // Always fetch from source
  const data = await fetchFn();

  // Update cache
  if (data) {
    cache.set(key, data as unknown as TimerDocument);
  }

  return data;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global timer cache instance
 * Use this singleton for consistent caching across the application
 */
export const timerCache = new TimerCache(CACHE_TTL_MS);

// Optional: Set up periodic cleanup
if (typeof window !== 'undefined') {
  // Clean expired entries every 5 minutes
  setInterval(() => {
    const removed = timerCache.invalidateExpired();
    if (removed > 0) {
      console.log(`[TimerCache] Cleaned ${removed} expired entries`);
    }
  }, 5 * 60 * 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const TimerCacheService = {
  TimerCache,
  timerCache,
  getCachedOrFetch,
  fetchAndCache,
} as const;
