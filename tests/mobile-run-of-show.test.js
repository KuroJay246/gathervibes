import test from 'node:test'
import assert from 'node:assert/strict'
import { groupRunOfShowItems, sortRunOfShowItems } from '../apps/mobile/src/lib/runOfShowModel.js'

const fixture = [
  { itemId: 'later', title: 'Later', date: '2026-08-24', startTime: '12:30', status: 'Planned' },
  { itemId: 'current', title: 'Current', date: '2026-08-24', startTime: '09:00', status: 'In Progress' },
  { itemId: 'done', title: 'Done', date: '2026-08-24', startTime: '08:00', status: 'Completed' },
  { itemId: 'next', title: 'Next', date: '2026-08-24', startTime: '10:00', status: 'Confirmed' },
  { itemId: 'delayed', title: 'Delayed', date: '2026-08-24', startTime: '08:30', status: 'Delayed' },
]

test('Run of Show ordering is chronological and legacy-safe for missing fields', () => {
  assert.deepEqual(sortRunOfShowItems([{ title: 'B' }, { title: 'A' }]).map((item) => item.title), ['A', 'B'])
  assert.deepEqual(sortRunOfShowItems(fixture).map((item) => item.itemId), ['done', 'delayed', 'current', 'next', 'later'])
})

test('Run of Show groups current, next, upcoming, delayed, and completed states', () => {
  const groups = groupRunOfShowItems(fixture)
  assert.equal(groups.current[0].itemId, 'current')
  assert.equal(groups.next[0].itemId, 'next')
  assert.equal(groups.upcoming[0].itemId, 'later')
  assert.equal(groups.delayed[0].itemId, 'delayed')
  assert.equal(groups.completed[0].itemId, 'done')
  assert.deepEqual(groupRunOfShowItems([]).ordered, [])
})

test('native Operations remains event-scoped, bounded, searchable, and read-only', async () => {
  const fs = await import('node:fs/promises')
  const [service, screen] = await Promise.all([
    fs.readFile(new URL('../apps/mobile/src/services/operations.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/mobile/src/app/operations.jsx', import.meta.url), 'utf8'),
  ])

  assert.match(service, /where\('eventId', '==', eventId\)/)
  assert.match(service, /limit\(200\)/)
  assert.match(screen, /operations-search-input/)
  assert.match(screen, /No operations recorded/)
  assert.doesNotMatch(screen, /createLedgerEntry|updateLedgerEntry|deleteLedgerEntry/)
})

test('native ticket details preserve current and legacy check-in fields', async () => {
  const fs = await import('node:fs/promises')
  const [guestDetail, ticketDetail] = await Promise.all([
    fs.readFile(new URL('../apps/mobile/src/app/guest/[registrationId].jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/mobile/src/app/guest/[registrationId]/ticket.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(guestDetail, /checkedInAt \|\| registration\?\.checkInTime/)
  assert.match(ticketDetail, /checkedInAt \|\| registration\?\.checkInTime/)
  assert.match(ticketDetail, /ticketType \|\| registration\?\.ticketCategory \|\| registration\?\.category/)
})

test('native Home and Reports use bounded operational summaries', async () => {
  const fs = await import('node:fs/promises')
  const [home, reports] = await Promise.all([
    fs.readFile(new URL('../apps/mobile/src/app/(app)/home.jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/mobile/src/app/(app)/reports.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(home, /subscribeToOperationsLedger/)
  assert.match(home, /Needs attention/)
  assert.match(reports, /attendancePercent/)
  assert.match(reports, /subscribeToTasks/)
  assert.match(reports, /subscribeToOperationsLedger/)
  assert.match(reports, /label="Paid"/)
  assert.match(reports, /label="Pending"/)
})

test('native Home and Reports use server-side registration aggregation', async () => {
  const fs = await import('node:fs/promises')
  const [home, reports, registrations] = await Promise.all([
    fs.readFile(new URL('../apps/mobile/src/app/(app)/home.jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/mobile/src/app/(app)/reports.jsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../apps/mobile/src/services/registrations.js', import.meta.url), 'utf8'),
  ])
  assert.match(registrations, /getCountFromServer/)
  assert.match(registrations, /loadRegistrationSummary/)
  assert.doesNotMatch(home, /subscribeToRegistrations/)
  assert.doesNotMatch(reports, /subscribeToRegistrations/)
  assert.match(home, /useFocusEffect/)
  assert.match(reports, /useFocusEffect/)
})

test('mobile planning listeners use bounded service reads', async () => {
  const fs = await import('node:fs/promises')
  const paths = [
    '../apps/mobile/src/services/contacts.js',
    '../apps/mobile/src/services/tasks.js',
    '../apps/mobile/src/services/runOfShow.js',
    '../apps/mobile/src/services/documents.js',
  ]
  const sources = await Promise.all(paths.map((path) => fs.readFile(new URL(path, import.meta.url), 'utf8')))
  for (const source of sources) assert.match(source, /limit\(/)
})
