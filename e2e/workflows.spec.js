import { expect, test } from '@playwright/test'
import { signInAndSelectEvent } from './support.js'

async function openRegistrationEditor(page, name) {
  const row = page.getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Registration' })
  await expect(dialog).toBeVisible()
  return dialog
}

test('organizer can create a full planner event through the normal event wizard', async ({ page }) => {
  const name = 'QA_PHASE23T Organizer Ready Event'
  await signInAndSelectEvent(page)
  await page.goto('/events')

  await page.getByRole('button', { name: 'Plan a New Event' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create an organizer-ready event' })
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('Event name').fill(name)
  await dialog.getByLabel('Event type').selectOption('hospitality-event')
  await dialog.getByLabel('Lifecycle status').selectOption('planning')
  await dialog.getByLabel('Event date').fill('2026-11-14')
  await dialog.getByLabel('Venue').fill('Organizer QA Pavilion')
  await dialog.getByLabel('Start time').fill('16:00')
  await dialog.getByLabel('End time').fill('21:00')
  await dialog.getByLabel('Location').fill('Bridgetown Organizer Rehearsal Site')
  await dialog.getByLabel('Event description').fill('Synthetic Phase 23T rehearsal event used to verify organizer planning, finance, ticketing, and closeout workflows.')
  await dialog.getByRole('button', { name: 'Next' }).click()

  await dialog.getByLabel('Expected capacity').fill('60')
  await dialog.getByLabel('Number of ticket types').fill('1')
  await dialog.getByLabel('Default ticket price (BBD)').fill('75')
  await dialog.getByLabel('Registration opening date').fill('2026-08-15')
  await dialog.getByLabel('Registration closing date').fill('2026-11-10')
  await dialog.getByRole('button', { name: 'Next' }).click()

  await dialog.getByLabel('Projected registration income').fill('4500')
  await dialog.getByLabel('Venue budget').fill('1200')
  await dialog.getByLabel('Supplier budget').fill('800')
  await dialog.getByLabel('Entertainment budget').fill('500')
  await dialog.getByLabel('Marketing budget').fill('300')
  await dialog.getByLabel('Staffing budget').fill('400')
  await dialog.getByLabel('Contingency').fill('250')
  await dialog.getByLabel('Other budget').fill('150')
  await dialog.getByRole('button', { name: 'Next' }).click()

  await dialog.getByLabel('Venue access time').fill('13:00')
  await dialog.getByLabel('Setup time').fill('14:30')
  await dialog.getByLabel('Emergency contact').fill('Organizer QA Lead - 246-555-0140')
  await dialog.getByLabel('Suppliers').fill('Synthetic supplier note')
  await dialog.getByLabel('Bakers and vendors').fill('Synthetic baker and vendor note')
  await dialog.getByLabel('Sponsors').fill('Synthetic sponsor note')
  await dialog.getByLabel('Staff and helpers').fill('Synthetic staff note')
  await dialog.getByLabel('Equipment').fill('Synthetic equipment note')
  await dialog.getByLabel('Licences').fill('Synthetic licence note')
  await dialog.getByLabel('Insurance').fill('Synthetic insurance note')
  await dialog.locator('#timeline-time-0').fill('15:00')
  await dialog.locator('#timeline-label-0').fill('Setup review')
  await dialog.getByRole('button', { name: 'Add row' }).click()
  await dialog.locator('#timeline-time-1').fill('16:00')
  await dialog.locator('#timeline-label-1').fill('Doors open')
  await dialog.getByRole('button', { name: 'Next' }).click()

  await expect(dialog.getByText('Checklist snapshot')).toBeVisible()
  const createButton = dialog.getByRole('button', { name: 'Create and open Overview' })
  await expect(createButton).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    createButton.evaluate((button) => button.click()),
  ])

  await expect(page.getByText(name).first()).toBeVisible()

  await page.goto('/events')
  const row = page.locator('tr:visible, article:visible').filter({ hasText: name }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: `Delete ${name}` }).click()
  await page.getByRole('alertdialog', { name: 'Delete this event?' }).getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText(`${name} was deleted.`)).toBeVisible()
})

