/**
 * Data Caching Layer
 * Cache frequently accessed data for performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
export const cache = new Cache();

// Clean up expired entries periodically
if (typeof window !== "undefined") {
  setInterval(() => {
    cache.clearExpired();
  }, 60 * 1000); // Every minute
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  deals: () => "deals",
  deal: (id: string) => `deal:${id}`,
  dealScore: (id: string, updatedAt: string) => `deal-score:${id}:${updatedAt}`,
  analyses: () => "analyses",
  analysis: (id: string) => `analysis:${id}`,
  notes: () => "notes",
  note: (id: string) => `note:${id}`,
  marketData: (market: string) => `market:${market}`,
  comps: (market: string) => `comps:${market}`,
};

/**
 * Cache wrapper for async functions
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  
  if (cached !== null) {
    return cached;
  }

  const data = await fn();
  cache.set(key, data, ttl);
  
  return data;
}

/**
 * Invalidate cache by pattern
 */
export function invalidatePattern(pattern: string): void {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  
  for (const key of keys) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

