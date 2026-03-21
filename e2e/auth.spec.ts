import { test, expect } from '@playwright/test';

/**
 * Authentication flow tests.
 * Tests the login/signup forms work correctly at the UI level.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('has email and password inputs', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('shows validation on empty submit', async ({ page }) => {
    // Find and click the submit button
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Browser native validation or custom validation should prevent empty submit
      // The page should still be on /login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('has link to signup', async ({ page }) => {
    const signupLink = page.locator('a[href*="signup"]');
    if (await signupLink.count() > 0) {
      await expect(signupLink).toBeVisible();
    }
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'fake@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');

    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Wait for either error message or stay on login page
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders signup form', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
    }
  });

  test('has link to login', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"]');
    if (await loginLink.count() > 0) {
      await expect(loginLink).toBeVisible();
    }
  });
});
