/* global console */

import { chromium, devices, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_EVENT_NAME, E2E_PASSWORD } from './e2e/globalSetup.mjs';

const baseUrl = 'http://127.0.0.1:4173';

async function signInAndSelectEvent(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(E2E_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.waitForTimeout(1000);
  const skipButton = page.getByRole('button', { name: 'Skip for Now' });
  if (await skipButton.count()) await skipButton.first().click({ force: true });

  await page.goto(`${baseUrl}/events`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  if (await skipButton.count()) await skipButton.first().click({ force: true });
  const eventContainer = page.locator('tr:visible, article:visible').filter({ hasText: E2E_EVENT_NAME }).first();
  await expect(eventContainer).toBeVisible();
  await eventContainer.getByRole('button', { name: 'Select', exact: true }).click();
  await expect(page.getByText(`${E2E_EVENT_NAME} is now the selected event.`)).toBeVisible();
}

const captures = [
  { device: 'Desktop Chrome', route: '/dashboard', heading: 'Event Overview', path: 'output/web-production-completion/after/local-dashboard-desktop.png' },
  { device: 'Desktop Chrome', route: '/settings', heading: 'Settings', path: 'output/web-production-completion/after/local-settings-desktop.png' },
  { device: 'iPad (gen 7)', route: '/check-in', heading: 'Check-In', path: 'output/web-production-completion/after/local-checkin-tablet.png' },
  { device: 'iPhone 13', route: '/qa', heading: 'System QA', path: 'output/web-production-completion/after/local-qa-mobile.png' },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const capture of captures) {
    const context = await browser.newContext({ ...devices[capture.device] });
    const page = await context.newPage();
    await signInAndSelectEvent(page);
    await page.goto(`${baseUrl}${capture.route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: capture.heading, exact: true })).toBeVisible();
    await page.screenshot({ path: capture.path, fullPage: true });
    await context.close();
    console.log(`captured ${capture.device} ${capture.route}`);
  }
} finally {
  await browser.close();
}
