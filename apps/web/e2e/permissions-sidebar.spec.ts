/**
 * E2E Tests — Phase 5: Sidebar Permission Gating
 *
 * Validates that sidebar navigation items are correctly shown/hidden
 * based on the user's role and its associated permissions.
 * Also verifies role badge rendering in the sidebar footer.
 *
 * Test matrix covers all 7 roles × 9 nav items + role badge = ~70 tests.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, waitForPageReady } from './helpers';
import {
  ALL_ROLES,
  Role,
  ROLE_LABELS,
  SIDEBAR_NAV_ITEMS,
  SIDEBAR_SETTINGS_ITEMS,
  withRole,
  roleHasPermission,
  roleHasAnyPermission,
  BASE_URL,
} from './helpers/role-fixtures';

const DASHBOARD_URL = `${BASE_URL}/dashboard`;

// ── Sidebar Navigation Filtering ────────────────────────────────────────────

for (const role of ALL_ROLES) {
  test.describe(`Sidebar Navigation — ${ROLE_LABELS[role]}`, () => {

    // ── Pipeline Intelligence nav items ──────────────────────────────────
    for (const navItem of SIDEBAR_NAV_ITEMS) {
      const hasAccess = roleHasPermission(role, navItem.permission);

      if (hasAccess) {
        test(`shows "${navItem.label}" nav item`, async ({ page }) => {
          await goto(page, withRole(DASHBOARD_URL, role));
          await waitForPageReady(page);

          const sidebar = page.locator('aside').first();
          await expect(sidebar).toBeVisible();

          const navLink = sidebar.getByText(navItem.label, { exact: true }).first();
          await expect(navLink).toBeVisible();
        });
      } else {
        test(`hides "${navItem.label}" nav item`, async ({ page }) => {
          await goto(page, withRole(DASHBOARD_URL, role));
          await waitForPageReady(page);

          const sidebar = page.locator('aside').first();
          await expect(sidebar).toBeVisible();

          const navLink = sidebar.getByText(navItem.label, { exact: true });
          await expect(navLink).toHaveCount(0);
        });
      }
    }

    // ── Configuration section items (Projects, Settings) ─────────────────
    for (const settingsItem of SIDEBAR_SETTINGS_ITEMS) {
      let hasAccess: boolean;
      if ('permissionAny' in settingsItem && settingsItem.permissionAny) {
        hasAccess = roleHasAnyPermission(role, [...settingsItem.permissionAny]);
      } else if ('permission' in settingsItem && settingsItem.permission) {
        hasAccess = roleHasPermission(role, settingsItem.permission);
      } else {
        hasAccess = true;
      }

      if (hasAccess) {
        test(`shows "${settingsItem.label}" settings item`, async ({ page }) => {
          await goto(page, withRole(DASHBOARD_URL, role));
          await waitForPageReady(page);

          const sidebar = page.locator('aside').first();
          const navLink = sidebar.getByText(settingsItem.label, { exact: true }).first();
          await expect(navLink).toBeVisible();
        });
      } else {
        test(`hides "${settingsItem.label}" settings item`, async ({ page }) => {
          await goto(page, withRole(DASHBOARD_URL, role));
          await waitForPageReady(page);

          const sidebar = page.locator('aside').first();
          const navLink = sidebar.getByText(settingsItem.label, { exact: true });
          await expect(navLink).toHaveCount(0);
        });
      }
    }

    // ── Role Badge ───────────────────────────────────────────────────────
    test(`displays "${ROLE_LABELS[role]}" role badge`, async ({ page }) => {
      await goto(page, withRole(DASHBOARD_URL, role));
      await waitForPageReady(page);

      const sidebar = page.locator('aside').first();
      const badge = sidebar.locator('.badge').filter({ hasText: ROLE_LABELS[role] });
      await expect(badge.first()).toBeVisible();

      await screenshot(page, `300-sidebar-badge-${role}`);
    });
  });
}
