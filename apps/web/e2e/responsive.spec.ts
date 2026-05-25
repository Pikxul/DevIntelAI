/**
 * E2E Tests — Responsiveness & Mobile Layout
 *
 * Tests the app at mobile viewport to verify the mobile bottom nav appears,
 * the hamburger button opens the sidebar, and the AI panel slides up from bottom.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible } from './helpers';

const MOBILE_VIEWPORT = { width: 375, height: 812 }; // iPhone 13

test.describe('Mobile Layout', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await goto(page, 'http://localhost:3000/dashboard');
  });

  test('mobile bottom navigation is visible', async ({ page }) => {
    const mobileNav = page.locator('.mobile-bottom-nav');
    await expect(mobileNav).toBeVisible();
    await screenshot(page, '70-mobile-bottom-nav');
  });

  test('hamburger button is visible on mobile', async ({ page }) => {
    const hamburger = page.getByRole('button', { name: /Toggle navigation/i });
    await expect(hamburger).toBeVisible();
    await screenshot(page, '71-mobile-hamburger');
  });

  test('sidebar opens when hamburger is clicked', async ({ page }) => {
    const hamburger = page.getByRole('button', { name: /Toggle navigation/i });
    await hamburger.click();

    const sidebar = page.locator('aside.open');
    await expect(sidebar).toBeVisible();
    await screenshot(page, '72-mobile-sidebar-open');
  });

  test('sidebar closes when overlay is clicked', async ({ page }) => {
    const hamburger = page.getByRole('button', { name: /Toggle navigation/i });
    await hamburger.click();

    const overlay = page.locator('.sidebar-overlay.active');
    await expect(overlay).toBeVisible();
    await overlay.click();

    await expect(page.locator('aside.open')).not.toBeVisible({ timeout: 2000 });
    await screenshot(page, '73-mobile-sidebar-closed');
  });

  test('AI panel slides up from bottom on mobile', async ({ page }) => {
    const aiBtn = page.getByRole('button', { name: /Toggle AI Assistant/i });
    await aiBtn.click();

    await assertVisible(page, 'DevIntel AI Copilot');
    await screenshot(page, '74-mobile-ai-panel');
  });
});

test.describe('Tablet Layout', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('dashboard renders correctly at tablet size', async ({ page }) => {
    await goto(page, 'http://localhost:3000/dashboard');
    await expect(page.locator('body')).not.toBeEmpty();
    await screenshot(page, '80-tablet-dashboard');
  });
});

test.describe('Desktop Layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dashboard renders correctly at large desktop size', async ({ page }) => {
    await goto(page, 'http://localhost:3000/dashboard');
    await expect(page.locator('body')).not.toBeEmpty();
    await screenshot(page, '81-desktop-1440-dashboard');
  });
});
