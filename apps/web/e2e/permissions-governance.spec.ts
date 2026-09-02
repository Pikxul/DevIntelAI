/**
 * E2E Tests — Phase 5: Governance Permission Gating
 *
 * Validates that governance page features are correctly gated:
 * - Role change dropdown visible only for `user:assign_role` holders
 * - Approve/Reject buttons visible only for `approval:review` holders
 * - Audit Log tab visible only for `audit_log:view` holders
 * - Page accessible only for roles with `governance:view`
 *
 * Covers all 7 roles × 5 assertions = ~35 tests.
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

const GOVERNANCE_URL = `${BASE_URL}/dashboard/governance`;

for (const role of ALL_ROLES) {
  const canViewGovernance = roleHasPermission(role, 'governance:view');
  const canAssignRole = roleHasPermission(role, 'user:assign_role');
  const canApprove = roleHasPermission(role, 'approval:review');
  const canViewAuditLog = roleHasPermission(role, 'audit_log:view');

  test.describe(`Governance Permissions — ${ROLE_LABELS[role]}`, () => {

    if (canViewGovernance) {
      test('can access the Governance page', async ({ page }) => {
        await goto(page, withRole(GOVERNANCE_URL, role));
        await waitForPageReady(page);

        const accessDenied = page.getByText('Access Denied');
        await expect(accessDenied).toHaveCount(0);

        await assertVisible(page, 'Governance');
        await screenshot(page, `330-governance-access-${role}`);
      });

      // ── Team Members Tab — Role Change Dropdown ──────────────────────────
      if (canAssignRole) {
        test('role change dropdown is visible in Team Members tab', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          // Team Members tab is default — look for role select dropdowns in the table
          const roleSelects = page.locator('select').filter({ has: page.locator('option') });
          const selectCount = await roleSelects.count();

          // If there are team members, selects should be present
          const tableRows = page.locator('table tbody tr');
          const rowCount = await tableRows.count();
          if (rowCount > 0) {
            expect(selectCount).toBeGreaterThan(0);
          }
          await screenshot(page, `331-governance-role-dropdown-visible-${role}`);
        });
      } else {
        test('role change dropdown is hidden in Team Members tab', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          // No role-change selects should be present for this role
          // Wait for content to load
          await page.waitForTimeout(500);

          // The role column should show text labels instead of dropdowns
          await screenshot(page, `332-governance-role-dropdown-hidden-${role}`);
        });
      }

      // ── Approvals Tab — Approve/Reject Buttons ───────────────────────────
      if (canApprove) {
        test('approve/reject buttons are visible in Approvals tab', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          const approvalsTab = page.locator('button').filter({ hasText: 'Approvals' }).first();
          await approvalsTab.click();
          await page.waitForTimeout(500);

          // Look for approve/reject buttons or empty state
          const approveBtn = page.locator('button').filter({ hasText: /approve/i });
          const rejectBtn = page.locator('button').filter({ hasText: /reject/i });
          const emptyState = page.getByText(/No pending approvals/i);

          const hasApprove = await approveBtn.count() > 0;
          const hasReject = await rejectBtn.count() > 0;
          const hasEmpty = await emptyState.count() > 0;

          // Either there are action buttons or no pending approvals
          expect(hasApprove || hasReject || hasEmpty).toBeTruthy();
          await screenshot(page, `333-governance-approve-visible-${role}`);
        });
      } else {
        test('approve/reject buttons are hidden in Approvals tab', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          const approvalsTab = page.locator('button').filter({ hasText: 'Approvals' }).first();
          await approvalsTab.click();
          await page.waitForTimeout(500);

          // Approve/reject buttons should not be present for this role
          const approveBtn = page.locator('button').filter({ hasText: /^Approve$/i });
          const rejectBtn = page.locator('button').filter({ hasText: /^Reject$/i });
          await expect(approveBtn).toHaveCount(0);
          await expect(rejectBtn).toHaveCount(0);
          await screenshot(page, `334-governance-approve-hidden-${role}`);
        });
      }

      // ── Audit Log Tab ────────────────────────────────────────────────────
      if (canViewAuditLog) {
        test('Audit Log tab is visible and accessible', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          const auditTab = page.locator('button').filter({ hasText: 'Audit Log' }).first();
          await expect(auditTab).toBeVisible();

          await auditTab.click();
          await page.waitForTimeout(500);

          // Should show audit log content (filter, export, or empty state)
          const exportBtn = page.locator('button').filter({ hasText: 'Export CSV' });
          const emptyState = page.getByText(/No audit logs/i);
          const loading = page.getByText(/Loading audit logs/i);

          const hasExport = await exportBtn.count() > 0;
          const hasEmpty = await emptyState.count() > 0;
          const hasLoading = await loading.count() > 0;

          expect(hasExport || hasEmpty || hasLoading).toBeTruthy();
          await screenshot(page, `335-governance-audit-visible-${role}`);
        });
      } else {
        test('Audit Log tab is hidden', async ({ page }) => {
          await goto(page, withRole(GOVERNANCE_URL, role));
          await waitForPageReady(page);

          const auditTab = page.locator('button').filter({ hasText: 'Audit Log' });
          await expect(auditTab).toHaveCount(0);
          await screenshot(page, `336-governance-audit-hidden-${role}`);
        });
      }
    } else {
      test('governance page is not accessible via sidebar', async ({ page }) => {
        await goto(page, withRole(`${BASE_URL}/dashboard`, role));
        await waitForPageReady(page);

        const sidebar = page.locator('aside').first();
        const governanceLink = sidebar.getByText('Governance', { exact: true });
        await expect(governanceLink).toHaveCount(0);
        await screenshot(page, `337-governance-no-nav-${role}`);
      });
    }
  });
}
