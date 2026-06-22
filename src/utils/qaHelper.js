export const CODEX_TEST_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'
export const CODEX_TEST_EVENT_NAME = 'CODEX_TEST Live Verification Event'
export const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
export const CPB_EVENT_NAME = 'CPB'
export const CODEX_TEST_NOTES = 'Permanent QA fixture. Do not use for real guests. Do not delete unless the organizer explicitly approves.'

export const qaChecklist = [
  'Test check-in permission with one CODEX_TEST guest',
  'Confirm the checked-in guest appears in the Checked In list',
  'Confirm checked-in persons count increases using personsAttending',
  'Confirm duplicate check-in is blocked',
  'Confirm a Ticket Code can be manually entered or edited',
  'Confirm the next event-style ticket code can be generated',
  'Confirm an imported ticket code is preserved through preview and import',
  'Create, edit, and delete one manual CODEX_TEST registration',
  'Import a small CSV only after preview confirms the rows',
  'Import an XLSX workbook only after preview confirms the rows',
  'Assign, regenerate, and unassign a ticket code',
  'Verify auditLogs show registration, ticket, and check-in activity',
]

function pad(value) {
  return String(value).padStart(2, '0')
}

export function buildQaTestPrefix(date = new Date()) {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `CODEX_TEST_${year}${month}${day}_${hour}${minute}`
}

export function buildQaSampleCsv(prefix = buildQaTestPrefix()) {
  return [
    'Full name,Email,Phone,Group name,Persons attending,Payment status,Payment reference,Ticket Code,Notes',
    `${prefix} Guest One,${prefix.toLowerCase()}_guest1@example.com,2465550101,${prefix} Group,1,complimentary,${prefix}-001,QATEST-001,Manual QA import row for CODEX_TEST only`,
    `${prefix} Guest Two,${prefix.toLowerCase()}_guest2@example.com,2465550102,${prefix} Group,2,pending,${prefix}-002,QATEST-002,XLSX or CSV QA row for CODEX_TEST only`,
  ].join('\n')
}

export function isCodexTestWorkingEvent(activeEvent) {
  return activeEvent?.eventId === CODEX_TEST_EVENT_ID || activeEvent?.eventName === CODEX_TEST_EVENT_NAME
}
