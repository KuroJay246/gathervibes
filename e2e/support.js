import { expect } from '@playwright/test'
import { E2E_EMAIL, E2E_EVENT_NAME, E2E_PASSWORD } from '../scripts/e2e/globalSetup.mjs'

export const organizerRoutes = [
  { path: '/dashboard', heading: 'Event Overview' },
  { path: '/events', heading: 'Events' },
  { path: '/tasks', heading: 'Tasks & Deadlines' },
  { path: '/registrations', heading: 'Guests & Registrations' },
  { path: '/payments', heading: 'Payments' },
  { path: '/payments/reconciliation', heading: 'Review & Reconcile Records' },
  { path: '/imports', heading: 'Import Center' },
  { path: '/tickets', heading: 'Tickets' },
  { path: '/check-in', heading: 'Check-In' },
  { path: '/operations', heading: 'Operations' },
  { path: '/event-review', heading: 'Reports' },
  { path: '/communications', heading: 'Message Builder' },
  { path: '/settings', heading: 'Settings' },
  { path: '/qa', heading: 'System QA' },
]

export async function signInAndSelectEvent(page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(E2E_EMAIL)
  await page.locator('#password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in securely' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Event Overview' })).toBeVisible()
  await dismissWelcomeTourIfPresent(page)

  await page.goto('/events')
  await dismissWelcomeTourIfPresent(page)
  const eventContainer = page.locator('tr:visible, article:visible').filter({ hasText: E2E_EVENT_NAME }).first()
  await expect(eventContainer).toBeVisible()
  await eventContainer.getByRole('button', { name: 'Select', exact: true }).click()
  await expect(page.getByText(`${E2E_EVENT_NAME} is now the selected event.`)).toBeVisible()
}

async function dismissWelcomeTourIfPresent(page) {
  const welcomeDialog = page.getByRole('dialog').filter({ hasText: 'Guided Event Hub Orientation' })
  try {
    await welcomeDialog.first().waitFor({ state: 'visible', timeout: 5000 })
  } catch {
    return
  }
  const skipButton = welcomeDialog.getByRole('button', { name: 'Skip for Now' })
  if (await skipButton.count() === 1) {
    await skipButton.click()
    await expect(welcomeDialog).toHaveCount(0)
  }
}
