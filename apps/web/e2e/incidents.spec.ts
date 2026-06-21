/**
 * E2E Tests — Incidents Page (/dashboard/incidents)
 *
 * Covers: page title, KPI stat cards, sandbox drawer toggle,
 *         telemetry ingestion streams, incident cards / empty state.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady } from './helpers';

const INCIDENTS_URL = 'http://localhost:3000/dashboard/incidents';

test.describe('Incidents Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, INCIDENTS_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Incident Intelligence Center/i);
    await screenshot(page, '140-incidents-title');
  });

  test('subtitle describes anomaly detection', async ({ page }) => {
    await assertVisible(page, 'Automated anomaly detection');
    await screenshot(page, '141-incidents-subtitle');
  });

  test('critical badge or all-muted badge is shown', async ({ page }) => {
    const criticalBadge = page.getByText(/Critical/i);
    const mutedBadge = page.getByText(/All Muted/i);

    const hasCritical = await criticalBadge.count() > 0;
    const hasMuted = await mutedBadge.count() > 0;

    expect(hasCritical || hasMuted).toBeTruthy();
    await screenshot(page, '142-incidents-status-badge');
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────
  test('KPI stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, [
      'Active Alerts',
      'Critical',
      'High Severity',
      'AI Diagnostic RCAs',
    ]);
    await screenshot(page, '143-incidents-stat-cards');
  });

  // ── Sandbox Drawer ────────────────────────────────────────────────────────
  test('Sandbox Tools button is visible', async ({ page }) => {
    const sandboxBtn = page.locator('button').filter({ hasText: /Sandbox Tools/i }).first();
    await expect(sandboxBtn).toBeVisible();
    await screenshot(page, '144-incidents-sandbox-btn');
  });

  test('sandbox drawer opens and shows simulation templates', async ({ page }) => {
    const sandboxBtn = page.locator('button').filter({ hasText: /Sandbox Tools/i }).first();
    await sandboxBtn.click();

    await assertVisible(page, 'SRE Simulation Sandbox');
    await assertVisible(page, 'Ingress High Latency Spike');
    await assertVisible(page, 'Database Pool Exhaustion');
    await assertVisible(page, 'OAuth Key Rotation Failure');
    await screenshot(page, '145-incidents-sandbox-drawer');
  });

  test('sandbox drawer has project selector', async ({ page }) => {
    const sandboxBtn = page.locator('button').filter({ hasText: /Sandbox Tools/i }).first();
    await sandboxBtn.click();

    await assertVisible(page, 'Target Connected Project');
    await screenshot(page, '146-incidents-sandbox-project-selector');
  });

  test('sandbox drawer can be closed', async ({ page }) => {
    const sandboxBtn = page.locator('button').filter({ hasText: /Sandbox Tools/i }).first();
    await sandboxBtn.click();

    await assertVisible(page, 'SRE Simulation Sandbox');

    // Close via the X button
    const closeBtn = page.locator('button svg').filter({ has: page.locator('line') }).first();
    // Alternative: click the overlay
    const overlay = page.locator('div[style*="position: fixed"][style*="inset: 0"]').first();
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 10, y: 10 } });
    }

    await expect(page.getByText('SRE Simulation Sandbox')).not.toBeVisible({ timeout: 3000 });
    await screenshot(page, '147-incidents-sandbox-closed');
  });

  // ── Telemetry Ingestion Streams ───────────────────────────────────────────
  test('telemetry ingestion streams section is visible', async ({ page }) => {
    await assertVisible(page, 'Telemetry Ingestion Streams');
    await screenshot(page, '148-incidents-telemetry-streams');
  });

  test('PROMETHEUS + SENTRY badge is shown', async ({ page }) => {
    await assertVisible(page, 'PROMETHEUS + SENTRY');
    await screenshot(page, '149-incidents-prometheus-badge');
  });

  // ── Incident Cards / Empty State ──────────────────────────────────────────
  test('incident cards or empty state is shown', async ({ page }) => {
    const incidentCards = page.locator('.card').filter({ hasText: /critical|high|medium|low/i });
    const emptyState = page.getByText(/No active incidents detected/i);

    const hasCards = await incidentCards.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasCards || hasEmpty).toBeTruthy();
    await screenshot(page, '150-incidents-content');
  });
});
