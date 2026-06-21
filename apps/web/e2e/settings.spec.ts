/**
 * E2E Tests — Settings Page (/dashboard/settings)
 *
 * Covers: page title, Save Changes button, AI Configuration section,
 *         Integrations section, Notification Channels, Advanced section,
 *         toggle switch interaction, and select dropdown interaction.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible, assertPageTitle, waitForPageReady } from './helpers';

const SETTINGS_URL = 'http://localhost:3000/dashboard/settings';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, SETTINGS_URL);
    await waitForPageReady(page);
  });

  // ── Layout & Header ──────────────────────────────────────────────────────
  test('page loads with correct title', async ({ page }) => {
    await assertPageTitle(page, /Settings/i);
    await screenshot(page, '200-settings-title');
  });

  test('subtitle describes platform configuration', async ({ page }) => {
    await assertVisible(page, 'Platform configuration');
    await screenshot(page, '201-settings-subtitle');
  });

  test('Save Changes button is visible', async ({ page }) => {
    const saveBtn = page.locator('button').filter({ hasText: 'Save Changes' }).first();
    await expect(saveBtn).toBeVisible();
    await screenshot(page, '202-settings-save-btn');
  });

  // ── AI Configuration Section ──────────────────────────────────────────────
  test('AI Configuration section is visible', async ({ page }) => {
    await assertVisible(page, 'AI Configuration');
    await assertVisible(page, 'Configure AI providers');
    await screenshot(page, '203-settings-ai-config');
  });

  test('Primary AI Provider setting is shown', async ({ page }) => {
    await assertVisible(page, 'Primary AI Provider');
    await assertVisible(page, 'The default provider used for code reviews');
    await screenshot(page, '204-settings-ai-provider');
  });

  test('Pipeline Block Threshold setting is shown', async ({ page }) => {
    await assertVisible(page, 'Pipeline Block Threshold');
    await screenshot(page, '205-settings-threshold');
  });

  test('Auto-Rollback toggle is shown', async ({ page }) => {
    await assertVisible(page, 'Auto-Rollback on Anomaly');
    await screenshot(page, '206-settings-auto-rollback');
  });

  test('Slack Notifications toggle is shown', async ({ page }) => {
    await assertVisible(page, 'Slack Notifications');
    await screenshot(page, '207-settings-slack');
  });

  // ── Integrations Section ──────────────────────────────────────────────────
  test('Integrations section is visible', async ({ page }) => {
    await assertVisible(page, 'Integrations');
    await assertVisible(page, 'Connect external services');
    await screenshot(page, '208-settings-integrations');
  });

  test('GitHub Webhook Events setting is shown', async ({ page }) => {
    await assertVisible(page, 'GitHub Webhook Events');
    await screenshot(page, '209-settings-github-webhook');
  });

  test('Auto PR Summaries setting is shown', async ({ page }) => {
    await assertVisible(page, 'Auto PR Summaries');
    await screenshot(page, '210-settings-pr-summary');
  });

  // ── Notification Channels Section ─────────────────────────────────────────
  test('Notification Channels section is visible', async ({ page }) => {
    await assertVisible(page, 'Notification Channels');
    await assertVisible(page, 'Active alert destinations');
    await screenshot(page, '211-settings-notification-channels');
  });

  test('notification channel cards are rendered', async ({ page }) => {
    const channels = ['Slack', 'MS Teams', 'Jira', 'Email'];
    for (const ch of channels) {
      await assertVisible(page, ch);
    }
    await screenshot(page, '212-settings-channel-cards');
  });

  test('notification cards show ".env" configuration hint', async ({ page }) => {
    await assertVisible(page, 'via .env');
    await screenshot(page, '213-settings-env-hint');
  });

  // ── Advanced Section ──────────────────────────────────────────────────────
  test('Advanced section is visible', async ({ page }) => {
    await assertVisible(page, 'Advanced');
    await assertVisible(page, 'Anomaly detection tuning');
    await screenshot(page, '214-settings-advanced');
  });

  test('Anomaly Sensitivity setting is shown', async ({ page }) => {
    await assertVisible(page, 'Anomaly Sensitivity');
    await screenshot(page, '215-settings-anomaly-sensitivity');
  });

  test('Pipeline Log Retention setting is shown', async ({ page }) => {
    await assertVisible(page, 'Pipeline Log Retention');
    await screenshot(page, '216-settings-retention');
  });

  // ── Interactive Controls ──────────────────────────────────────────────────
  test('AI provider select dropdown can be changed', async ({ page }) => {
    const select = page.locator('select').filter({ has: page.locator('option:has-text("Gemini 2.0 Flash")') }).first();
    if (await select.isVisible()) {
      await select.selectOption('Claude 3.5 Sonnet');
      await expect(select).toHaveValue('Claude 3.5 Sonnet');
      await screenshot(page, '217-settings-provider-changed');
    }
  });

  test('toggle switches can be clicked', async ({ page }) => {
    // Find the first toggle button (round white circle inside colored container)
    const toggles = page.locator('button[style*="border-radius: 13px"]');
    const toggleCount = await toggles.count();

    if (toggleCount > 0) {
      const firstToggle = toggles.first();
      const initialBg = await firstToggle.getAttribute('style');

      await firstToggle.click();

      // The style should have changed (background color changes)
      const newBg = await firstToggle.getAttribute('style');
      expect(newBg).not.toBe(initialBg);
      await screenshot(page, '218-settings-toggle-clicked');
    }
  });
});
