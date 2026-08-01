import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  IMPORT_RECORD_TYPES,
  IMPORT_SOURCES,
  IMPORT_WORKFLOW_STEPS,
} from '../src/utils/importSources.js'
import {
  FORM_INBOX_COLUMNS,
  FORM_REVIEW_ACTIONS,
  applyFormInboxAction,
  buildFormInboxSummary,
  buildManualFormConnection,
  formConnectionStatusLabel,
  formResponseStatusLabel,
} from '../src/utils/formResponseInbox.js'
import {
  COMMUNICATION_TEMPLATES,
  MESSAGE_TONE_OPTIONS,
  MESSAGE_WORKFLOW_STEPS,
  buildMessageSubject,
  missingMergeFields,
} from '../src/utils/communicationsUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Import Center source and record language is honest and review scoped', () => {
  assert.deepEqual(IMPORT_WORKFLOW_STEPS, [
    'Source',
    'Record Type',
    'Upload/Paste',
    'Template',
    'Headers',
    'Mapping',
    'Validation',
    'Review',
    'Confirm',
    'Result',
  ])

  assert.ok(IMPORT_SOURCES.some((source) => source.label === 'Google Forms CSV' && source.helperText === 'Download responses from Google Forms or its linked response Sheet, then upload the CSV.' && source.connectionStatus === 'Manual upload'))
  assert.ok(IMPORT_SOURCES.some((source) => source.label === 'Google Sheets Export' && source.helperText === 'Download your Google Sheet as CSV or Excel, then upload the downloaded file.' && /not a live Google Sheets connection/.test(source.connectionStatus)))
  assert.ok(IMPORT_SOURCES.some((source) => source.label === 'PDF Table' && source.helperText === 'Use a readable text-based PDF where supported. Scanned PDFs are not automatically read.'))

  const labels = IMPORT_RECORD_TYPES.map((type) => type.label)
  for (const label of ['Guest Registration', 'Attendee List', 'Baker Application', 'Vendor Application', 'Sponsor Inquiry', 'Volunteer', 'School Participation', 'Feedback', 'Custom Review Record']) {
    assert.ok(labels.includes(label))
  }
  assert.equal(IMPORT_RECORD_TYPES.find((type) => type.value === 'guest-registration').writeSupport, 'supported')
  assert.ok(IMPORT_RECORD_TYPES.filter((type) => type.value !== 'guest-registration').every((type) => type.writeSupport === 'review-only'))
})

test('Response Inbox exposes review filters, safe statuses, and no unsupported import action', () => {
  assert.deepEqual(FORM_INBOX_COLUMNS, [
    'New',
    'Needs Review',
    'Approved',
    'Ready to Import',
    'Imported',
    'Waiting for Information',
    'Wait-Listed',
    'Duplicates',
    'Rejected',
    'History',
  ])
  assert.ok(FORM_REVIEW_ACTIONS.some(([action, label]) => action === 'review' && label === 'Review'))
  assert.ok(FORM_REVIEW_ACTIONS.some(([action, label]) => action === 'request-information' && label === 'Request Information'))
  assert.equal(FORM_REVIEW_ACTIONS.some(([, label]) => label === 'Import'), false)

  const connection = buildManualFormConnection({ eventId: 'event-1', eventName: 'CODEX_TEST' }, { status: 'draft' })
  assert.equal(formConnectionStatusLabel(connection), 'Manual Response Review')
  assert.equal(formConnectionStatusLabel({ status: 'packaged' }), 'Automatic Receiver Packaged but Not Deployed')
  assert.equal(formResponseStatusLabel('information-requested'), 'Waiting for Information')

  const waiting = applyFormInboxAction({ responseId: 'r1', status: 'needs-review' }, 'request-information')
  const duplicate = applyFormInboxAction({ responseId: 'r2', status: 'needs-review' }, 'mark-duplicate')
  const linked = applyFormInboxAction({ responseId: 'r3', status: 'needs-review' }, 'link-existing')
  const summary = buildFormInboxSummary([waiting, duplicate, linked])
  assert.equal(summary.waitingForInformation, 1)
  assert.equal(summary.duplicateCount, 1)
  assert.equal(summary.historyCount, 1)
})

test('Import and inbox pages show final confirmation, status details, and copy-only handoff', async () => {
  const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const importSummary = await readFile('src/components/imports/ImportSummary.jsx', 'utf8')

  assert.match(importsPage, /Current step/)
  assert.match(importsPage, /Final confirmation summary/)
  assert.match(importsPage, /Working Event/)
  assert.match(importsPage, /Import Destination/)
  assert.match(importsPage, /Open Message Builder to copy request/)
  assert.match(importsPage, /No response becomes a registration automatically/)
  assert.match(importSummary, /Operation status/)
  assert.match(importSummary, /Retry Remaining/)
  assert.match(importSummary, /Already imported/)
})

test('Message Builder is structured, deterministic, and copy only', async () => {
  const page = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  assert.deepEqual(MESSAGE_WORKFLOW_STEPS, ['Working Event', 'Purpose', 'Recipient Context', 'Template', 'Personalize', 'Preview', 'Copy'])
  assert.deepEqual(MESSAGE_TONE_OPTIONS, ['Professional', 'Friendly', 'Brief'])
  assert.match(page, /Message Builder prepares text only\. It does not send email or WhatsApp messages\./)
  assert.match(page, /Copy Subject/)
  assert.match(page, /Copy Both/)
  assert.match(page, /Copied to clipboard\. No message was sent\./)
  assert.doesNotMatch(page, /Email sent|WhatsApp sent|Delivered/)

  for (const id of ['supplier-follow-up', 'commitment-reminder', 'task-follow-up', 'response-info-request']) {
    assert.ok(COMMUNICATION_TEMPLATES.some((template) => template.id === id))
  }
  assert.ok(COMMUNICATION_TEMPLATES.every((template) => template.purpose && template.audience && template.subject && template.version && Array.isArray(template.fields)))

  const template = COMMUNICATION_TEMPLATES.find((item) => item.id === 'ticket-reminder')
  const subject = buildMessageSubject(template, { fullName: 'Test Guest', ticketCode: 'T-001' }, { eventName: 'CODEX_TEST Live Verification Event' })
  assert.equal(subject, 'CODEX_TEST Live Verification Event ticket reminder')
  assert.deepEqual(missingMergeFields('Hello {{guestName}}, code {{ticketCode}} for {{eventName}}.', { fullName: 'Test Guest' }, { eventName: 'CODEX_TEST' }), ['ticketCode'])
})

test('Refinement guardrails preserve QR, dependencies, rules, indexes, and access boundaries', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')

  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.equal(qrPayloadForTicketCode('INTAKE-001'), 'GSV:TICKET:INTAKE-001')
  assert.doesNotMatch(rules, /formResponses|formConnections|allow read, write: if true/)
  assert.doesNotMatch(indexes, /formResponses|formConnections/)
  assert.match(access, /scanner:[\s\S]*'\/scanner'/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/imports'|scanner:[\s\S]*'\/communications'/)
  assert.doesNotMatch(JSON.stringify(packageJson.dependencies), /gmail|twilio|openai|googleapis/i)
})
