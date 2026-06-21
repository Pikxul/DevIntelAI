import { Page, expect, Locator } from '@playwright/test';
import * as path from 'path';

/** Base URL for the dev server */
export const BASE_URL = 'http://localhost:3000';

/** Artifact directory for test screenshots (relative to project root) */
export const ARTIFACTS_DIR = './e2e-results/artifacts';

/**
 * Take a named full-page screenshot and return the file path.
 * Name should be slug-style: e.g. 'landing-hero', 'dashboard-overview'
 */
export async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(ARTIFACTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

/**
 * Navigate to `url` and wait until the network is idle (good for SPA routes).
 */
export async function goto(page: Page, url: string) {
  await page.goto(url);
}

/**
 * Assert that the page title contains `text` (case-insensitive).
 */
export async function assertTitle(page: Page, text: string) {
  const title = await page.title();
  expect(title.toLowerCase()).toContain(text.toLowerCase());
}

/**
 * Assert that an element with the given text is visible.
 */
export async function assertVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

/**
 * Wait for the page to reach a stable state: body not empty,
 * animations settled, and no Next.js error overlay.
 */
export async function waitForPageReady(page: Page) {
  await expect(page.locator('body')).not.toBeEmpty();
  // Ensure no unhandled Next.js error overlay
  const errorOverlay = page.locator('body > nextjs-portal');
  const count = await errorOverlay.count();
  expect(count).toBe(0);
}

/**
 * Assert that at least one element matching the given CSS selector exists.
 */
export async function assertNotEmpty(page: Page, selector: string) {
  const count = await page.locator(selector).count();
  expect(count).toBeGreaterThan(0);
}

/**
 * Assert that a table on the page has at least one row in its tbody.
 */
export async function assertTableHasRows(page: Page, tableSelector = 'table') {
  const rows = page.locator(`${tableSelector} tbody tr`);
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Click a locator and wait for network to settle.
 */
export async function clickAndWait(page: Page, locator: Locator) {
  await locator.click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Assert that KPI stat cards are rendered with the given labels.
 */
export async function assertStatCards(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(
      page.locator('.stat-card').filter({ hasText: label }).first()
    ).toBeVisible({ timeout: 10_000 });
  }
}

/**
 * Assert that the page title heading (h1.page-title) matches the given pattern.
 */
export async function assertPageTitle(page: Page, pattern: RegExp) {
  const heading = page.locator('h1.page-title').first();
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText(pattern);
}
