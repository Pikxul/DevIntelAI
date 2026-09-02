/**
 * E2E Tests — Phase 5: Deployment Permission Gating
 *
 * Validates that deployment page actions are correctly gated:
 * - "Rollback" button visible only for roles with `deployment:rollback`
 * - Deployment page accessible for roles with `deployment:view`
 * - Refresh button available to all viewers
 *
 * Covers all 7 roles × 3 assertions = ~21 tests.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, waitForPageReady, assertVisible } from './helpers';
import {
  ALL_ROLES,
  ROLE_LABELS,
  withRole,
  roleHasPermission,
  BASE_URL,
} from './helpers/role-fixtures';

const DEPLOYMENTS_URL = `${BASE_URL}/dashboard/deployments`;

for (const role of ALL_ROLES) {
  const canView = roleHasPermission(role, 'deployment:view');
  const canRollback = roleHasPermission(role, 'deployment:rollback');

  test.describe(`Deployments Permissions — ${ROLE_LABELS[role]}`, () => {

    if (canView) {
      test('can access the Deployments page', async ({ page }) => {
        await goto(page, withRole(DEPLOYMENTS_URL, role));
        await waitForPageReady(page);

        // Should not show Access Denied
        const accessDenied = page.getByText('Access Denied');
        await expect(accessDenied).toHaveCount(0);

        await assertVisible(page, 'Deployment');
        await screenshot(page, `320-deployments-access-${role}`);
      });

      if (canRollback) {
        test('"Rollback" button is visible in action column', async ({ page }) => {
          await goto(page, withRole(DEPLOYMENTS_URL, role));
          await waitForPageReady(page);

          // Look for Rollback in the table Actions column or as button
          const rollbackBtn = page.locator('button').filter({ hasText: /Rollback/i });
          const rollbackCount = await rollbackBtn.count();

          // If there's data in the table, rollback should be present
          const tableRows = page.locator('table tbody tr');
          const rowCount = await tableRows.count();

          if (rowCount > 0) {
            expect(rollbackCount).toBeGreaterThan(0);
          }
          await screenshot(page, `321-deployments-rollback-visible-${role}`);
        });
      } else {
        test('"Rollback" button is hidden', async ({ page }) => {
          await goto(page, withRole(DEPLOYMENTS_URL, role));
          await waitForPageReady(page);

          const rollbackBtn = page.locator('button').filter({ hasText: /Rollback/i });
          await expect(rollbackBtn).toHaveCount(0);
          await screenshot(page, `322-deployments-rollback-hidden-${role}`);
        });
      }

      test('Refresh button is visible (read-only action)', async ({ page }) => {
        await goto(page, withRole(DEPLOYMENTS_URL, role));
        await waitForPageReady(page);

        const refreshBtn = page.locator('button').filter({ hasText: 'Refresh' }).first();
        await expect(refreshBtn).toBeVisible();
        await screenshot(page, `323-deployments-refresh-${role}`);
      });
    } else {
      test('deployment page is not accessible via sidebar', async ({ page }) => {
        await goto(page, withRole(`${BASE_URL}/dashboard`, role));
        await waitForPageReady(page);

        const sidebar = page.locator('aside').first();
        const deploymentsLink = sidebar.getByText('Deployments', { exact: true });
        await expect(deploymentsLink).toHaveCount(0);
        await screenshot(page, `324-deployments-no-nav-${role}`);
      });
    }
  });
}
