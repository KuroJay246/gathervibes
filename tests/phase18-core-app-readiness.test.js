import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Phase 18 resets import state when the Working Event changes', async () => {
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(imports, /useEffect\(\(\) => \{\s*resetImportState\(\)\s*\}, \[activeEvent\?\.eventId\]\)/)
  assert.match(imports, /setExistingRegistrations\(\[\]\)/)
  assert.match(imports, /setExistingRegistrationsLoaded\(false\)/)
  assert.match(imports, /setExistingRegistrationsLoaded\(true\)/)
  assert.match(imports, /setWorkbookSheets\(\[\]\)/)
  assert.match(imports, /setConfirmedSheetId\(''\)/)
  assert.match(imports, /setReviewActions\(\{\}\)/)
  assert.match(imports, /setFinalRows\(\[\]\)/)
  assert.match(imports, /Still loading the current Working Event registrations\. Wait a moment so duplicate checks use the latest event data\./)
})

test('Phase 18 clears stale registrations page selection and modal state on Working Event changes', async () => {
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')

  assert.match(registrations, /if \(!activeEvent\?\.eventId\) \{\s*setRegistrations\(\[\]\)\s*setLoadError\(''\)\s*setLoading\(false\)/)
  assert.match(registrations, /useEffect\(\(\) => \{[\s\S]*setSelectedIds\(new Set\(\)\)/)
  assert.match(registrations, /setEditingRegistration\(null\)/)
  assert.match(registrations, /setDeletingRegistration\(null\)/)
  assert.match(registrations, /setIsModalOpen\(false\)/)
  assert.match(registrations, /setIsExportModalOpen\(false\)/)
  assert.match(registrations, /function retryRegistrationsLoad\(\)/)
  assert.match(registrations, /setReloadKey\(\(current\) => current \+ 1\)/)
  assert.match(registrations, /if \(loadError\) return <ErrorState message=\{loadError\} onRetry=\{retryRegistrationsLoad\} \/>/)
})

test('Phase 18 clears stale ticket assignment state on Working Event changes and short-circuits load errors', async () => {
  const tickets = await readFile('src/pages/TicketsPage.jsx', 'utf8')

  assert.match(tickets, /if \(!activeEvent\?\.eventId\) \{\s*setRegistrations\(\[\]\)\s*setError\(''\)\s*setLoading\(false\)/)
  assert.match(tickets, /useEffect\(\(\) => \{[\s\S]*setSearchQuery\(''\)/)
  assert.match(tickets, /setFilter\('all'\)/)
  assert.match(tickets, /setDraftCodes\(\{\}\)/)
  assert.match(tickets, /setShowPrintableQrs\(false\)/)
  assert.match(tickets, /function retry\(\)/)
  assert.match(tickets, /setReloadKey\(\(current\) => current \+ 1\)/)
  assert.match(tickets, /if \(error\) return <ErrorState message=\{error\} onRetry=\{retry\} \/>/)
})
