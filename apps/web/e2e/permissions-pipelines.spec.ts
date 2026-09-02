/**
 * E2E Tests — Phase 5: Pipeline Permission Gating
 *
 * Validates that pipeline page actions are correctly gated:
 * - "Trigger Pipeline" button visible only for roles with `pipeline:trigger`
 * - Pipeline page accessible for roles with `pipeline:view`
 * - Trigger modal interaction gated by permission
 *
 * Covers all 7 roles × 3 assertions = ~21 tests.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, waitForPageReady, assertVisible } from './helpers';
import {
  ALL_ROLES,
  Role,
  ROLE_LABELS,
  withRole,
  roleHasPermission,
  BASE_URL,
} from './helpers/role-fixtures';

const PIPELINES_URL = `${BASE_URL}/dashboard/pipelines`;

for (const role of ALL_ROLES) {
  const canView = roleHasPermission(role, 'pipeline:view');
  const canTrigger = roleHasPermission(role, 'pipeline:trigger');

  test.describe(`Pipelines Permissions — ${ROLE_LABELS[role]}`, () => {

    if (canView) {
      test('can access the Pipelines page', async ({ page }) => {
        await goto(page, withRole(PIPELINES_URL, role));
        await waitForPageReady(page);

        // Page should render the pipelines content (not an access denied card)
        const accessDenied = page.getByText('Access Denied');
        await expect(accessDenied).toHaveCount(0);

        // Page title or stat cards should be visible
        await assertVisible(page, 'Pipeline');
        await screenshot(page, `310-pipelines-access-${role}`);
      });

      if (canTrigger) {
        test('"Trigger Pipeline" button is visible', async ({ page }) => {
          await goto(page, withRole(PIPELINES_URL, role));
          await waitForPageReady(page);

          const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' }).first();
          await expect(triggerBtn).toBeVisible();
          await screenshot(page, `311-pipelines-trigger-visible-${role}`);
        });

        test('trigger modal opens when button is clicked', async ({ page }) => {
          await goto(page, withRole(PIPELINES_URL, role));
          await waitForPageReady(page);

          const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' }).first();
          await triggerBtn.click();

          await assertVisible(page, 'Trigger Pipeline Run');
          await screenshot(page, `312-pipelines-trigger-modal-${role}`);
        });
      } else {
        test('"Trigger Pipeline" button is hidden', async ({ page }) => {
          await goto(page, withRole(PIPELINES_URL, role));
          await waitForPageReady(page);

          const triggerBtn = page.locator('button').filter({ hasText: 'Trigger Pipeline' });
          await expect(triggerBtn).toHaveCount(0);
          await screenshot(page, `313-pipelines-trigger-hidden-${role}`);
        });
      }
    } else {
      test('pipeline page is not accessible via sidebar', async ({ page }) => {
        await goto(page, withRole(`${BASE_URL}/dashboard`, role));
        await waitForPageReady(page);

        const sidebar = page.locator('aside').first();
        const pipelinesLink = sidebar.getByText('Pipelines', { exact: true });
        await expect(pipelinesLink).toHaveCount(0);
        await screenshot(page, `314-pipelines-no-nav-${role}`);
      });
    }
  });
}
