import { expect } from '@playwright/test'
import { E2E_EMAIL, E2E_EVENT_NAME, E2E_PASSWORD } from '../scripts/e2e/globalSetup.mjs'

export const organizerRoutes = [
  { path: '/dashboard', heading: 'Overview' },
  { path: '/events', heading: 'Events' },
  { path: '/registrations', heading: 'Guests & Registrations' },
  { path: '/payments', heading: 'Payments' },
  { path: '/payments/reconciliation', heading: 'Reconciliation Preview' },
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

  await page.goto('/events')
  const eventContainer = page.locator('tr:visible, article:visible').filter({ hasText: E2E_EVENT_NAME }).first()
  await expect(eventContainer).toBeVisible()
  await eventContainer.getByRole('button', { name: 'Select', exact: true }).click()
  await expect(page.getByText(`${E2E_EVENT_NAME} is now the selected event.`)).toBeVisible()
}
