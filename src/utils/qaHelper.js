export const CODEX_TEST_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'
export const CODEX_TEST_EVENT_NAME = 'CODEX_TEST Live Verification Event'
export const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
export const CPB_EVENT_NAME = 'CPB'
export const CODEX_TEST_NOTES = 'Permanent QA fixture. Do not use for real guests. Do not delete unless the organizer explicitly approves.'

export const qaChecklist = [
  'Confirm the live site loads on the primary browser',
  'Confirm the live site loads in an Incognito or Private Window',
  'Confirm the live site loads on the second laptop or browser',
  'Confirm login works with the approved second Google account',
  'Confirm clean account routes load with no selected Working Event',
  'Confirm no AppErrorBoundary fallback appears on Dashboard, Events, Registrations, Imports, Tickets, Check-In, QA, Settings, Operations, or Communications',
  'Confirm CODEX_TEST is selected as the Working Event before write testing',
  'Start QA at https://gathervibeshub.web.app/login',
  'Confirm ticket search works by ticket code, guest name, buyer/contact, email, phone, and group when present',
  'Confirm QR camera lookup works and camera permission is not blocked',
  'Confirm manual ticket-code fallback works when camera scanning is unavailable',
  'Test check-in permission with one CODEX_TEST guest',
  'Confirm the checked-in guest appears in the Checked In list',
  'Confirm checked-in persons count increases using personsAttending',
  'Confirm total registrations matches the number of form entries',
  'Confirm total persons attending matches guest count inside entries',
  'Confirm empty registration lists show 0 registrations / 0 guests',
  'Confirm remaining persons updates after check-in',
  'Confirm dashboard capacity equals persons attending divided by event capacity',
  'Confirm duplicate check-in is blocked',
  'Confirm audit logs remain append-only after ticket and check-in actions',
  'Confirm CPB is not selected and not touched during QA',
  'Confirm a Ticket Code can be manually entered or edited',
  'Confirm the next event-style ticket code can be generated',
  'Confirm an imported ticket code is preserved through preview and import',
  'Create, edit, and delete one manual CODEX_TEST registration',
  'Import a small CSV only after preview confirms the rows',
  'Import an XLSX workbook only after preview confirms the rows',
  'Confirm finance totals: expected, collected, outstanding, door, and complimentary',
  'Confirm missing ticket price, missing paid amount, and balance mismatch warnings',
  'Confirm QR payload still contains ticket code only and no money or private data',
  'Confirm CPB Payment Audit Backfill appears in Import Center as a separated dry-run source',
  'Confirm CPB dry-run flags review-needed rows, unmatched rows, and create candidates without writes',
  'Confirm Registration filters include Door Paid, To Pay at Door, Missing Ticket Code, Missing Amount, and Needs Review',
  'Confirm Registration count cards are clickable and finance warnings filter to exact rows',
  'Confirm group/person explanations and Group of X badges are visible for group registrations',
  'Confirm Tickets advanced filters include Pending and Needs Review',
  'Confirm Check-In filters include Group Registrations, Complimentary, and Needs Review',
  'Confirm Check-In list mode supports selected-row check-in, undo, and copy actions with confirmation',
  'Confirm Event Operations / Money Tracker opens without a permission/load error and uses only the selected Working Event',
  'Confirm Operations form helper text explains type, category, label, amount, method, reference, paid by/to, status, and Unknown',
  'Confirm CPB dry-run review tabs and confidence filter are visible',
  'Confirm Cole/spreadsheet independent review note appears before CPB approval',
  'Confirm current user role appears in Settings and System Health',
  'Confirm approved-admin allowlist remains active and no public access is enabled',
  'Confirm backlog visibility order is closed, current, next, operational, access/staff, Event Operations, QA/reliability, deferred, long-term, out of scope',
  'Confirm Phase 17C-B scanner smoke PASS is preserved: CODEX_TEST only, no CPB access, no scanner undo',
  'Confirm Phase 17D-C Access & Roles area is admin-only, read-only, and does not claim live approval, revoke, assign, edit, or lead-scanner features',
  'Confirm scanner success, duplicate, pending-payment, and no-ticket messaging is clear on /scanner',
  'Confirm scanner next guest flow clears safely and returns focus to manual lookup where practical',
  'Confirm scanner offline wording says no offline writes are supported',
  'Confirm Communications Pro segments and templates are copy-only',
  'Confirm copy packet, recipient list, and CSV packet work without sending messages',
  'Confirm AI writing, Gmail/Outlook OAuth, Google Sheets OAuth, Cloud Functions, and Storage remain deferred',
  'Confirm CPB is protected and not used for role or communications QA',
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
    'Buyer Name,Attendee Names,Email,Phone,Group Name,Persons Attending,Payment Status,Payment Reference,Dietary Notes,Ticket Code,Preferred School',
    `${prefix} Buyer One,"${prefix} Guest One",${prefix.toLowerCase()}_guest1@example.com,2465550101,${prefix} Group,1,paid,${prefix}-001,No nuts,QATEST-001,North School`,
    `${prefix} Buyer Two,"${prefix} Guest Two; ${prefix} Guest Three",${prefix.toLowerCase()}_guest2@example.com,2465550102,${prefix} Group,2,pending,${prefix}-002,Vegetarian,,West School`,
    `${prefix} Shared Buyer,"${prefix} Door Guest",${prefix.toLowerCase()}_shared@example.com,2465550103,${prefix} Group,1,Door Payment,${prefix}-003,Pay at door,DOOR 001,Central School`,
    `${prefix} Shared Buyer,"${prefix} Comp Guest",${prefix.toLowerCase()}_shared@example.com,2465550103,${prefix} Group,1,complimentary,${prefix}-004,Duplicate-like shared contact for review,QATEST-004,Central School`,
  ].join('\n')
}

export function isCodexTestWorkingEvent(activeEvent) {
  return activeEvent?.eventId === CODEX_TEST_EVENT_ID || activeEvent?.eventName === CODEX_TEST_EVENT_NAME
}