test('registration, ticket, and check-in journey preserves finance distinctions', async ({ page }) => {
  const name = 'QA_PHASE23P_REG_Workflow Guest'
  await signInAndSelectEvent(page)
  await page.goto('/registrations')

  await page.getByRole('button', { name: 'Add registration' }).click()
  const createDialog = page.getByRole('dialog', { name: 'New Registration' })
  await createDialog.getByLabel('Full name').fill(name)
  await createDialog.getByLabel('Email address').fill('qa-phase23p-reg@example.test')
  await createDialog.getByLabel('Persons attending').fill('1')
  await createDialog.getByLabel('Payment status', { exact: true }).selectOption('paid')
  await createDialog.getByLabel('Price tier').fill('General')
  await createDialog.getByLabel('Payment method', { exact: true }).selectOption('card')
  await createDialog.getByLabel('Ticket Price').fill('45')
  await createDialog.getByLabel('Amount Due').fill('45')
  await createDialog.getByLabel('Amount Paid').fill('45')
  await createDialog.getByLabel('Balance Due').fill('0')
  await createDialog.getByLabel('Payment reference').fill('QA_PHASE23P_PAYMENT_FULL')
  await createDialog.getByRole('button', { name: 'Save registration' }).click()
  await expect(page.getByText('Registration created.')).toBeVisible()

  const partialDialog = await openRegistrationEditor(page, name)
  await partialDialog.getByLabel('Payment status', { exact: true }).selectOption('pending')
  await partialDialog.getByLabel('Amount Paid').fill('20')
  await partialDialog.getByLabel('Balance Due').fill('25')
  await partialDialog.getByLabel('Payment reference').fill('QA_PHASE23P_PAYMENT_PARTIAL')
  await partialDialog.getByRole('button', { name: 'Save registration' }).click()
  await expect(page.getByText('Registration updated.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Balance BBD $25.00')

  const doorDialog = await openRegistrationEditor(page, name)
  await doorDialog.getByLabel('Payment status', { exact: true }).selectOption('door')
  await doorDialog.getByLabel('Payment method', { exact: true }).selectOption('door')
  await doorDialog.getByLabel('Amount Paid').fill('45')
  await doorDialog.getByLabel('Balance Due').fill('0')
  await doorDialog.getByLabel('Payment reference').fill('QA_PHASE23P_PAYMENT_DOOR')
  await doorDialog.getByRole('button', { name: 'Save registration' }).click()
  await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Door Paid')

  await page.goto('/tickets')
  const ticketRow = page.getByRole('row').filter({ hasText: name })
  await ticketRow.getByRole('button', { name: /^Generate next .+ code$/ }).click()
  await expect(ticketRow).toContainText(/[A-Z0-9]{3,}-\d{3}/)

  await page.goto('/check-in')
  await page.getByLabel('Find guest').fill(name)
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await page.getByRole('button', { name: 'Check in guest' }).click()
  await expect(page.getByText('Already checked in')).toBeVisible()

  for (const [path, text] of [
    ['/dashboard', 'Projected registration income'],
    ['/event-review', 'Registration Payments'],
  ]) {
    await page.goto(path)
    await expect(page.getByText(text).first()).toBeVisible()
  }

  await page.goto('/payments')
  await page.getByRole('combobox').selectOption('all')
  await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()

  await page.goto('/registrations')
  const cleanupRow = page.getByRole('row').filter({ hasText: name })
  await cleanupRow.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete registration' }).click()
  await expect(page.getByText('Registration deleted.')).toBeVisible()
})

test('Operations journey records paid, outstanding, and in-kind entries then cancels them', async ({ page }) => {
  await signInAndSelectEvent(page)
  await page.goto('/operations')

  const entries = [
    { label: 'QA_PHASE23P_OPS_Paid Expense', type: 'expense', status: 'paid', category: 'Supplier', amount: '25' },
    { label: 'QA_PHASE23P_OPS_Outstanding Commitment', type: 'expense', status: 'pending', category: 'Venue', amount: '40' },
    { label: 'QA_PHASE23P_OPS_In Kind Support', type: 'income', status: 'received', category: 'In-kind sponsorship', amount: '0' },
  ]
  const entryForm = page.getByRole('heading', { name: 'Add entry' }).locator('xpath=ancestor::form[1]')

  for (const entry of entries) {
    await entryForm.getByLabel('Entry Type').selectOption(entry.type)
    await entryForm.getByLabel('Status').selectOption(entry.status)
    await entryForm.getByLabel('Category').fill(entry.category)
    await entryForm.getByLabel('Amount').fill(entry.amount)
    await entryForm.getByLabel('Short description / title').fill(entry.label)
    await entryForm.getByRole('button', { name: 'Add entry' }).click()
    await expect(page.getByText('Operations ledger entry added.')).toBeVisible()
    await expect(page.getByText(entry.label)).toBeVisible()
  }

  await expect(page.getByText('BBD $25.00').first()).toBeVisible()
  await expect(page.getByText('BBD $40.00').first()).toBeVisible()

  for (const entry of entries) {
    const row = page.getByRole('row').filter({ hasText: entry.label })
    page.once('dialog', (dialog) => dialog.accept())
    await row.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(row).toContainText('Cancelled')
  }
})

test('pasted-table import completes mapping, previews, confirms, and cleans up', async ({ page }) => {
  const name = 'QA_PHASE23P_IMPORT_Workflow Guest'
  await signInAndSelectEvent(page)
  await page.goto('/imports')
  await page.getByRole('button', { name: /Pasted table/ }).click()
  await page.getByLabel('Paste registration rows').fill([
    'Full Name,Email,Persons Attending,Payment Status,Price Tier,Ticket Price,Amount Due,Amount Paid,Balance Due,Payment Method,Payment Reference,Ticket Code',
    `${name},qa-phase23p-import@example.test,1,Paid,General,45,45,45,0,Card,QA_PHASE23P_IMPORT_PAYMENT,QA23P-IMPORT-001`,
  ].join('\n'))
  await page.getByRole('button', { name: 'Parse rows' }).click()
  await expect(page.getByRole('heading', { name: 'Header Mapping Preview' })).toBeVisible()
  await page.getByRole('button', { name: 'Preview Import' }).click()
  await expect(page.getByRole('heading', { name: 'Duplicate Review' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to Final Import Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Final Import Preview' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm Import (1 rows)' }).click()
  await expect(page.getByRole('heading', { name: 'Import succeeded' })).toBeVisible()
  await page.getByRole('link', { name: 'View Registrations' }).click()

  const cleanupRow = page.getByRole('row').filter({ hasText: name })
  await expect(cleanupRow).toBeVisible()
  await cleanupRow.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete registration' }).click()
  await expect(page.getByText('Registration deleted.')).toBeVisible()
})
