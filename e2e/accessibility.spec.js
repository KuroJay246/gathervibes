import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { organizerRoutes, signInAndSelectEvent } from './support.js'

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`organizer routes have no automated WCAG A or AA violations on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize(viewport)
    await signInAndSelectEvent(page)
    const violations = []

    for (const { path, heading } of organizerRoutes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      for (const violation of results.violations) {
        violations.push({
          path,
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        })
      }
    }

    await page.goto('/scanner')
    await expect(page.getByText('Scanner mode')).toBeVisible()
    const scannerResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    for (const violation of scannerResults.violations) {
      violations.push({
        path: '/scanner',
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(' ')),
      })
    }

    expect(violations, `${viewport.width}x${viewport.height}`).toEqual([])
  })
}
