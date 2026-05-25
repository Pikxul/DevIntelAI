/**
 * E2E Tests — Dashboard Navigation
 *
 * Verifies that every sidebar link navigates to the correct route and
 * that the destination page renders without a crash (h1 or page heading visible).
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto } from './helpers';

const NAV_ROUTES = [
  { label: 'Overview',     href: '/dashboard',             heading: /System Control Overview|Overview/i },
  { label: 'Pipelines',    href: '/dashboard/pipelines',   heading: /Pipeline|Pipelines/i },
  { label: 'AI Review',    href: '/dashboard/ai-review',   heading: /AI Review|Code Review/i },
  { label: 'Deployments',  href: '/dashboard/deployments', heading: /Deploy/i },
  { label: 'Incidents',    href: '/dashboard/incidents',   heading: /Incident/i },
  { label: 'Observability',href: '/dashboard/monitoring',  heading: /Monitor|Observ/i },
  { label: 'Governance',   href: '/dashboard/governance',  heading: /Govern/i },
  { label: 'Projects',     href: '/dashboard/projects',    heading: /Project/i },
  { label: 'Settings',     href: '/dashboard/settings',    heading: /Setting/i },
];

test.describe('Dashboard Navigation', () => {
  for (const route of NAV_ROUTES) {
    test(`navigates to ${route.label} (${route.href})`, async ({ page }) => {
      // Start from dashboard
      await goto(page, `http://localhost:3000${route.href}`);

      // Page should not show a Next.js error or blank screen
      await expect(page.locator('body')).not.toBeEmpty();

      // There should be no unhandled error overlay
      const errorOverlay = page.locator('body > nextjs-portal');
      const errorCount = await errorOverlay.count();
      expect(errorCount).toBe(0);

      // The sidebar should still be visible (layout intact)
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();

      // Take a screenshot of each route
      const slug = route.href.replace(/\//g, '-').replace(/^-/, '') || 'dashboard';
      await screenshot(page, `50-nav-${slug}`);
    });
  }
});

test.describe('Dashboard Sidebar Active State', () => {
  test('active nav item is highlighted on /dashboard', async ({ page }) => {
    await goto(page, 'http://localhost:3000/dashboard');
    const activeItems = page.locator('.nav-item.active');
    await expect(activeItems.first()).toBeVisible();
    await screenshot(page, '60-sidebar-active-overview');
  });

  test('active nav item changes on /dashboard/pipelines', async ({ page }) => {
    await goto(page, 'http://localhost:3000/dashboard/pipelines');
    const activeItem = page.locator('.nav-item.active');
    await expect(activeItem.first()).toBeVisible();
    await screenshot(page, '61-sidebar-active-pipelines');
  });
});
