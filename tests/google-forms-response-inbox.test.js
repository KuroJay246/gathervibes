import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { parseCSV } from '../src/utils/importUtils.js'
import {
  FORM_INBOX_COLUMNS,
  FORM_REVIEW_ACTIONS,
  FORM_TARGET_TYPES,
  applyFormInboxAction,
  buildFormInboxSummary,
  buildFormResponsesFromParsedRows,
  buildManualFormConnection,
  findFormResponseDuplicateCandidates,
  formConnectionStatusLabel,
} from '../src/utils/formResponseInbox.js'
import { validatePayload, verifySignedRequest } from '../integrations/google-forms/function/googleFormsReceiver.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const event = { eventId: 'xPfa0b3KZyLSDnAD2uGI', eventName: 'CODEX_TEST Live Verification Event' }

test('Google Forms inbox is event agnostic and exposes required workflow columns', () => {
  assert.deepEqual(FORM_TARGET_TYPES, [
    'guest-registration',
    'baker-application',
    'vendor-application',
    'sponsor-inquiry',
    'volunteer-application',
    'school-participation',
    'feedback',
    'custom-review-record',
  ])
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
  assert.ok(FORM_REVIEW_ACTIONS.some(([, label]) => label === 'Link to Existing Record'))
})

test('manual Google Forms responses enter review before mapping or import', () => {
  const parsed = parseCSV('Timestamp,Response ID,Full Name,Email Address,Contact Number\n2026-07-30T12:00:00Z,r1,Test Guest,test@example.com,2465550100')
  const connection = buildManualFormConnection(event, { status: 'draft', targetType: 'guest-registration' })
  const responses = buildFormResponsesFromParsedRows(parsed.headers, parsed.rows, { connection })
  const summary = buildFormInboxSummary(responses)

  assert.equal(responses[0].status, 'needs-review')
  assert.equal(formConnectionStatusLabel(connection), 'Manual Response Review')
  assert.match(responses[0].warnings.join(' '), /automatic delivery is disabled/)
  assert.equal(summary.reviewRequired, 1)
  assert.equal(summary.convertible, 0)

  const approved = applyFormInboxAction(responses[0], 'approve')
  assert.equal(approved.status, 'approved')
  assert.equal(buildFormInboxSummary([approved]).convertible, 1)
})

test('response duplicate candidates use response ID, email, phone, and name without auto-merge', () => {
  const response = {
    responseId: 'r1',
    respondentSummary: { name: 'Existing Guest', email: 'existing@example.com', phone: '2465550100' },
  }
  const candidates = findFormResponseDuplicateCandidates(response, [{ responseId: 'r1' }], [
    { fullName: 'Existing Guest', email: 'existing@example.com', phone: '2465550100' },
  ])

  assert.ok(candidates.includes('same Google response ID already exists in the inbox'))
  assert.ok(candidates.includes('email matches an existing registration'))
  assert.ok(candidates.includes('contact number matches an existing registration'))
  assert.ok(candidates.includes('name matches an existing registration'))
})

test('signed HTTPS receiver rejects missing, invalid, stale, wrong, and disabled submissions', () => {
  const secret = 'a'.repeat(40)
  const payload = {
    connectionId: 'conn-1',
    eventId: event.eventId,
    formId: 'form-1',
    responseId: 'response-1',
    receivedAt: '2026-07-30T12:00:00Z',
    answers: [{ itemId: '1', title: 'Full Name', response: 'Test Guest' }],
  }
  const body = JSON.stringify(payload)
  const timestamp = String(Date.now())
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  const allowed = new Map([['conn-1', { status: 'active', formId: 'form-1', eventId: event.eventId, targetType: 'guest-registration' }]])

  assert.equal(verifySignedRequest({ method: 'GET', headers: {}, rawBody: body, secret, allowedConnections: allowed }).status, 405)
  assert.equal(verifySignedRequest({ method: 'POST', headers: {}, rawBody: body, secret, allowedConnections: allowed }).status, 401)
  assert.equal(verifySignedRequest({ method: 'POST', headers: { 'x-gsv-timestamp': timestamp, 'x-gsv-signature': 'bad', 'x-gsv-idempotency-key': 'conn-1:response-1' }, rawBody: body, secret, allowedConnections: allowed }).status, 401)
  assert.equal(verifySignedRequest({ method: 'POST', headers: { 'x-gsv-timestamp': String(Date.now() - 600000), 'x-gsv-signature': signature, 'x-gsv-idempotency-key': 'conn-1:response-1' }, rawBody: body, secret, allowedConnections: allowed }).status, 401)
  assert.equal(verifySignedRequest({ method: 'POST', headers: { 'x-gsv-timestamp': timestamp, 'x-gsv-signature': signature, 'x-gsv-idempotency-key': 'conn-1:response-1' }, rawBody: body, secret, allowedConnections: allowed }).status, 202)
  assert.equal(validatePayload({ ...payload, formId: 'wrong' }, allowed).status, 403)
  assert.equal(validatePayload(payload, new Map([['conn-1', { ...allowed.get('conn-1'), status: 'disabled' }]])).status, 403)
})

test('Import Center and integration package preserve guardrails', async () => {
  const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const code = await readFile('integrations/google-forms/Code.gs', 'utf8')
  const receiver = await readFile('integrations/google-forms/function/googleFormsReceiver.js', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

  assert.match(importsPage, /Google Forms Response Inbox/)
  assert.match(importsPage, /No response becomes a registration automatically/)
  assert.match(importsPage, /Continue Approved to Mapping/)
  assert.match(code, /PropertiesService\.getScriptProperties/)
  assert.match(code, /computeHmacSha256Signature/)
  assert.match(receiver, /idempotencyKey/)
  assert.match(receiver, /originalResponseSnapshot/)
  assert.doesNotMatch(receiver, /Access-Control-Allow-Origin.*\*/)
  assert.equal(qrPayloadForTicketCode('FORM-001'), 'GSV:TICKET:FORM-001')
  assert.doesNotMatch(rules, /formResponses|formConnections/)
  assert.doesNotMatch(indexes, /formResponses|formConnections/)
  assert.equal(packageJson.dependencies.xlsx, undefined)
})
