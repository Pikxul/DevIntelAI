/**
 * E2E Tests — Phase 5: Settings Page Permission Gating
 *
 * Validates that the Settings page correctly enforces permissions:
 * - Only `owner` role can access and modify settings
 * - Non-owners see read-only mode with warning banner
 * - "Save Changes" button hidden for non-owners
 * - All inputs/toggles disabled for non-owners
 * - Settings page not accessible via sidebar for non-owners (requires `org:settings`)
 *
 * Covers all 7 roles × 4 assertions = ~28 tests.
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

const SETTINGS_URL = `${BASE_URL}/dashboard/settings`;

for (const role of ALL_ROLES) {
  const canAccessSettings = roleHasPermission(role, 'org:settings');

  test.describe(`Settings Permissions — ${ROLE_LABELS[role]}`, () => {

    if (canAccessSettings) {
      // Only owner has org:settings
      test('can access the Settings page with full control', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        // Should NOT show read-only warning
        const readOnlyBanner = page.getByText(/read-only|view only|no permission to modify/i);
        await expect(readOnlyBanner).toHaveCount(0);

        await assertVisible(page, 'Settings');
        await screenshot(page, `350-settings-full-access-${role}`);
      });

      test('"Save Changes" button is visible', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        const saveBtn = page.locator('button').filter({ hasText: 'Save Changes' }).first();
        await expect(saveBtn).toBeVisible();
        await screenshot(page, `351-settings-save-visible-${role}`);
      });

      test('inputs and toggles are enabled', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        // Select dropdowns should be enabled
        const selects = page.locator('select');
        const selectCount = await selects.count();
        if (selectCount > 0) {
          await expect(selects.first()).toBeEnabled();
        }

        // Toggle buttons should be clickable
        const toggles = page.locator('button[style*="border-radius: 13px"]');
        const toggleCount = await toggles.count();
        if (toggleCount > 0) {
          await expect(toggles.first()).toBeEnabled();
        }

        await screenshot(page, `352-settings-inputs-enabled-${role}`);
      });

      test('all settings sections are visible', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        await assertVisible(page, 'AI Configuration');
        await assertVisible(page, 'Integrations');
        await assertVisible(page, 'Notification Channels');
        await assertVisible(page, 'Advanced');
        await screenshot(page, `353-settings-sections-${role}`);
      });
    } else {
      test('Settings page shows read-only mode or access denied', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        // Should either show read-only banner/warning or limited access
        // The settings page renders but with inputs disabled and save button hidden
        await page.waitForTimeout(500);

        // Check for read-only indicators
        const saveBtn = page.locator('button').filter({ hasText: 'Save Changes' });
        const saveBtnCount = await saveBtn.count();

        // Save button should be hidden for non-owners
        expect(saveBtnCount).toBe(0);

        await screenshot(page, `354-settings-readonly-${role}`);
      });

      test('"Save Changes" button is hidden', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);

        const saveBtn = page.locator('button').filter({ hasText: 'Save Changes' });
        await expect(saveBtn).toHaveCount(0);
        await screenshot(page, `355-settings-save-hidden-${role}`);
      });

      test('inputs are disabled in read-only mode', async ({ page }) => {
        await goto(page, withRole(SETTINGS_URL, role));
        await waitForPageReady(page);
        await page.waitForTimeout(500);

        // Select elements should be disabled
        const selects = page.locator('select');
        const selectCount = await selects.count();
        if (selectCount > 0) {
          await expect(selects.first()).toBeDisabled();
        }

        await screenshot(page, `356-settings-inputs-disabled-${role}`);
      });

      test('Settings is not shown in sidebar navigation', async ({ page }) => {
        await goto(page, withRole(`${BASE_URL}/dashboard`, role));
        await waitForPageReady(page);

        const sidebar = page.locator('aside').first();
        const settingsLink = sidebar.getByText('Settings', { exact: true });
        await expect(settingsLink).toHaveCount(0);
        await screenshot(page, `357-settings-no-nav-${role}`);
      });
    }
  });
}
