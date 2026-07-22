import { expect, test } from '@playwright/test'
import { E2E_EVENT_NAME } from '../scripts/e2e/globalSetup.mjs'
import { organizerRoutes, signInAndSelectEvent } from './support.js'

test('approved emulator organizer can open every organizer route without application errors', async ({ page }) => {
  const applicationErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') applicationErrors.push(message.text())
  })
  page.on('pageerror', (error) => applicationErrors.push(error.message))

  await signInAndSelectEvent(page)

  for (const { path, heading } of organizerRoutes) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page.getByText(E2E_EVENT_NAME).first()).toBeVisible()
  }

  expect(applicationErrors).toEqual([])
})
