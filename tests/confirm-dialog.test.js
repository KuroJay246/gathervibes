import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('shared confirmation dialog provides accessible in-app destructive confirmation', async () => {
  const dialog = await readFile('src/components/ui/ConfirmDialog.jsx', 'utf8')
  const pages = await Promise.all([
    readFile('src/pages/TasksPage.jsx', 'utf8'),
    readFile('src/pages/DocumentsPage.jsx', 'utf8'),
    readFile('src/pages/RunOfShowPage.jsx', 'utf8'),
    readFile('src/pages/ResourcesPage.jsx', 'utf8'),
    readFile('src/pages/OperationsPage.jsx', 'utf8'),
    readFile('src/pages/TicketsPage.jsx', 'utf8'),
    readFile('src/pages/CheckInPage.jsx', 'utf8'),
    readFile('src/pages/ScannerPage.jsx', 'utf8'),
    readFile('src/pages/RegistrationsPage.jsx', 'utf8'),
    readFile('src/pages/ImportsPage.jsx', 'utf8'),
    readFile('src/components/events/EventPlanningWorkspace.jsx', 'utf8'),
    readFile('src/components/operations/PartnerCommitmentsPanel.jsx', 'utf8'),
  ])

  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /aria-labelledby/)
  assert.match(dialog, /aria-describedby/)
  assert.match(dialog, /previousFocusRef/)
  assert.match(dialog, /confirmRef\.current\?\.focus\(\)/)
  assert.match(dialog, /previousFocusRef\.current\.focus\(\)/)
  assert.match(dialog, /event\.key === 'Escape'/)
  assert.match(dialog, /Working\.\.\./)

  for (const source of pages) {
    assert.match(source, /ConfirmDialog/)
    assert.doesNotMatch(source, /window\.confirm/)
  }
})
