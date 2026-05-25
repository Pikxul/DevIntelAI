import { Page, expect } from '@playwright/test';
import * as path from 'path';

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
