import { describe, it, expect, vi } from 'vitest';

// We test the rate limiter's core logic. Since it returns NextResponse on limit,
// and null on success, we can test the boundary behavior.
// We need to mock NextResponse since it's a Next.js dependency.
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status,
      headers: init?.headers,
    }),
  },
}));

import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.check('user-1')).toBeNull();
    expect(limiter.check('user-1')).toBeNull();
    expect(limiter.check('user-1')).toBeNull();
  });

  it('blocks requests exceeding the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.check('user-1');
    limiter.check('user-1');
    const result = limiter.check('user-1');
    expect(result).not.toBeNull();
    expect((result as any).status).toBe(429);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check('user-1')).toBeNull();
    expect(limiter.check('user-2')).toBeNull();
    // user-1 is now limited
    expect(limiter.check('user-1')).not.toBeNull();
    // user-2 is also limited
    expect(limiter.check('user-2')).not.toBeNull();
  });

  it('returns correct remaining count', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
    expect(limiter.remaining('user-1')).toBe(5);
    limiter.check('user-1');
    expect(limiter.remaining('user-1')).toBe(4);
    limiter.check('user-1');
    limiter.check('user-1');
    expect(limiter.remaining('user-1')).toBe(2);
  });

  it('returns 0 remaining when at limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.check('user-1');
    limiter.check('user-1');
    expect(limiter.remaining('user-1')).toBe(0);
  });

  it('includes correct headers on 429 response', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check('org-abc');
    const result = limiter.check('org-abc') as any;
    expect(result).not.toBeNull();
    expect(result.headers['X-RateLimit-Limit']).toBe('1');
    expect(result.headers['X-RateLimit-Remaining']).toBe('0');
    expect(result.headers['Retry-After']).toBeDefined();
  });

  it('includes error message in body', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check('org-abc');
    const result = limiter.check('org-abc') as any;
    expect(result.body.error).toContain('Too many requests');
  });

  it('returns max remaining for unknown keys', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
    expect(limiter.remaining('never-seen')).toBe(10);
  });
});
