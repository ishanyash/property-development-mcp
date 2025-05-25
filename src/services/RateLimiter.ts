interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (identifier: string) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }
  
  interface RequestRecord {
    timestamp: number;
    success: boolean;
  }
  
  export class RateLimiter {
    private requests: Map<string, RequestRecord[]> = new Map();
    private config: Required<RateLimitConfig>;
    private cleanupInterval: NodeJS.Timeout;
  
    constructor(
      maxRequests: number = 60,
      windowMs: number = 60000, // 1 minute
      options: Partial<RateLimitConfig> = {}
    ) {
      this.config = {
        windowMs,
        maxRequests,
        keyGenerator: (id: string) => id,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        ...options
      };
  
      // Clean up old records every minute
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, Math.min(this.config.windowMs, 60000));
    }
  
    /**
     * Check if a request can be made for the given identifier
     */
    canMakeRequest(identifier: string): boolean {
      const key = this.config.keyGenerator(identifier);
      const now = Date.now();
      const requests = this.getValidRequests(key, now);
      
      return requests.length < this.config.maxRequests;
    }
  
    /**
     * Record a request attempt
     */
    recordRequest(identifier: string, success: boolean = true): boolean {
      const key = this.config.keyGenerator(identifier);
      const now = Date.now();
      
      // Check if request is allowed
      if (!this.canMakeRequest(identifier)) {
        return false;
      }
  
      // Skip recording based on configuration
      if (success && this.config.skipSuccessfulRequests) {
        return true;
      }
      
      if (!success && this.config.skipFailedRequests) {
        return true;
      }
  
      // Record the request
      const requests = this.requests.get(key) || [];
      requests.push({
        timestamp: now,
        success
      });
      
      this.requests.set(key, requests);
      return true;
    }
  
    /**
     * Get the number of requests remaining for an identifier
     */
    getRemainingRequests(identifier: string): number {
      const key = this.config.keyGenerator(identifier);
      const now = Date.now();
      const requests = this.getValidRequests(key, now);
      
      return Math.max(0, this.config.maxRequests - requests.length);
    }
  
    /**
     * Get the time until the rate limit resets (in milliseconds)
     */
    getResetTime(identifier: string): number {
      const key = this.config.keyGenerator(identifier);
      const requests = this.requests.get(key) || [];
      
      if (requests.length === 0) {
        return 0;
      }
  
      const oldestRequest = Math.min(...requests.map(r => r.timestamp));
      const resetTime = oldestRequest + this.config.windowMs;
      
      return Math.max(0, resetTime - Date.now());
    }
  
    /**
     * Get rate limit status for an identifier
     */
    getStatus(identifier: string): {
      limit: number;
      remaining: number;
      resetTime: number;
      resetTimeMs: number;
    } {
      const remaining = this.getRemainingRequests(identifier);
      const resetTimeMs = this.getResetTime(identifier);
      
      return {
        limit: this.config.maxRequests,
        remaining,
        resetTime: Math.ceil(resetTimeMs / 1000), // Convert to seconds
        resetTimeMs
      };
    }
  
    /**
     * Reset rate limit for a specific identifier
     */
    reset(identifier: string): void {
      const key = this.config.keyGenerator(identifier);
      this.requests.delete(key);
    }
  
    /**
     * Reset all rate limits
     */
    resetAll(): void {
      this.requests.clear();
    }
  
    /**
     * Get valid requests within the current window
     */
    private getValidRequests(key: string, now: number): RequestRecord[] {
      const requests = this.requests.get(key) || [];
      const validRequests = requests.filter(
        request => now - request.timestamp < this.config.windowMs
      );
      
      // Update the stored requests to only include valid ones
      if (validRequests.length !== requests.length) {
        if (validRequests.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, validRequests);
        }
      }
      
      return validRequests;
    }
  
    /**
     * Clean up expired requests
     */
    private cleanup(): void {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      for (const [key, requests] of this.requests.entries()) {
        const validRequests = requests.filter(
          request => now - request.timestamp < this.config.windowMs
        );
        
        if (validRequests.length === 0) {
          keysToDelete.push(key);
        } else if (validRequests.length !== requests.length) {
          this.requests.set(key, validRequests);
        }
      }
      
      keysToDelete.forEach(key => this.requests.delete(key));
    }
  
    /**
     * Get statistics about rate limiting
     */
    getStats(): {
      totalKeys: number;
      totalRequests: number;
      avgRequestsPerKey: number;
      topUsers: Array<{
        key: string;
        requests: number;
        successRate: number;
      }>;
    } {
      const now = Date.now();
      const stats = {
        totalKeys: this.requests.size,
        totalRequests: 0,
        avgRequestsPerKey: 0,
        topUsers: [] as Array<{
          key: string;
          requests: number;
          successRate: number;
        }>
      };
  
      const userStats: Array<{
        key: string;
        requests: number;
        successRate: number;
      }> = [];
  
      for (const [key, requests] of this.requests.entries()) {
        const validRequests = this.getValidRequests(key, now);
        const successfulRequests = validRequests.filter(r => r.success).length;
        
        stats.totalRequests += validRequests.length;
        
        if (validRequests.length > 0) {
          userStats.push({
            key,
            requests: validRequests.length,
            successRate: (successfulRequests / validRequests.length) * 100
          });
        }
      }
  
      stats.avgRequestsPerKey = stats.totalKeys > 0 ? 
        Math.round(stats.totalRequests / stats.totalKeys) : 0;
  
      stats.topUsers = userStats
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);
  
      return stats;
    }
  
    /**
     * Create a middleware function for Express-like frameworks
     */
    middleware() {
      return (req: any, res: any, next: any) => {
        const identifier = req.ip || req.connection.remoteAddress || 'unknown';
        
        if (!this.canMakeRequest(identifier)) {
          const status = this.getStatus(identifier);
          
          res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(status.resetTimeMs / 1000)} seconds.`,
            retryAfter: status.resetTime
          });
          
          return;
        }
  
        // Record the request (we'll mark it as successful by default)
        this.recordRequest(identifier, true);
        
        // Add rate limit headers
        const status = this.getStatus(identifier);
        res.setHeader('X-RateLimit-Limit', status.limit);
        res.setHeader('X-RateLimit-Remaining', status.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + status.resetTime);
        
        next();
      };
    }
  
    /**
     * Destroy the rate limiter and cleanup resources
     */
    destroy(): void {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      this.resetAll();
    }
  }