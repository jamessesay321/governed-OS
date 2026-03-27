/**
 * In-memory rate limiter for AI endpoints.
 *
 * Limits:
 *   - 50 AI calls per org per hour
 *   - 500 AI calls per org per day
 *
 * Stored in a process-local Map (no Redis required).
 * Timestamps are pruned on every check to keep memory bounded.
 */

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

type RateLimitHeaders = {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
};

const HOURLY_LIMIT = 50;
const DAILY_LIMIT = 500;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Each entry stores an array of timestamps (ms) when a call was made.
 * Key format: `${orgId}:${endpoint}`
 */
const callLog = new Map<string, number[]>();

/**
 * Remove timestamps older than `windowMs` from the list (mutates in place).
 */
function prune(timestamps: number[], windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  // Find first index within the window – timestamps are appended in order.
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) i++;
  if (i > 0) timestamps.splice(0, i);
}

/**
 * Check whether an AI call is allowed for the given org + endpoint.
 *
 * If allowed, the call is recorded automatically so the caller does not need
 * to call a separate `record` function.
 */
export function checkRateLimit(orgId: string, endpoint: string): RateLimitResult {
  const now = Date.now();
  const key = `${orgId}:${endpoint}`;

  let timestamps = callLog.get(key);
  if (!timestamps) {
    timestamps = [];
    callLog.set(key, timestamps);
  }

  // Prune entries older than 24 h (covers both windows).
  prune(timestamps, DAY_MS, now);

  // Count calls in each window.
  const hourCutoff = now - HOUR_MS;
  const hourCount = timestamps.filter((t) => t >= hourCutoff).length;
  const dayCount = timestamps.length; // already pruned to 24 h

  // Determine which limit is hit first.
  const hourRemaining = Math.max(0, HOURLY_LIMIT - hourCount);
  const dayRemaining = Math.max(0, DAILY_LIMIT - dayCount);

  const remaining = Math.min(hourRemaining, dayRemaining);

  // resetAt = whichever window resets sooner when exhausted.
  let resetAt: Date;
  if (hourRemaining === 0) {
    // Earliest hourly timestamp that would roll off
    const earliestInHour = timestamps.find((t) => t >= hourCutoff)!;
    resetAt = new Date(earliestInHour + HOUR_MS);
  } else if (dayRemaining === 0) {
    resetAt = new Date(timestamps[0] + DAY_MS);
  } else {
    // Not exhausted – reset is end of current hour window.
    resetAt = new Date(now + HOUR_MS);
  }

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Record this call.
  timestamps.push(now);

  return { allowed: true, remaining: remaining - 1, resetAt };
}

/**
 * Convert a `RateLimitResult` into HTTP response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': String(HOURLY_LIMIT),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}
