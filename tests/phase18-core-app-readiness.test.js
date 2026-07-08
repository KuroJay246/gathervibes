import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Phase 18 resets import state when the Working Event changes', async () => {
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(imports, /useEffect\(\(\) => \{\s*resetImportState\(\)\s*\}, \[activeEvent\?\.eventId\]\)/)
  assert.match(imports, /setWorkbookSheets\(\[\]\)/)
  assert.match(imports, /setConfirmedSheetId\(''\)/)
  assert.match(imports, /setReviewActions\(\{\}\)/)
  assert.match(imports, /setFinalRows\(\[\]\)/)
})

test('Phase 18 clears stale registrations page selection and modal state on Working Event changes', async () => {
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')

  assert.match(registrations, /useEffect\(\(\) => \{\s*setSelectedIds\(new Set\(\)\)/)
  assert.match(registrations, /setEditingRegistration\(null\)/)
  assert.match(registrations, /setDeletingRegistration\(null\)/)
  assert.match(registrations, /setIsModalOpen\(false\)/)
  assert.match(registrations, /setIsExportModalOpen\(false\)/)
  assert.match(registrations, /if \(loadError\) return <ErrorState message=\{loadError\} onRetry=\{\(\) => window\.location\.reload\(\)\} \/>/)
})

test('Phase 18 clears stale ticket assignment state on Working Event changes and short-circuits load errors', async () => {
  const tickets = await readFile('src/pages/TicketsPage.jsx', 'utf8')

  assert.match(tickets, /useEffect\(\(\) => \{\s*setSearchQuery\(''\)/)
  assert.match(tickets, /setFilter\('all'\)/)
  assert.match(tickets, /setDraftCodes\(\{\}\)/)
  assert.match(tickets, /setShowPrintableQrs\(false\)/)
  assert.match(tickets, /if \(error\) return <ErrorState message=\{error\} onRetry=\{\(\) => window\.location\.reload\(\)\} \/>/)
})
