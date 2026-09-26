import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('web registration summary service uses event-scoped checkedIn aggregation', async () => {
  const source = await readFile('src/services/registrationSummaryService.js', 'utf8')
  assert.match(source, /getCountFromServer/)
  assert.match(source, /where\('eventId', '==', eventId\)/)
  assert.match(source, /where\('checkedIn', '==', true\)/)
  assert.match(source, /notCheckedIn/)
  assert.match(source, /subscribeToRecentRegistrationRows/)
  assert.match(source, /orderBy\('createdAt', 'desc'\)/)
  assert.match(source, /limit\(rowLimit\)/)
})

test('web summary read models accept aggregate counts without replacing row-derived data', async () => {
  const dashboard = await readFile('src/features/dashboard/readModels/dashboardOverviewModel.js', 'utf8')
  const review = await readFile('src/utils/eventReview.js', 'utf8')
  assert.match(dashboard, /registrationSummary/)
  assert.match(review, /registrationSummary/)
  assert.match(review, /buildFinanceClassificationContext\(rows, event\)/)
  assert.match(dashboard, /recentRegistrations/)
  assert.match(dashboard, /recentActivity: buildRecentActivity/)
})
