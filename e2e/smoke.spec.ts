import { test, expect } from '@playwright/test';

/**
 * Smoke tests for Advisory OS.
 * These verify that all major pages load without crashing.
 * They don't require authentication — they check that
 * unauthenticated users are redirected to /login.
 */

test.describe('Public pages', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    // Should either show landing page or redirect to login
    await expect(page).toHaveURL(/\/(login)?$/);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
    // Should have some form of login UI
    const hasEmailInput = await page.locator('input[type="email"]').count();
    const hasText = await page.locator('text=/sign in|log in|email/i').count();
    expect(hasEmailInput + hasText).toBeGreaterThan(0);
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Protected pages redirect to login', () => {
  const protectedRoutes = [
    '/dashboard',
    '/financials',
    '/intelligence',
    '/kpi',
    '/variance',
    '/scenarios',
    '/reports',
    '/playbook',
    '/modules',
    '/settings',
    '/vault',
    '/audit',
    '/interview',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe('API health checks', () => {
  test('API routes return proper status codes without auth', async ({ request }) => {
    // These should return 401/403 without auth, not 500
    const routes = [
      '/api/notifications',
    ];

    for (const route of routes) {
      const response = await request.get(route);
      // Should NOT be 500 (internal server error)
      expect(response.status()).not.toBe(500);
    }
  });
});

test.describe('Static assets', () => {
  test('favicon exists', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    // May be 200 or 404 depending on setup, but shouldn't be 500
    expect(response.status()).not.toBe(500);
  });
});
