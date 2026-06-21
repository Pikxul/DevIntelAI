/**
 * E2E Tests — Pipelines Page (/dashboard/pipelines)
 *
 * Covers: page title, stat cards, filter tabs, trigger pipeline modal,
 *         refresh button, and pipeline table / empty state.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady } from './helpers';

const PIPELINES_URL = 'http://localhost:3000/dashboard/pipelines';

test.describe('Pipelines Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, PIPELINES_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Pipeline Runs/i);
    await screenshot(page, '100-pipelines-title');
  });

  test('page subtitle is visible', async ({ page }) => {
    await assertVisible(page, 'Full CI/CD pipeline history');
    await screenshot(page, '101-pipelines-subtitle');
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────
  test('stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, ['Total Runs', 'Success', 'Failed', 'Running', 'Success Rate']);
    await screenshot(page, '102-pipelines-stat-cards');
  });

  // ── Filter Tabs ───────────────────────────────────────────────────────────
  test('filter tabs are visible', async ({ page }) => {
    const filterLabels = ['All', 'Success', 'Running', 'Failed', 'Blocked'];
    for (const label of filterLabels) {
      await expect(
        page.locator('button').filter({ hasText: label }).first()
      ).toBeVisible();
    }
    await screenshot(page, '103-pipelines-filters');
  });

  test('clicking a filter tab changes active state', async ({ page }) => {
    const failedBtn = page.locator('button').filter({ hasText: 'Failed' }).first();
    await failedBtn.click();
    await expect(failedBtn).toHaveClass(/btn-primary/);
    await screenshot(page, '104-pipelines-filter-active');
  });

  // ── Action Buttons ────────────────────────────────────────────────────────
  test('Refresh button is visible', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' }).first();
    await expect(refreshBtn).toBeVisible();
  });

  test('Trigger Pipeline button is visible', async ({ page }) => {
    const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' }).first();
    await expect(triggerBtn).toBeVisible();
  });

  // ── Trigger Pipeline Modal ────────────────────────────────────────────────
  test('trigger modal opens and shows form fields', async ({ page }) => {
    const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' }).first();
    await triggerBtn.click();

    await assertVisible(page, 'Trigger Pipeline Run');
    await assertVisible(page, 'Branch');
    await assertVisible(page, 'Commit Message');
    await screenshot(page, '105-pipelines-trigger-modal');
  });

  test('trigger modal can be closed', async ({ page }) => {
    const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' }).first();
    await triggerBtn.click();

    await assertVisible(page, 'Trigger Pipeline Run');

    // Close via ✕ button
    const closeBtn = page.locator('button').filter({ hasText: '✕' }).first();
    await closeBtn.click();

    await expect(page.getByText('Trigger Pipeline Run')).not.toBeVisible({ timeout: 3000 });
    await screenshot(page, '106-pipelines-trigger-modal-closed');
  });

  // ── Table / Empty State ───────────────────────────────────────────────────
  test('pipeline table or empty state is shown', async ({ page }) => {
    // Either a table with rows or an empty state message should be visible
    const table = page.locator('table');
    const emptyState = page.getByText(/No pipeline runs yet|No .* pipelines/i);

    const hasTable = await table.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasTable || hasEmpty).toBeTruthy();
    await screenshot(page, '107-pipelines-content');
  });

  test('pipeline table has expected columns when data present', async ({ page }) => {
    const tableHeader = page.locator('table thead');
    const headerCount = await tableHeader.count();

    if (headerCount > 0) {
      const columnHeaders = ['Project', 'Branch', 'Commit', 'Status'];
      for (const col of columnHeaders) {
        await expect(tableHeader.getByText(col, { exact: false }).first()).toBeVisible();
      }
    }
    await screenshot(page, '108-pipelines-table-columns');
  });
});
