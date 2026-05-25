/**
 * E2E Tests — Sign-in Page (/auth/signin)
 *
 * Covers: page rendering, Google button, dev-user button, logo, form elements.
 * Note: actual OAuth flow is not tested (would require real credentials).
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible } from './helpers';

test.describe('Sign-in Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, 'http://localhost:3000/auth/signin');
  });

  test('page renders correctly', async ({ page }) => {
    // Logo
    const logoText = page.getByText(/DevIntelAI|DevIntel.*AI/i).first();
    await expect(logoText).toBeVisible();
    await screenshot(page, '20-signin-full');
  });

  test('welcome heading is shown', async ({ page }) => {
    await assertVisible(page, 'Welcome back');
    await assertVisible(page, 'Sign in to access your AI DevOps dashboard');
    await screenshot(page, '21-signin-heading');
  });

  test('Google sign-in button is visible', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleBtn).toBeVisible();
    await screenshot(page, '22-signin-google-btn');
  });

  test('"Continue as Dev User" button is visible', async ({ page }) => {
    const devBtn = page.getByRole('button', { name: /Continue as Dev User/i });
    await expect(devBtn).toBeVisible();
    await screenshot(page, '23-signin-dev-btn');
  });

  test('terms of service text is displayed', async ({ page }) => {
    await assertVisible(page, 'terms of service');
    await screenshot(page, '24-signin-terms');
  });
});
