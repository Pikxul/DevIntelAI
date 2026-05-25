/**
 * E2E Tests — Dashboard Overview (/dashboard)
 *
 * The dashboard is accessible without auth in development (NODE_ENV=development
 * bypass in layout.tsx injects a mock dev session).
 *
 * Covers: sidebar nav, header, KPI cards, alert banner, pipeline flow,
 *         AI review stats, telemetry chart, AI copilot panel, command palette.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible } from './helpers';

const DASHBOARD = 'http://localhost:3000/dashboard';

test.describe('Dashboard — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, DASHBOARD);
  });

  // ── Layout ────────────────────────────────────────────────────────────────
  test('sidebar is visible with nav items', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    const navLabels = ['Overview', 'Pipelines', 'AI Review', 'Deployments', 'Incidents'];
    for (const label of navLabels) {
      await expect(sidebar.getByText(label, { exact: false }).first()).toBeVisible();
    }
    await screenshot(page, '30-dashboard-sidebar');
  });

  test('header search bar is rendered', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /Open command palette/i });
    await expect(searchBtn).toBeVisible();
    await screenshot(page, '31-dashboard-header');
  });

  test('AI Copilot toggle button is in header', async ({ page }) => {
    const aiBtn = page.getByRole('button', { name: /Toggle AI Assistant/i });
    await expect(aiBtn).toBeVisible();
  });

  // ── Content ───────────────────────────────────────────────────────────────
  test('critical alert banner is displayed', async ({ page }) => {
    await assertVisible(page, 'Critical CPU Anomaly Detected');
    await assertVisible(page, 'data-processor-svc');
    await screenshot(page, '32-dashboard-alert-banner');
  });

  test('auto-scale button triggers loading then success state', async ({ page }) => {
    const autoScaleBtn = page.getByRole('button', { name: /Auto-Scale/i });
    await expect(autoScaleBtn).toBeVisible();
    await autoScaleBtn.click();

    // Should show loading state
    await expect(page.getByText(/Scaling/i)).toBeVisible();

    // Wait for the success badge (1.2s timeout in component)
    await expect(page.getByText(/Scaled to 4 Replicas/i)).toBeVisible({ timeout: 5000 });
    await screenshot(page, '33-dashboard-autoscale-success');
  });

  test('page title "System Control Overview" is shown', async ({ page }) => {
    await assertVisible(page, 'System Control Overview');
    await screenshot(page, '34-dashboard-title');
  });

  test('KPI cards are rendered', async ({ page }) => {
    await assertVisible(page, 'Success Rate');
    await assertVisible(page, 'MTTR');
    await assertVisible(page, 'Security');
    await assertVisible(page, 'Risk Trend');
    await screenshot(page, '35-dashboard-kpi-cards');
  });

  test('system health gauge section is visible', async ({ page }) => {
    await assertVisible(page, 'AI Security & Deployment Risk Posture');
    await assertVisible(page, 'HEALTH SCORE: 92%');
    await screenshot(page, '36-dashboard-health-gauge');
  });

  test('pipeline flow section is present', async ({ page }) => {
    await assertVisible(page, 'System Automation Pipeline Stream');
    const stages = ['Push', 'AI Review', 'Security', 'Tests'];
    for (const s of stages) {
      await assertVisible(page, s);
    }
    await screenshot(page, '37-dashboard-pipeline-flow');
  });

  test('pipeline history table is shown', async ({ page }) => {
    await assertVisible(page, 'Active Repositories & Release Risk Audit');
    await screenshot(page, '38-dashboard-pipeline-table');
  });

  test('telemetry volume chart is visible', async ({ page }) => {
    await assertVisible(page, 'Telemetry Volume Trends');
    await screenshot(page, '39-dashboard-telemetry-chart');
  });

  test('AI recommendation card is shown', async ({ page }) => {
    await assertVisible(page, 'Contextual Recommendation');
    await assertVisible(page, 'inventory-db');
    await screenshot(page, '40-dashboard-ai-rec-card');
  });

  // ── AI Copilot Panel ─────────────────────────────────────────────────────
  test('AI copilot panel opens and shows welcome message', async ({ page }) => {
    const aiBtn = page.getByRole('button', { name: /Toggle AI Assistant/i });
    await aiBtn.click();

    await assertVisible(page, 'DevIntel AI Copilot');
    await assertVisible(page, 'Welcome back, Operator');
    await screenshot(page, '41-dashboard-ai-panel-open');
  });

  test('AI copilot responds to a message', async ({ page }) => {
    // Open panel
    const aiBtn = page.getByRole('button', { name: /Toggle AI Assistant/i });
    await aiBtn.click();

    // Type a message
    const input = page.locator('input.ai-panel-input');
    await expect(input).toBeVisible();
    await input.fill('Show active DORA health indicators');
    await input.press('Enter');

    // Response should appear
    await expect(page.getByText(/DORA Metrics|Deployment frequency/i)).toBeVisible({ timeout: 5000 });
    await screenshot(page, '42-dashboard-ai-response');
  });

  test('AI copilot panel can be closed', async ({ page }) => {
    const aiBtn = page.getByRole('button', { name: /Toggle AI Assistant/i });
    await aiBtn.click();

    await assertVisible(page, 'DevIntel AI Copilot');

    const closeBtn = page.getByRole('button', { name: /Close AI panel/i });
    await closeBtn.click();

    await expect(page.getByText('DevIntel AI Copilot')).not.toBeVisible({ timeout: 3000 });
    await screenshot(page, '43-dashboard-ai-panel-closed');
  });

  // ── Command Palette ──────────────────────────────────────────────────────
  test('command palette opens on button click', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /Open command palette/i });
    await searchBtn.click();

    await expect(page.getByPlaceholder('Search routes, pipeline actions, or quick fixes...')).toBeVisible();
    await screenshot(page, '44-dashboard-command-palette');
  });

  test('command palette filters results on input', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /Open command palette/i });
    await searchBtn.click();

    const paletteInput = page.locator('input.command-palette-input');
    await paletteInput.fill('Incident');

    await assertVisible(page, 'Incident Feed');
    await screenshot(page, '45-dashboard-command-palette-filtered');
  });

  test('command palette closes on Escape', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /Open command palette/i });
    await searchBtn.click();
    await expect(page.getByPlaceholder('Search routes, pipeline actions, or quick fixes...')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search routes, pipeline actions, or quick fixes...')).not.toBeVisible({ timeout: 2000 });
    await screenshot(page, '46-dashboard-command-palette-closed');
  });

  // ── Workspace Switcher ───────────────────────────────────────────────────
  test('workspace switcher toggles dropdown', async ({ page }) => {
    const switcher = page.locator('.workspace-switcher').first();
    await expect(switcher).toBeVisible();
    await switcher.click();

    await assertVisible(page, 'US Staging-Env');
    await assertVisible(page, 'Local Dev Machine');
    await screenshot(page, '47-dashboard-workspace-switcher');

    // Click a workspace
    await page.getByText('US Staging-Env').click();
    await assertVisible(page, 'US Staging-Env');
    await screenshot(page, '48-dashboard-workspace-switched');
  });

  // ── Sidebar Navigation ───────────────────────────────────────────────────
  test('"Incident Logs" link is present in alert banner', async ({ page }) => {
    const incidentLink = page.getByRole('link', { name: /Incident Logs/i });
    await expect(incidentLink).toBeVisible();
    await expect(incidentLink).toHaveAttribute('href', '/dashboard/incidents');
  });

  test('"Run Pipeline" link navigates to pipelines', async ({ page }) => {
    const runBtn = page.getByRole('link', { name: /Run Pipeline/i });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveAttribute('href', '/dashboard/pipelines');
  });
});
