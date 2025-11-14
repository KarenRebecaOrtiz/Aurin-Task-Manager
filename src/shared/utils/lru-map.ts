/**
 * Least Recently Used (LRU) Map implementation.
 * Inspired by apps.apple.com architecture.
 *
 * Automatically removes the least recently used entries when the size limit is exceeded.
 * Useful for caching with automatic memory management.
 *
 * @example
 * const cache = new LruMap<string, UserData>(10);
 * cache.set('user-1', userData);
 * const user = cache.get('user-1'); // Moves to end (most recently used)
 */
export class LruMap<K, V> extends Map<K, V> {
  private sizeLimit: number;

  constructor(sizeLimit: number = 10) {
    super();
    this.sizeLimit = sizeLimit;
  }

  /**
   * Get value and move to end (most recently used position).
   */
  get(key: K): V | undefined {
    if (!this.has(key)) {
      return undefined;
    }

    const value = super.get(key);

    // Move to end (most recently used)
    this.delete(key);
    super.set(key, value!);

    return value;
  }

  /**
   * Set value and prune if over limit.
   */
  set(key: K, value: V): this {
    // If key exists, delete it first to re-add at the end
    if (this.has(key)) {
      this.delete(key);
    }

    super.set(key, value);
    this.prune();

    return this;
  }

  /**
   * Remove least recently used entries until within size limit.
   */
  private prune(): void {
    while (this.size > this.sizeLimit) {
      // Get first key (least recently used)
      const leastRecentlyUsedKey = this.keys().next().value;
      this.delete(leastRecentlyUsedKey);
    }
  }

  /**
   * Update the size limit and prune if necessary.
   */
  setSizeLimit(newLimit: number): void {
    this.sizeLimit = newLimit;
    this.prune();
  }

  /**
   * Get current size limit.
   */
  getSizeLimit(): number {
    return this.sizeLimit;
  }
}
