import { NextResponse } from 'next/server';

/**
 * In-memory sliding window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless).
 * For multi-instance: swap to Upstash Redis (@upstash/ratelimit).
 *
 * Usage in API routes:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const limited = limiter.check(userId);
 *   if (limited) return limited; // Returns 429 response
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
}

interface RequestRecord {
  timestamps: number[];
}

/**
 * Create a rate limiter instance with specific config.
 * Each instance maintains its own request tracking map.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const requests = new Map<string, RequestRecord>();

  // Periodic cleanup to prevent memory leaks (every 5 minutes)
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, record] of requests.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < config.windowMs);
      if (record.timestamps.length === 0) {
        requests.delete(key);
      }
    }
  }

  return {
    /**
     * Check rate limit for a given key (userId, IP, etc.).
     * Returns null if within limits, or a 429 NextResponse if exceeded.
     */
    check(key: string): NextResponse | null {
      cleanup();
      const now = Date.now();
      const record = requests.get(key) || { timestamps: [] };

      // Remove expired timestamps
      record.timestamps = record.timestamps.filter((t) => now - t < config.windowMs);

      if (record.timestamps.length >= config.max) {
        const retryAfterMs = record.timestamps[0] + config.windowMs - now;
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);

        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSec),
              'X-RateLimit-Limit': String(config.max),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil((now + retryAfterMs) / 1000)),
            },
          }
        );
      }

      // Record this request
      record.timestamps.push(now);
      requests.set(key, record);

      return null; // Within limits
    },

    /** Get remaining requests for a key */
    remaining(key: string): number {
      const now = Date.now();
      const record = requests.get(key);
      if (!record) return config.max;
      const active = record.timestamps.filter((t) => now - t < config.windowMs);
      return Math.max(0, config.max - active.length);
    },
  };
}

// Pre-configured limiters for different endpoint types
// LLM endpoints: expensive Claude API calls — 10 req/min
export const llmLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

// Sync endpoints: expensive Xero API calls — 3 req/min
export const syncLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

// Auth endpoints: prevent brute force — 5 req/min
export const authLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// General mutation endpoints — 30 req/min
export const mutationLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
