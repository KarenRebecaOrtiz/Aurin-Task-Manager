/**
 * @module config/utils/configCache
 * @description Modular caching system for dialog/config data
 * Inspired by apps.apple.com request cache architecture
 */

import { RequestCache, generateCacheKey, createRequestMetrics } from '@/shared/utils/request-cache';
import { Config } from '../types';

/**
 * Cache entry metadata for config data
 */
export interface ConfigCacheMetadata {
  userId: string;
  lastModified: number;
  version: number;
}

/**
 * Cached config data with metadata
 */
export interface CachedConfigData {
  config: Config;
  metadata: ConfigCacheMetadata;
}

/**
 * Config-specific cache with user-based key generation
 */
class ConfigCache {
  private cache: RequestCache;

  constructor() {
    // 5 minute TTL, max 20 user configs
    this.cache = new RequestCache({
      ttl: 5 * 60 * 1000,
      maxSize: 20,
    });
  }

  /**
   * Generate cache key for user config
   */
  private getCacheKey(userId: string): string {
    return generateCacheKey('config/user', { userId });
  }

  /**
   * Get cached config data for a user
   */
  get(userId: string): CachedConfigData | null {
    const key = this.getCacheKey(userId);
    const entry = this.cache.get<CachedConfigData>(key);

    if (!entry) {
      console.log('[ConfigCache] Cache miss for userId:', userId);
      return null;
    }

    console.log('[ConfigCache] Cache hit for userId:', userId, {
      age: Date.now() - entry.timestamp,
      source: entry.source,
    });

    return entry.data;
  }

  /**
   * Set config data in cache
   */
  set(userId: string, config: Config, version: number = 1): void {
    const key = this.getCacheKey(userId);
    const requestStartTime = Date.now();

    const cachedData: CachedConfigData = {
      config,
      metadata: {
        userId,
        lastModified: Date.now(),
        version,
      },
    };

    const metrics = createRequestMetrics(requestStartTime);
    metrics.responseEndTime = Date.now();

    this.cache.set(key, cachedData, metrics);

    console.log('[ConfigCache] Cached config for userId:', userId);
  }

  /**
   * Invalidate cache for specific user
   */
  invalidate(userId: string): boolean {
    const key = this.getCacheKey(userId);
    const success = this.cache.invalidate(key);

    if (success) {
      console.log('[ConfigCache] Invalidated cache for userId:', userId);
    }

    return success;
  }

  /**
   * Invalidate all user configs
   */
  invalidateAll(): void {
    this.cache.invalidatePattern(/^config\/user/);
    console.log('[ConfigCache] Invalidated all config caches');
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[ConfigCache] Cleared all cache');
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Check if cache has fresh data for user
   */
  has(userId: string): boolean {
    const key = this.getCacheKey(userId);
    return this.cache.has(key);
  }

  /**
   * Update TTL (useful for dynamic cache behavior)
   */
  setTTL(ttl: number): void {
    this.cache.setTTL(ttl);
  }

  /**
   * Prune expired entries manually
   */
  pruneExpired(): number {
    return this.cache.pruneExpired();
  }
}

/**
 * Singleton instance of config cache
 * Shared across all config dialogs and forms
 */
export const configCache = new ConfigCache();

/**
 * Hook-friendly getter for config cache
 */
export const getConfigCache = () => configCache;

/**
 * Utility to check if cache should be bypassed
 */
export const shouldBypassCache = (): boolean => {
  // Bypass cache in development if needed
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('bypassCache') === 'true';
  }
  return false;
};
