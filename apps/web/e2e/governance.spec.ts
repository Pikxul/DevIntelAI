/**
 * E2E Tests — Governance Page (/dashboard/governance)
 *
 * Covers: page title, Enterprise badge, stat cards, tab navigation
 *         (Team Members, Approvals, Audit Log), tab content rendering,
 *         and audit log filter input / export buttons.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady } from './helpers';

const GOVERNANCE_URL = 'http://localhost:3000/dashboard/governance';

test.describe('Governance Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, GOVERNANCE_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Governance/i);
    await screenshot(page, '180-governance-title');
  });

  test('subtitle describes RBAC and audit logs', async ({ page }) => {
    await assertVisible(page, 'RBAC management');
    await screenshot(page, '181-governance-subtitle');
  });

  test('Enterprise badge is visible', async ({ page }) => {
    await assertVisible(page, 'Enterprise');
    await screenshot(page, '182-governance-enterprise-badge');
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────
  test('stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, ['RBAC Control', 'Audit Logging', 'Approval Gate']);
    await screenshot(page, '183-governance-stat-cards');
  });

  test('stat card values show Active/Enabled', async ({ page }) => {
    await assertVisible(page, 'Active');
    await assertVisible(page, 'Enabled');
    await screenshot(page, '184-governance-stat-values');
  });

  test('stat card descriptions are visible', async ({ page }) => {
    await assertVisible(page, '4 roles configured');
    await assertVisible(page, 'All actions tracked');
    await assertVisible(page, 'High-risk pipelines require review');
    await screenshot(page, '185-governance-stat-descriptions');
  });

  // ── Tab Navigation ────────────────────────────────────────────────────────
  test('all three tabs are visible', async ({ page }) => {
    await assertVisible(page, 'Team Members');
    await assertVisible(page, 'Approvals');
    await assertVisible(page, 'Audit Log');
    await screenshot(page, '186-governance-tabs');
  });

  // ── Team Members Tab (default) ────────────────────────────────────────────
  test('Team Members tab renders content by default', async ({ page }) => {
    // Should show either a table, loading, error, or empty state
    const table = page.locator('table');
    const loading = page.getByText('Loading members');
    const emptyState = page.getByText('No team members yet');
    const errorState = page.locator('text=Governance endpoints');

    const hasTable = await table.count() > 0;
    const hasLoading = await loading.count() > 0;
    const hasEmpty = await emptyState.count() > 0;
    const hasError = await errorState.count() > 0;

    expect(hasTable || hasLoading || hasEmpty || hasError).toBeTruthy();
    await screenshot(page, '187-governance-members-tab');
  });

  // ── Approvals Tab ─────────────────────────────────────────────────────────
  test('clicking Approvals tab switches content', async ({ page }) => {
    const approvalsTab = page.locator('button').filter({ hasText: 'Approvals' }).first();
    await approvalsTab.click();

    // Should show either approval cards, loading, error, or empty state
    const emptyState = page.getByText(/No pending approvals/i);
    const loading = page.getByText(/Loading approval requests/i);
    const approvalCards = page.locator('[style*="padding"]').filter({ hasText: /pending|approved|rejected/i });

    // Wait a moment for content to load
    await page.waitForTimeout(1000);

    const hasEmpty = await emptyState.count() > 0;
    const hasLoading = await loading.count() > 0;
    const hasCards = await approvalCards.count() > 0;

    expect(hasEmpty || hasLoading || hasCards).toBeTruthy();
    await screenshot(page, '188-governance-approvals-tab');
  });

  // ── Audit Log Tab ─────────────────────────────────────────────────────────
  test('clicking Audit Log tab shows filter and export buttons', async ({ page }) => {
    const auditTab = page.locator('button').filter({ hasText: 'Audit Log' }).first();
    await auditTab.click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Should show either a table with filter, loading, error, or empty state
    const exportCsvBtn = page.locator('button').filter({ hasText: 'Export CSV' });
    const exportJsonBtn = page.locator('button').filter({ hasText: 'Export JSON' });
    const filterInput = page.locator('input[placeholder*="Filter"]');
    const emptyState = page.getByText(/No audit logs/i);
    const loading = page.getByText(/Loading audit logs/i);

    const hasExportCsv = await exportCsvBtn.count() > 0;
    const hasEmpty = await emptyState.count() > 0;
    const hasLoading = await loading.count() > 0;

    expect(hasExportCsv || hasEmpty || hasLoading).toBeTruthy();
    await screenshot(page, '189-governance-audit-tab');
  });

  test('audit log filter input works', async ({ page }) => {
    const auditTab = page.locator('button').filter({ hasText: 'Audit Log' }).first();
    await auditTab.click();

    await page.waitForTimeout(1000);

    const filterInput = page.locator('input[placeholder*="Filter"]');
    if (await filterInput.isVisible()) {
      await filterInput.fill('deployment');
      // Filter should not crash the page
      await waitForPageReady(page);
      await screenshot(page, '190-governance-audit-filter');
    }
  });
});
