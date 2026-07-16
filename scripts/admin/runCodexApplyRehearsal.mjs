/* global process, console, fetch */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CODEX_TEST_EVENT_ID,
  CPB_EVENT_ID,
  PHASE_23G_MANIFEST_SHA256,
  assertPhase23gApplyLock,
  buildRegistrationApplyPlan,
  expectedPhase23gApprovalPhrase,
} from '../../src/utils/manifestApplyEngine.js'

const projectId = 'gathervibeshub'
const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_CODEX_TEST_Apply_Rehearsal'
const runId = `PH23G_CODEX_REHEARSAL_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
const registrationId = runId
const approvalPhrase = expectedPhase23gApprovalPhrase()

async function firebaseCliToken() {
  const auth = await import(pathToFileURL('C:\\Users\\Jaylan\\AppData\\Roaming\\npm\\node_modules\\firebase-tools\\lib\\auth.js').href)
  const accounts = auth.getAllAccounts()
  const account = accounts.find((item) => item.user?.email)
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required for CODEX_TEST rehearsal.')
  const token = await auth.getAccessToken(account.tokens.refresh_token, [])
  return token.access_token
}

function fieldValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Number.isInteger(value)) return { integerValue: String(value) }
  if (typeof value === 'number') return { doubleValue: value }
  return { stringValue: String(value) }
}

function documentFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fieldValue(value)]))
}

function firestoreValue(value) {
  if (!value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  return null
}

function firestoreDocument(doc) {
  if (!doc?.fields) return null
  return Object.fromEntries(Object.entries(doc.fields).map(([key, value]) => [key, firestoreValue(value)]))
}

function docName(collectionName, docId) {
  return `projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`
}

async function firestoreCommit(writes, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  })
  if (!response.ok) throw new Error(`Firestore commit failed: ${response.status} ${await response.text()}`)
  return response.json()
}

async function firestoreGet(collectionName, docId, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${docName(collectionName, docId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Firestore get failed: ${response.status} ${await response.text()}`)
  return response.json()
}

function auditDoc(action, targetId, details = {}) {
  const auditId = `${runId}_${action.replace(/\W/g, '_')}`
  return {
    name: docName('auditLogs', auditId),
    fields: documentFields({
      logId: auditId,
      eventId: CODEX_TEST_EVENT_ID,
      action,
      targetType: 'registration',
      targetId,
      performedBy: 'phase23g-rehearsal-script',
      timestamp: new Date().toISOString(),
      details: JSON.stringify(details),
    }),
  }
}

async function main() {
  assertPhase23gApplyLock({
    targetEventId: CODEX_TEST_EVENT_ID,
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase,
    rehearsalOnly: true,
  })

  let cpbDenied = false
  try {
    assertPhase23gApplyLock({
      targetEventId: CPB_EVENT_ID,
      manifestSha256: PHASE_23G_MANIFEST_SHA256,
      approvalPhrase,
      rehearsalOnly: true,
    })
  } catch {
    cpbDenied = true
  }
  if (!cpbDenied) throw new Error('CPB denial check failed.')

  const token = await firebaseCliToken()
  await mkdir(outputRoot, { recursive: true })

  const initialRegistration = {
    registrationId,
    eventId: CODEX_TEST_EVENT_ID,
    fullName: runId,
    buyerName: runId,
    attendeeNames: runId,
    email: null,
    phone: null,
    personsAttending: 1,
    ticketPrice: 25,
    amountDue: 25,
    amountPaid: 0,
    balanceDue: 25,
    paymentStatus: 'pending',
    paymentMethod: 'unknown',
    paymentReference: null,
    priceTier: 'Rehearsal',
    ticketStatus: 'no-ticket-assigned',
    ticketCode: null,
    checkedIn: false,
    source: 'phase23g-rehearsal',
    notes: 'Synthetic CODEX_TEST apply rehearsal record. Safe to delete.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const proposal = {
    changedFields: ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue', 'paymentStatus', 'paymentMethod', 'priceTier'],
    proposedValues: {
      ticketPrice: 25,
      amountDue: 25,
      amountPaid: 25,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      priceTier: 'Rehearsal Paid',
    },
  }
  const plan = buildRegistrationApplyPlan({ registration: initialRegistration, proposal, targetEventId: CODEX_TEST_EVENT_ID })

  await writeFile(join(outputRoot, `${runId}_backup.json`), JSON.stringify({
    runId,
    registrationId,
    targetEventId: CODEX_TEST_EVENT_ID,
    before: null,
    syntheticRegistration: initialRegistration,
    plan,
  }, null, 2))

  await firestoreCommit([
    {
      update: {
        name: docName('registrations', registrationId),
        fields: documentFields(initialRegistration),
      },
    },
    { update: auditDoc('registration.create', registrationId, { phase: '23G', rehearsalOnly: true }) },
  ], token)

  await firestoreCommit([
    {
      update: {
        name: docName('registrations', registrationId),
        fields: documentFields({ ...plan.after, updatedAt: new Date().toISOString() }),
      },
      updateMask: { fieldPaths: [...plan.changedFields, 'updatedAt'] },
    },
    { update: auditDoc('registration.finance-update', registrationId, plan.audit.details) },
  ], token)

  const updated = firestoreDocument(await firestoreGet('registrations', registrationId, token))
  const updateVerified = updated?.eventId === CODEX_TEST_EVENT_ID
    && updated.paymentStatus === 'paid'
    && updated.amountPaid === 25
    && updated.balanceDue === 0

  await firestoreCommit([
    { delete: docName('registrations', registrationId) },
    { update: auditDoc('registration.delete', registrationId, { phase: '23G', rehearsalOnly: true, cleanup: true }) },
  ], token)

  const afterCleanup = await firestoreGet('registrations', registrationId, token)
  const cleanupVerified = afterCleanup === null
  const result = {
    outputRoot,
    runId,
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase,
    targetEventId: CODEX_TEST_EVENT_ID,
    cpbEventId: CPB_EVENT_ID,
    cpbDenied,
    createdSyntheticRegistration: true,
    updateVerified,
    cleanupVerified,
    firestoreWrites: {
      registrationsCreated: 1,
      registrationsUpdated: 1,
      registrationsDeleted: 1,
      auditLogsCreated: 3,
      operationsWrites: 0,
      ticketWrites: 0,
      checkInWrites: 0,
      cpbWrites: 0,
    },
  }
  await writeFile(join(outputRoot, `${runId}_result.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
