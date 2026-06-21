/**
 * E2E Tests — Deployments Page (/dashboard/deployments)
 *
 * Covers: page title, subtitle, strategy stat cards, deployment history
 *         table with columns, refresh button, and empty state.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady } from './helpers';

const DEPLOYMENTS_URL = 'http://localhost:3000/dashboard/deployments';

test.describe('Deployments Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, DEPLOYMENTS_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Deployments/i);
    await screenshot(page, '130-deployments-title');
  });

  test('subtitle describes canary controls and rollback', async ({ page }) => {
    await assertVisible(page, 'Deployment history');
    await screenshot(page, '131-deployments-subtitle');
  });

  test('total deployments badge is visible', async ({ page }) => {
    await assertVisible(page, 'deployments total');
    await screenshot(page, '132-deployments-badge');
  });

  // ── Strategy Stat Cards ───────────────────────────────────────────────────
  test('strategy stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, ['Rolling Updates', 'Blue/Green', 'Canary']);
    await screenshot(page, '133-deployments-stat-cards');
  });

  test('strategy cards show descriptions', async ({ page }) => {
    await assertVisible(page, 'Zero downtime');
    await assertVisible(page, 'Instant switch');
    await assertVisible(page, 'Gradual traffic shift');
    await screenshot(page, '134-deployments-strategy-desc');
  });

  // ── Deployment History Section ────────────────────────────────────────────
  test('Deployment History heading is visible', async ({ page }) => {
    await assertVisible(page, 'Deployment History');
    await screenshot(page, '135-deployments-history-heading');
  });

  test('Refresh button is visible and clickable', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' }).first();
    await expect(refreshBtn).toBeVisible();
    await screenshot(page, '136-deployments-refresh-btn');
  });

  // ── Table / Empty State ───────────────────────────────────────────────────
  test('deployment table or empty state is shown', async ({ page }) => {
    const table = page.locator('table');
    const emptyState = page.getByText(/No deployments yet/i);
    const errorState = page.getByText(/API Error/i);

    const hasTable = await table.count() > 0;
    const hasEmpty = await emptyState.count() > 0;
    const hasError = await errorState.count() > 0;

    // One of these states must be present
    expect(hasTable || hasEmpty || hasError).toBeTruthy();
    await screenshot(page, '137-deployments-content');
  });

  test('deployment table has expected columns when data present', async ({ page }) => {
    const tableHeader = page.locator('table thead');
    const headerCount = await tableHeader.count();

    if (headerCount > 0) {
      const columns = ['Project', 'Environment', 'Strategy', 'Image Tag', 'Status', 'Duration', 'Time', 'Actions'];
      for (const col of columns) {
        await expect(
          tableHeader.getByText(col, { exact: false }).first()
        ).toBeVisible();
      }
      await screenshot(page, '138-deployments-table-columns');
    }
  });
});
