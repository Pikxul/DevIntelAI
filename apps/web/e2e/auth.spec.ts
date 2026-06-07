import { test, expect } from '@playwright/test';

test.describe('Auth flow smoke tests', () => {
  test('signin page loads and shows GitHub button', async ({ page }) => {
    await page.goto('/auth/signin');

    // Title / logo should be visible
    await expect(page.locator('text=DevIntelAI')).toBeVisible();

    // GitHub sign-in button must exist and be enabled
    const githubBtn = page.locator('#signin-github-btn');
    await expect(githubBtn).toBeVisible();
    await expect(githubBtn).toBeEnabled();
    await expect(githubBtn).toContainText('Continue with GitHub');
  });

  test('unauthenticated /dashboard redirects to sign-in', async ({ page }) => {
    // Navigate directly to dashboard without a session
    await page.goto('/dashboard');

    // Should land on signin or NextAuth's signin endpoint
    await expect(page).toHaveURL(/auth\/signin|api\/auth\/signin/);
  });

  test('auth error page shows correct message for Configuration error', async ({ page }) => {
    await page.goto('/auth/error?error=Configuration');

    await expect(page.locator('text=Server Configuration Error')).toBeVisible();
    const tryAgainBtn = page.locator('#try-again-btn');
    await expect(tryAgainBtn).toBeVisible();
  });

  test('auth error page shows generic message for unknown error codes', async ({ page }) => {
    await page.goto('/auth/error?error=UnknownErrorCode');

    await expect(page.locator('text=Authentication Error')).toBeVisible();
    await expect(page.locator('#try-again-btn')).toBeVisible();
    await expect(page.locator('#go-home-btn')).toBeVisible();
  });

  test('try again button on error page links back to signin', async ({ page }) => {
    await page.goto('/auth/error?error=OAuthCallback');

    const tryAgainBtn = page.locator('#try-again-btn');
    const href = await tryAgainBtn.getAttribute('href');
    expect(href).toContain('/auth/signin');
  });
});
