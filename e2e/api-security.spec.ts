import { test, expect } from '@playwright/test';

/**
 * API security tests.
 * Verify that all mutation endpoints reject unauthenticated requests
 * and return sanitised error messages (never leak internal details).
 */

test.describe('API mutation endpoints require auth', () => {
  const mutationEndpoints = [
    { method: 'POST', path: '/api/reports/test-org' },
    { method: 'POST', path: '/api/scenarios' },
    { method: 'POST', path: '/api/budget/test-org' },
    { method: 'POST', path: '/api/kpi/test-org' },
    { method: 'POST', path: '/api/modules/test-org/activate' },
    { method: 'POST', path: '/api/vault/test-org' },
    { method: 'POST', path: '/api/playbook/assess/test-org' },
    { method: 'POST', path: '/api/interview/test-org/message' },
  ];

  for (const { method, path } of mutationEndpoints) {
    test(`${method} ${path} rejects unauthenticated requests`, async ({ request }) => {
      const response = await request.fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({}),
      });

      // Should be 401/403, definitely not 500
      expect(response.status()).not.toBe(500);
      expect([401, 403, 400]).toContain(response.status());
    });
  }
});

test.describe('API error responses are sanitised', () => {
  test('error responses do not leak stack traces', async ({ request }) => {
    const response = await request.post('/api/scenarios', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ invalid: true }),
    });

    const body = await response.text();

    // Should never contain stack trace indicators
    expect(body).not.toContain('at Object.');
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('.ts:');
    expect(body).not.toContain('Error:');
    // Should not expose internal file paths
    expect(body).not.toContain('/Users/');
    expect(body).not.toContain('src/');
  });
});

test.describe('Rate limiting headers', () => {
  test('LLM endpoints include rate limit headers when accessible', async ({ request }) => {
    const response = await request.get('/api/narrative/test-org');

    // Even on auth failure, if the rate limiter runs first we might get headers
    // This is a best-effort check
    const status = response.status();
    if (status === 429) {
      expect(response.headers()['retry-after']).toBeTruthy();
      expect(response.headers()['x-ratelimit-limit']).toBeTruthy();
    }
    // Should never be 500
    expect(status).not.toBe(500);
  });
});

test.describe('Input validation', () => {
  test('malformed JSON is rejected gracefully', async ({ request }) => {
    const response = await request.post('/api/scenarios', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json{{{',
    });

    expect(response.status()).not.toBe(500);
  });

  test('XSS payloads in body are not reflected', async ({ request }) => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await request.post('/api/vault/test-org', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ title: xssPayload }),
    });

    const body = await response.text();
    // The raw script tag should not appear unescaped in the response
    expect(body).not.toContain('<script>alert("xss")</script>');
  });
});
