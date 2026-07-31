import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  assertBulkPaymentStatusAllowed,
  buildOperationManifest,
  operationAuditLogId,
  summarizeBulkOperation,
  validateBulkPaymentStatus,
} from '../src/utils/bulkOperation.js'
import { safeAuditChanges } from '../src/utils/auditUtils.js'

const event = {
  eventId: 'xPfa0b3KZyLSDnAD2uGI',
  eventName: 'CODEX_TEST Live Verification Event',
  currency: 'BBD',
}

function registration(overrides = {}) {
  return {
    registrationId: 'reg-1',
    eventId: event.eventId,
    fullName: 'QA Bulk Guest',
    personsAttending: 1,
    ticketPrice: 100,
    amountDue: 100,
    amountPaid: 0,
    balanceDue: 100,
    paymentStatus: 'pending',
    ...overrides,
  }
}

test('Immediate Stabilization operation manifests are deterministic and chunk-aware', () => {
  const manifest = buildOperationManifest({
    operationType: 'registration.import',
    eventId: event.eventId,
    user: { uid: 'owner-uid' },
    recordIds: Array.from({ length: 51 }, (_, index) => `reg-${index + 1}`),
    chunkSize: 50,
    createdAt: '2026-07-30T00:00:00.000Z',
  })

  assert.equal(manifest.totalRecordCount, 51)
  assert.equal(manifest.chunkCount, 2)
  assert.equal(manifest.eventId, event.eventId)
  assert.equal(manifest.createdAt, '2026-07-30T00:00:00.000Z')
  assert.equal(manifest.status, 'ready')
  assert.equal(
    operationAuditLogId(manifest.operationId, 0, 'reg-1'),
    operationAuditLogId(manifest.operationId, 0, 'reg-1'),
  )
  assert.ok(operationAuditLogId(manifest.operationId, 0, 'reg-1').length <= 128)
})

test('Immediate Stabilization partial completion report separates completed, failed, and unattempted rows', () => {
  const manifest = buildOperationManifest({
    operationType: 'registration.bulk-finance-update',
    eventId: event.eventId,
    user: { uid: 'owner-uid' },
    recordIds: ['r1', 'r2', 'r3', 'r4'],
    chunkSize: 2,
  })
  const result = summarizeBulkOperation(
    manifest,
    [{ chunkIndex: 0, recordIds: ['r1', 'r2'] }],
    { chunkIndex: 1, recordIds: ['r3'], error: 'Injected failure' },
  )

  assert.equal(result.status, 'partial-failure')
  assert.deepEqual(result.completedRecordIds, ['r1', 'r2'])
  assert.deepEqual(result.failedRecordIds, ['r3'])
  assert.deepEqual(result.unattemptedRecordIds, ['r4'])
  assert.match(result.message, /2 of 4 records were updated\. 2 remain unchanged\./)
})

test('Immediate Stabilization payment status validation blocks contradictory bulk updates', () => {
  assert.match(validateBulkPaymentStatus(registration(), 'paid', event), /Paid status requires/)
  assert.match(validateBulkPaymentStatus(registration({ amountDue: 0, amountPaid: 0, balanceDue: 0 }), 'door-list', event), /outstanding balance/)
  assert.match(validateBulkPaymentStatus(registration({ amountDue: 100, amountPaid: 0, balanceDue: 100 }), 'complimentary', event), /Complimentary status/)
  assert.match(validateBulkPaymentStatus(registration({ amountDue: 100, amountPaid: 100, balanceDue: 0 }), 'pending', event), /fully paid/)
  assert.equal(validateBulkPaymentStatus(registration({ amountPaid: 100, balanceDue: 0 }), 'paid', event), '')
  assert.throws(
    () => assertBulkPaymentStatusAllowed([registration()], 'paid', event),
    /Bulk payment status blocked/,
  )
})

test('Immediate Stabilization audit changes include safe field before and after values only', () => {
  const changes = safeAuditChanges(
    { paymentStatus: 'pending', amountPaid: 40, phone: 'private-phone' },
    { paymentStatus: 'paid', amountPaid: 100, phone: 'new-private-phone' },
    ['paymentStatus', 'amountPaid'],
  )

  assert.deepEqual(changes, [
    { field: 'paymentStatus', before: 'pending', after: 'paid' },
    { field: 'amountPaid', before: 40, after: 100 },
  ])
})

test('Immediate Stabilization services expose deterministic audit IDs and operation results', async () => {
  const registrationService = await readFile('src/services/registrationService.js', 'utf8')
  const importService = await readFile('src/services/importService.js', 'utf8')
  const operationsService = await readFile('src/services/operationsLedgerService.js', 'utf8')
  const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(registrationService, /summarizeBulkOperation/)
  assert.match(registrationService, /operationResult/)
  assert.match(registrationService, /assertBulkPaymentStatusAllowed/)
  assert.match(importService, /completedRecordIds/)
  assert.match(importService, /retryRows/)
  assert.match(importService, /operationId/)
  assert.match(operationsService, /safeAuditChanges/)
  assert.match(importsPage, /retryableRows/)
})

test('Immediate Stabilization role wording no longer claims staff rules are unenforced', async () => {
  const accessRoles = await readFile('src/utils/accessRoles.js', 'utf8')

  assert.doesNotMatch(accessRoles, /live staff access does not enforce scoped rules yet/)
  assert.match(accessRoles, /Route gates and Firestore rules keep writes narrow and event-scoped/)
  assert.match(accessRoles, /Assigned-event Operations ledger visibility only/)
})
