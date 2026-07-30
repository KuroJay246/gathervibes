import { expect, test } from '@playwright/test'
import { E2E_EVENT_NAME } from '../scripts/e2e/globalSetup.mjs'
import { signInAndSelectEvent } from './support.js'

const stepTitle = () => '#tutorial-step-title'
const tutorialDialog = (page) => page.locator('[role="dialog"]').filter({ has: page.locator(stepTitle()) })

async function clickTutorialButton(page, name) {
  const button = tutorialDialog(page).getByRole('button', { name })
  await expect(button).toBeEnabled()
  await button.scrollIntoViewIfNeeded()
  await button.click()
}

async function clickWelcomeButton(page, name) {
  const button = page.getByRole('dialog', { name: /Welcome, Phase/ }).getByRole('button', { name })
  await expect(button).toBeEnabled()
  await button.scrollIntoViewIfNeeded()
  await button.click()
}

async function openReplay(page) {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Show Welcome Tour Again' }).click()
  await expect(page.getByRole('dialog', { name: /Welcome, Phase/ })).toBeVisible()
  await clickWelcomeButton(page, 'Start Guided Tour')
  await expect(page.locator(stepTitle())).toContainText('Working Event')
}

test('tutorial v3 supports deterministic replay, next, back, refresh, and completion', async ({ page }) => {
  const appErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') appErrors.push(message.text())
  })
  page.on('pageerror', (error) => appErrors.push(error.message))

  await signInAndSelectEvent(page)
  await openReplay(page)

  await expect(page.getByText(E2E_EVENT_NAME).first()).toBeVisible()
  await expect(page.locator('[data-tour-id="working-event-selector"]').first()).toBeVisible()

  await clickTutorialButton(page, 'Next')
  await expect(page.locator(stepTitle())).toContainText('Overview')
  await expect(page.locator('[data-tour-id="overview-summary"]')).toBeVisible()
  await expect(tutorialDialog(page)).toContainText('What to do now:')
  await expect(tutorialDialog(page).getByRole('button', { name: 'Show Me' })).toBeVisible()
  await expect(tutorialDialog(page).getByRole('button', { name: 'Let Me Try' })).toBeVisible()

  await clickTutorialButton(page, 'Back')
  await expect(page.locator(stepTitle())).toContainText('Working Event')
  await expect(page).toHaveURL(/\/dashboard$/)

  await clickTutorialButton(page, 'Next')
  await expect(page.locator(stepTitle())).toContainText('Overview')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await openReplay(page)
  const expectedSteps = [
    ['Working Event', /\/dashboard$/, 'working-event-selector'],
    ['Overview', /\/dashboard$/, 'overview-summary'],
    ['Create Event', /\/events$/, 'create-event-action'],
    ['Event Basics', /\/events$/, 'event-name-field'],
    ['Event Category', /\/events$/, 'event-category-selector'],
    ['Optional Capabilities', /\/events$/, 'event-capabilities-controls'],
    ['Planning Tasks', /\/events$/, 'event-planning-workspace'],
    ['Guests & Registrations', /\/registrations$/, 'registrations-workspace'],
    ['Add Registration', /\/registrations$/, 'add-registration-action'],
    ['Registration Filters', /\/registrations$/, 'registration-filters-panel'],
    ['Registration Payments', /\/payments$/, 'payments-summary-metrics'],
    ['Tickets', /\/tickets$/, 'tickets-workspace'],
    ['Check-In', /\/check-in$/, 'checkin-search-field'],
    ['Operations', /\/operations$/, 'operations-workspace'],
    ['Partners, Suppliers, and Sponsors', /\/operations$/, 'partners-commitments-panel'],
    ['Message Builder', /\/communications$/, 'message-builder-workspace'],
    ['Reports', /\/event-review$/, 'reports-workspace'],
    ['Import Center', /\/imports$/, 'imports-workspace'],
    ['Settings', /\/settings$/, 'settings-workspace'],
    ['System QA and Help', /\/qa$/, 'system-qa-workspace'],
  ]

  for (let index = 0; index < expectedSteps.length; index += 1) {
    const [title, urlPattern, targetId] = expectedSteps[index]
    await expect(page.locator(stepTitle())).toContainText(title)
    await expect(page).toHaveURL(urlPattern)
    await expect(page.locator(`[data-tour-id="${targetId}"]`).first()).toBeVisible()
    if (index < expectedSteps.length - 1) {
      await clickTutorialButton(page, 'Next')
    }
  }

  await clickTutorialButton(page, 'Finish')
  await expect(page.getByRole('dialog', { name: 'Welcome aboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(appErrors).toEqual([])
})

test('tutorial v3 remains usable on small mobile viewports and supports rapid retracing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAndSelectEvent(page)
  await openReplay(page)

  await clickTutorialButton(page, 'Next')
  await clickTutorialButton(page, 'Next')
  await expect(page.locator(stepTitle())).toContainText('Create Event')
  await clickTutorialButton(page, 'Show Me')
  await expect(page.locator('[data-tour-id="event-name-field"]')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await clickTutorialButton(page, 'Back')
  await expect(page.locator(stepTitle())).toContainText('Overview')
  await clickTutorialButton(page, 'Next')
  await expect(page.locator(stepTitle())).toContainText('Create Event')
  await expect(page.locator('[role="dialog"]').first()).toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')
})
