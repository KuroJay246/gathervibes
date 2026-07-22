import { expect, test } from '@playwright/test'
import { E2E_EVENT_NAME } from '../scripts/e2e/globalSetup.mjs'
import { organizerRoutes, signInAndSelectEvent } from './support.js'

const viewports = [
  [1920, 1080],
  [1440, 1000],
  [1280, 720],
  [1024, 768],
  [834, 1112],
  [768, 1024],
  [430, 932],
  [390, 844],
  [360, 800],
]

test('all organizer routes remain reachable without page-level overflow at required viewports', async ({ page }) => {
  test.setTimeout(480_000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signInAndSelectEvent(page)

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    for (const { path, heading } of organizerRoutes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(page.getByText(E2E_EVENT_NAME).filter({ visible: true }).first()).toBeVisible()
      const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(bodyOverflow, `${path} overflows at ${width}x${height}`).toBe(false)
    }

    await page.goto('/scanner')
    await expect(page.getByText('Scanner mode')).toBeVisible()
    const scannerOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scannerOverflow, `/scanner overflows at ${width}x${height}`).toBe(false)
  }
})
