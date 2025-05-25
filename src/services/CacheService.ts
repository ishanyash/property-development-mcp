interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
  }
  
  export class CacheService {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly defaultTTL: number;
    private readonly maxSize: number;
    private cleanupInterval: NodeJS.Timeout;
  
    constructor(
      defaultTTLMinutes: number = 30,
      maxSize: number = 1000
    ) {
      this.defaultTTL = defaultTTLMinutes * 60 * 1000; // Convert to milliseconds
      this.maxSize = maxSize;
      
      // Setup periodic cleanup every 5 minutes
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  
    /**
     * Store data in cache with optional TTL
     */
    set(key: string, data: any, ttlMinutes?: number): void {
      const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
      const now = Date.now();
      
      // If cache is at max size, remove oldest entries
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }
      
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now
      });
    }
  
    /**
     * Retrieve data from cache
     */
    get(key: string): any | null {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null;
      }
  
      const now = Date.now();
      
      // Check if entry has expired
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return null;
      }
  
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = now;
      
      return entry.data;
    }
  
    /**
     * Check if key exists in cache (without retrieving)
     */
    has(key: string): boolean {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }
  
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return false;
      }
  
      return true;
    }
  
    /**
     * Remove specific key from cache
     */
    delete(key: string): boolean {
      return this.cache.delete(key);
    }
  
    /**
     * Clear all cache entries
     */
    clear(): void {
      this.cache.clear();
    }
  
    /**
     * Get cache statistics
     */
    getStats(): {
      size: number;
      maxSize: number;
      hitRate: number;
      entries: Array<{
        key: string;
        size: number;
        age: number;
        accessCount: number;
        lastAccessed: string;
      }>;
    } {
      const now = Date.now();
      const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        size: this.estimateSize(entry.data),
        age: Math.round((now - entry.timestamp) / 1000), // Age in seconds
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString()
      }));
  
      // Calculate hit rate (rough approximation)
      const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
      const hitRate = totalAccesses > 0 ? (totalAccesses / (totalAccesses + entries.length)) * 100 : 0;
  
      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        hitRate: Math.round(hitRate),
        entries: entries.sort((a, b) => b.accessCount - a.accessCount) // Sort by most accessed
      };
    }
  
    /**
     * Remove expired entries from cache
     */
    private cleanup(): void {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => this.cache.delete(key));
      
      if (expiredKeys.length > 0) {
        console.log(`Cache cleanup: Removed ${expiredKeys.length} expired entries`);
      }
    }
  
    /**
     * Remove oldest/least accessed entries when cache is full
     */
    private evictOldest(): void {
      // Sort entries by last accessed time and access count
      const entries = Array.from(this.cache.entries())
        .map(([key, entry]) => ({ key, entry }))
        .sort((a, b) => {
          // First sort by access count (ascending)
          if (a.entry.accessCount !== b.entry.accessCount) {
            return a.entry.accessCount - b.entry.accessCount;
          }
          // Then by last accessed time (ascending)
          return a.entry.lastAccessed - b.entry.lastAccessed;
        });
  
      // Remove oldest 10% of entries
      const toRemove = Math.max(1, Math.floor(this.maxSize * 0.1));
      
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i].key);
      }
    }
  
    /**
     * Estimate memory size of cached data
     */
    private estimateSize(data: any): number {
      try {
        return JSON.stringify(data).length * 2; // Rough byte estimate
      } catch {
        return 0;
      }
    }
  
    /**
     * Get cache keys matching a pattern
     */
    getKeys(pattern?: string): string[] {
      const keys = Array.from(this.cache.keys());
      
      if (!pattern) {
        return keys;
      }
      
      const regex = new RegExp(pattern, 'i');
      return keys.filter(key => regex.test(key));
    }
  
    /**
     * Set multiple entries at once
     */
    setMultiple(entries: Array<{key: string, data: any, ttlMinutes?: number}>): void {
      entries.forEach(entry => {
        this.set(entry.key, entry.data, entry.ttlMinutes);
      });
    }
  
    /**
     * Get multiple entries at once
     */
    getMultiple(keys: string[]): {[key: string]: any} {
      const result: {[key: string]: any} = {};
      
      keys.forEach(key => {
        const value = this.get(key);
        if (value !== null) {
          result[key] = value;
        }
      });
      
      return result;
    }
  
    /**
     * Refresh TTL for a specific key
     */
    refresh(key: string, ttlMinutes?: number): boolean {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }
      
      const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
      entry.timestamp = Date.now();
      entry.ttl = ttl;
      
      return true;
    }
  
    /**
     * Get or set pattern - retrieve from cache or execute function if not cached
     */
    async getOrSet<T>(
      key: string, 
      fn: () => Promise<T>, 
      ttlMinutes?: number
    ): Promise<T> {
      const cached = this.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await fn();
      this.set(key, result, ttlMinutes);
      
      return result;
    }
  
    /**
     * Destroy cache service and cleanup resources
     */
    destroy(): void {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      this.clear();
    }
  }