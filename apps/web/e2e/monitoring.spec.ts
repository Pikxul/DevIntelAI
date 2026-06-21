/**
 * E2E Tests — Monitoring Page (/dashboard/monitoring)
 *
 * Covers: page title, "All systems operational" badge, KPI stat cards,
 *         charts (CPU & Memory, Request Rate, Error Rate), service health
 *         table, and degraded service detection.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, assertStatCards, waitForPageReady, assertTableHasRows } from './helpers';

const MONITORING_URL = 'http://localhost:3000/dashboard/monitoring';

test.describe('Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, MONITORING_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Monitoring/i);
    await screenshot(page, '160-monitoring-title');
  });

  test('subtitle mentions observability and SLO tracking', async ({ page }) => {
    await assertVisible(page, 'Real-time infrastructure observability');
    await screenshot(page, '161-monitoring-subtitle');
  });

  test('"All systems operational" badge is visible', async ({ page }) => {
    await assertVisible(page, 'All systems operational');
    await screenshot(page, '162-monitoring-operational-badge');
  });

  test('"Last updated" badge is visible', async ({ page }) => {
    await assertVisible(page, 'Last updated');
    await screenshot(page, '163-monitoring-last-updated');
  });

  // ── Stat Cards ────────────────────────────────────────────────────────────
  test('KPI stat cards are rendered', async ({ page }) => {
    await assertStatCards(page, [
      'Avg Uptime (30d)',
      'p99 Latency',
      'Error Rate',
      'Requests/min',
      'Active Alerts',
    ]);
    await screenshot(page, '164-monitoring-stat-cards');
  });

  test('stat card values are populated', async ({ page }) => {
    await assertVisible(page, '99.97%');
    await assertVisible(page, '82ms');
    await assertVisible(page, '0.04%');
    await assertVisible(page, '7,551');
    await screenshot(page, '165-monitoring-stat-values');
  });

  // ── Charts ────────────────────────────────────────────────────────────────
  test('CPU & Memory chart is visible', async ({ page }) => {
    await assertVisible(page, 'CPU & Memory');
    // Recharts renders inside SVG containers
    const chartCards = page.locator('.card').filter({ hasText: 'CPU & Memory' });
    await expect(chartCards.first()).toBeVisible();
    await screenshot(page, '166-monitoring-cpu-chart');
  });

  test('Request Rate & Latency chart is visible', async ({ page }) => {
    await assertVisible(page, 'Request Rate & Latency');
    await screenshot(page, '167-monitoring-request-chart');
  });

  test('Error Rate chart is visible', async ({ page }) => {
    await assertVisible(page, 'Error Rate (%)');
    await screenshot(page, '168-monitoring-error-chart');
  });

  // ── Service Health Table ──────────────────────────────────────────────────
  test('Service Health heading is visible', async ({ page }) => {
    await assertVisible(page, 'Service Health');
    await screenshot(page, '169-monitoring-service-heading');
  });

  test('service health table has expected columns', async ({ page }) => {
    const tableHeader = page.locator('table thead');
    const columns = ['Service', 'Status', 'Uptime', 'Latency', 'Requests', 'CPU', 'Memory'];
    for (const col of columns) {
      await expect(
        tableHeader.getByText(col, { exact: false }).first()
      ).toBeVisible();
    }
    await screenshot(page, '170-monitoring-table-columns');
  });

  test('service health table has 5 services', async ({ page }) => {
    await assertTableHasRows(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBe(5);
    await screenshot(page, '171-monitoring-table-rows');
  });

  test('all service names are visible', async ({ page }) => {
    const services = ['api-gateway', 'auth-service', 'data-service', 'ml-pipeline', 'web-frontend'];
    for (const svc of services) {
      await assertVisible(page, svc);
    }
    await screenshot(page, '172-monitoring-service-names');
  });

  test('degraded service "data-service" has warning badge', async ({ page }) => {
    const dataServiceRow = page.locator('table tbody tr').filter({ hasText: 'data-service' });
    await expect(dataServiceRow).toBeVisible();
    await expect(dataServiceRow.locator('.badge-warning')).toBeVisible();
    await screenshot(page, '173-monitoring-degraded-service');
  });
});
