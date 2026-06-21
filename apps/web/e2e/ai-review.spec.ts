/**
 * E2E Tests — AI Review Page (/dashboard/ai-review)
 *
 * Covers: page title, header badges, KPI stat cards, scanner telemetry table,
 *         review row selection, vulnerability diagnostics panel, and action buttons.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady } from './helpers';

const AI_REVIEW_URL = 'http://localhost:3000/dashboard/ai-review';

test.describe('AI Review Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, AI_REVIEW_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /AI Static Code Analytics/i);
    await screenshot(page, '110-ai-review-title');
  });

  test('subtitle describes the page purpose', async ({ page }) => {
    await assertVisible(page, 'Automated risk scanning');
    await screenshot(page, '111-ai-review-subtitle');
  });

  test('header badges are visible', async ({ page }) => {
    await assertVisible(page, 'Gemini + Claude Active');
    await assertVisible(page, 'Ingested');
    await screenshot(page, '112-ai-review-badges');
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────
  test('KPI stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, [
      'Ingested Commits',
      'Auto-Approved',
      'Blocked Policy Gate',
      'Avg Risk Rating',
    ]);
    await screenshot(page, '113-ai-review-stat-cards');
  });

  // ── Scanner Telemetry Logs Table ──────────────────────────────────────────
  test('scanner telemetry logs section is visible', async ({ page }) => {
    await assertVisible(page, 'Scanner Telemetry Logs');
    await screenshot(page, '114-ai-review-telemetry-section');
  });

  test('telemetry table has expected columns', async ({ page }) => {
    const tableHeader = page.locator('table thead').first();
    await expect(tableHeader).toBeVisible({ timeout: 10_000 });

    const columns = ['Repo', 'Commit', 'Risk Rating', 'Decision'];
    for (const col of columns) {
      await expect(tableHeader.getByText(col, { exact: false }).first()).toBeVisible();
    }
    await screenshot(page, '115-ai-review-table-columns');
  });

  test('telemetry table has review rows', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await screenshot(page, '116-ai-review-table-rows');
  });

  // ── Vulnerability Diagnostics Panel ───────────────────────────────────────
  test('diagnostics panel is shown with review details', async ({ page }) => {
    // Wait for the diagnostics panel to be visible (auto-selects first or third review)
    await assertVisible(page, 'Vulnerability Diagnostics');
    await screenshot(page, '117-ai-review-diagnostics-panel');
  });

  test('diagnostics panel shows risk rating ring', async ({ page }) => {
    await assertVisible(page, 'Risk Rating');
    await screenshot(page, '118-ai-review-risk-ring');
  });

  test('diagnostics panel shows confidence and issues', async ({ page }) => {
    await assertVisible(page, 'Confidence Score');
    await assertVisible(page, 'Detected Issues');
    await assertVisible(page, 'Model scanning cost');
    await screenshot(page, '119-ai-review-diagnostics-details');
  });

  test('clicking a review row updates the diagnostics panel', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Click the first row
    await rows.first().click();

    // Diagnostics panel should still be visible
    await assertVisible(page, 'Vulnerability Diagnostics');
    await screenshot(page, '120-ai-review-row-click');
  });

  // ── Action Buttons ────────────────────────────────────────────────────────
  test('action buttons are rendered in diagnostics panel', async ({ page }) => {
    // Depending on whether the selected review is approved or blocked,
    // we should see either "Trigger Manual Block" or "Bypass & Approve"
    const blockBtn = page.locator('button').filter({ hasText: /Trigger Manual Block/i });
    const bypassBtn = page.locator('button').filter({ hasText: /Bypass & Approve/i });

    const hasBlock = await blockBtn.count() > 0;
    const hasBypass = await bypassBtn.count() > 0;

    expect(hasBlock || hasBypass).toBeTruthy();
    await screenshot(page, '121-ai-review-action-buttons');
  });

  // ── CVE Vulnerability Section ─────────────────────────────────────────────
  test('CVE vulnerability section is visible', async ({ page }) => {
    await assertVisible(page, 'CVE Vulnerability Ingestion');
    await screenshot(page, '122-ai-review-cve-section');
  });
});
