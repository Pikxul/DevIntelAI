/**
 * E2E Tests — Landing Page (/)
 *
 * Covers: hero content, navigation, pipeline visualisation, stats, features grid,
 * CTA, footer, and links to dashboard.
 */
import { test, expect } from '@playwright/test';
import { screenshot, goto, assertVisible } from './helpers';

const BASE = 'http://localhost:3000';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, BASE);
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/AI DevOps|DevOps/i);
    await screenshot(page, '01-landing-full');
  });

  test('nav bar is visible and sticky', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    // Logo text
    await expect(page.getByText('DevIntelAI').or(page.getByText('DevIntel')).first()).toBeVisible();
    await screenshot(page, '02-landing-navbar');
  });

  test('hero section renders with headline and CTA buttons', async ({ page }) => {
    await assertVisible(page, 'Ship Code Faster');
    await assertVisible(page, 'AI-Powered DevOps Platform');
    
    const launchBtn = page.getByRole('link', { name: /Launch Dashboard/i });
    await expect(launchBtn).toBeVisible();

    const githubBtn = page.getByRole('link', { name: /GitHub/i });
    await expect(githubBtn).toBeVisible();
    await screenshot(page, '03-landing-hero');
  });

  test('pipeline visualization section is rendered', async ({ page }) => {
    await assertVisible(page, 'Live Pipeline Flow');
    // All 7 pipeline stages should be present
    const stages = ['Push', 'AI Review', 'Security', 'Tests', 'Build', 'Deploy', 'Monitor'];
    for (const stage of stages) {
      await assertVisible(page, stage);
    }
    await screenshot(page, '04-landing-pipeline');
  });

  test('stats section shows key metrics', async ({ page }) => {
    await assertVisible(page, '99.2%');
    await assertVisible(page, 'Pipeline Uptime');
    await assertVisible(page, '67%');
    await assertVisible(page, 'Fewer Production Incidents');
    await screenshot(page, '05-landing-stats');
  });

  test('features grid shows 6 feature cards', async ({ page }) => {
    const features = [
      'AI Code Review',
      'Security Scanning',
      'Smart Deployment',
      'AI Anomaly Detection',
      'Real-time Pipeline',
      'VS Code Extension',
    ];
    for (const feature of features) {
      await assertVisible(page, feature);
    }
    await screenshot(page, '06-landing-features');
  });

  test('CTA section is visible', async ({ page }) => {
    await assertVisible(page, 'Ready to ship faster?');
    const openDashboardBtn = page.getByRole('link', { name: /Open Dashboard/i });
    await expect(openDashboardBtn).toBeVisible();
    await screenshot(page, '07-landing-cta');
  });

  test('footer is rendered', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await assertVisible(page, 'NestJS');
    await screenshot(page, '08-landing-footer');
  });

  test('"Dashboard" nav link navigates to /dashboard', async ({ page }) => {
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first();
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('"Get Started" nav link navigates to /dashboard', async ({ page }) => {
    const getStartedLink = page.getByRole('link', { name: 'Get Started' }).first();
    await expect(getStartedLink).toHaveAttribute('href', '/dashboard');
  });
});
