import { IndexedDBAdapter } from "./indexeddb-adapter";

/**
 * Cache entry with TTL (Time-To-Live) support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

/**
 * Cache adapter with TTL-based invalidation
 * Wraps IndexedDB for persistent caching with staleness detection
 */
export class CacheAdapter<T> {
  private idbAdapter: IndexedDBAdapter<CacheEntry<T>>;
  private ttl: number; // Time-To-Live in milliseconds

  /**
   * @param storeName - Name of the cache store
   * @param ttl - Time-To-Live in milliseconds (default: 5 minutes)
   */
  constructor(storeName: string, ttl = 300000) {
    this.idbAdapter = new IndexedDBAdapter<CacheEntry<T>>(
      `cache-${storeName}`,
      storeName,
      1
    );
    this.ttl = ttl;
  }

  /**
   * Get cached data if not stale
   * @param key - Cache key
   * @returns Cached data or null if miss/stale
   */
  async get(key: string): Promise<T | null> {
    try {
      const entry = await this.idbAdapter.get(key);
      if (!entry) return null;

      // Check if stale
      if (Date.now() - entry.timestamp > this.ttl) {
        // Stale cache - remove and return null
        await this.idbAdapter.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache entry with current timestamp
   * @param key - Cache key
   * @param data - Data to cache
   * @param version - Version number for optimistic locking
   */
  async set(key: string, data: T, version: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version,
      };
      await this.idbAdapter.set(key, entry);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Manually invalidate a cache entry
   * @param key - Cache key to invalidate
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.idbAdapter.remove(key);
    } catch (error) {
      console.error(`Cache invalidate error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.idbAdapter.clear();
    } catch (error) {
      console.error("Cache clear error:", error);
      throw error;
    }
  }

  /**
   * List all cache keys
   */
  async list(): Promise<string[]> {
    try {
      return await this.idbAdapter.list();
    } catch (error) {
      console.error("Cache list error:", error);
      return [];
    }
  }

  /**
   * Get cache entry with metadata (timestamp, version)
   * Useful for debugging or advanced cache management
   */
  async getWithMetadata(key: string): Promise<CacheEntry<T> | null> {
    try {
      const entry = await this.idbAdapter.get(key);
      if (!entry) return null;

      // Check if stale
      if (Date.now() - entry.timestamp > this.ttl) {
        await this.idbAdapter.remove(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error(`Cache getWithMetadata error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if cache entry exists and is fresh
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get remaining TTL for a cache entry
   * @returns Milliseconds until expiry, or -1 if cache miss/stale
   */
  async getRemainingTTL(key: string): Promise<number> {
    try {
      const entry = await this.idbAdapter.get(key);
      if (!entry) return -1;

      const age = Date.now() - entry.timestamp;
      const remaining = this.ttl - age;

      return remaining > 0 ? remaining : -1;
    } catch (error) {
      console.error(`getRemainingTTL error for key ${key}:`, error);
      return -1;
    }
  }
}
