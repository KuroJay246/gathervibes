/* global process, console, fetch */
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  APPLY_SUPPORTED_FIELDS,
  CPB_EVENT_ID,
  PHASE_23J_MANIFEST_SHA256,
  assertPhase23jProductionApplyLock,
  expectedPhase23jApprovalPhrase,
} from '../../src/utils/manifestApplyEngine.js'

const projectId = 'gathervibeshub'
const manifestPath = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest\\CPB_Proposal_Manifest_New_Private.json'
const rawAuditPath = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest_Approval\\CPB_Final_Raw_Value_Audit_Private.json'
const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_CPB_Production_Apply'
const runId = `PH23J_CPB_PRODUCTION_APPLY_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
const runDir = join(outputRoot, runId)
const applyMode = process.argv.includes('--apply')
const approvalPhrase = process.env.CPB_PRODUCTION_APPLY_APPROVAL || ''

function sha256(text) {
  return createHash('sha256').update(text).digest('hex').toUpperCase()
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function stableStringify(value) {
  return JSON.stringify(stable(value), null, 2)
}

async function firebaseCliAccessToken() {
  const require = createRequire(import.meta.url)
  const auth = require('C:\\Users\\Jaylan\\AppData\\Roaming\\npm\\node_modules\\firebase-tools\\lib\\auth.js')
  const account = auth.getAllAccounts().find((item) => item?.user?.email)
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required for CPB production apply.')
  const token = await auth.getAccessToken(account.tokens.refresh_token, [])
  if (!token?.access_token) throw new Error('Firebase CLI access token could not be refreshed.')
  return token.access_token
}

function firestoreValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValue)
  if ('mapValue' in value) return firestoreDocument({ fields: value.mapValue.fields || {} })
  return undefined
}

function firestoreDocument(document = {}) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, firestoreValue(value)]))
}

function fieldValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Number.isInteger(value)) return { integerValue: String(value) }
  if (typeof value === 'number') return { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fieldValue) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fieldValue(item)])) } }
  }
  return { stringValue: String(value) }
}

function documentFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fieldValue(value)]))
}

function docName(collectionName, docId) {
  return `projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`
}

async function firestoreGet(collectionName, docId, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${docName(collectionName, docId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Firestore get failed for ${collectionName}/${docId}: ${response.status} ${await response.text()}`)
  return response.json()
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

function decodeRawAuditValue(value) {
  if (typeof value === 'string' && /^".*"$/.test(value)) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function assertSupportedProposal(proposal) {
  const unsupported = (proposal.changedFields || []).filter((field) => !APPLY_SUPPORTED_FIELDS.includes(field))
  if (unsupported.length) throw new Error(`${proposal.proposalId} has unsupported fields: ${unsupported.join(', ')}`)
  for (const field of proposal.changedFields || []) {
    if (!Object.hasOwn(proposal.proposedValues || {}, field)) throw new Error(`${proposal.proposalId} is missing proposed value for ${field}`)
  }
}

function auditWrite(proposal, changedFields, now) {
  const auditId = `${runId}_${proposal.proposalId}_registration_finance_update`
  return {
    update: {
      name: docName('auditLogs', auditId),
      fields: documentFields({
        logId: auditId,
        eventId: CPB_EVENT_ID,
        action: 'registration.finance-update',
        targetType: 'registration',
        targetId: proposal.registrationId,
        performedBy: 'phase23j-production-apply-script',
        timestamp: now,
        details: {
          phase: '23J',
          manifestSha256: PHASE_23J_MANIFEST_SHA256,
          approvalPhraseSha256: sha256(approvalPhrase),
          proposalId: proposal.proposalId,
          changedFields: changedFields.join(','),
          rawAuditValidated: true,
        },
      }),
    },
  }
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

async function main() {
  if (!approvalPhrase) throw new Error('Set CPB_PRODUCTION_APPLY_APPROVAL to the exact Phase 23J approval phrase.')
  const [manifestText, rawAuditText] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readFile(rawAuditPath, 'utf8'),
  ])
  const manifest = JSON.parse(manifestText)
  const rawAudit = JSON.parse(rawAuditText)
  const manifestForHash = { ...manifest }
  delete manifestForHash.manifestSha256
  const recomputedManifestHash = sha256(stableStringify(manifestForHash))

  if (manifest.manifestSha256 !== PHASE_23J_MANIFEST_SHA256) throw new Error('Manifest file hash does not match Phase 23J lock.')
  if (rawAudit.manifestSha256 !== PHASE_23J_MANIFEST_SHA256) throw new Error('Raw audit artifact hash does not match Phase 23J lock.')
  if (manifest.eventId !== CPB_EVENT_ID) throw new Error('Manifest is not scoped to CPB.')
  if (manifest.writesPerformed !== false) throw new Error('Manifest indicates writes were already performed.')

  const proposals = manifest.proposals || []
  assertPhase23jProductionApplyLock({
    targetEventId: manifest.eventId,
    manifestSha256: manifest.manifestSha256,
    approvalPhrase,
    dryRun: !applyMode,
    proposalCount: proposals.length,
  })
  proposals.forEach(assertSupportedProposal)

  const rawRows = rawAudit.fieldRows || []
  const rawByProposalField = new Map(rawRows.map((row) => [`${row.proposalId}:${row.field}`, row]))
  const missingRawRows = proposals.flatMap((proposal) => (
    proposal.changedFields
      .filter((field) => !rawByProposalField.has(`${proposal.proposalId}:${field}`))
      .map((field) => `${proposal.proposalId}:${field}`)
  ))
  if (missingRawRows.length) throw new Error(`Raw audit rows missing for ${missingRawRows.slice(0, 5).join(', ')}`)

  const token = await firebaseCliAccessToken()
  await mkdir(runDir, { recursive: true })

  const fetched = []
  const drift = []
  for (const proposal of proposals) {
    const snapshot = await firestoreGet('registrations', proposal.registrationId, token)
    if (!snapshot) {
      drift.push({ proposalId: proposal.proposalId, registrationId: proposal.registrationId, issue: 'missing-registration' })
      continue
    }
    const data = firestoreDocument(snapshot)
    fetched.push({ proposal, snapshot, data })
    if (data.eventId !== CPB_EVENT_ID) {
      drift.push({ proposalId: proposal.proposalId, registrationId: proposal.registrationId, issue: 'event-scope-mismatch' })
    }
    for (const field of proposal.changedFields) {
      const rawRow = rawByProposalField.get(`${proposal.proposalId}:${field}`)
      const actualExists = Object.hasOwn(snapshot.fields || {}, field)
      const actual = actualExists ? firestoreValue(snapshot.fields[field]) : undefined
      const expectedExists = Boolean(rawRow.exists)
      const expected = decodeRawAuditValue(rawRow.rawValue)
      if (actualExists !== expectedExists || (actualExists && actual !== expected)) {
        drift.push({
          proposalId: proposal.proposalId,
          registrationId: proposal.registrationId,
          field,
          expectedExists,
          actualExists,
          expectedRaw: expected,
          actualRaw: actual,
        })
      }
    }
  }

  const changedFieldCounts = proposals.reduce((counts, proposal) => {
    for (const field of proposal.changedFields) counts[field] = (counts[field] || 0) + 1
    return counts
  }, {})
  const backup = {
    runId,
    createdAt: new Date().toISOString(),
    projectId,
    targetEventId: CPB_EVENT_ID,
    applyMode,
    manifestSha256: manifest.manifestSha256,
    recomputedManifestHash,
    approvalPhraseSha256: sha256(approvalPhrase),
    proposals,
    beforeDocuments: fetched.map(({ proposal, snapshot, data }) => ({
      proposalId: proposal.proposalId,
      registrationId: proposal.registrationId,
      updateTime: snapshot.updateTime,
      fields: data,
    })),
  }
  await writeFile(join(runDir, 'backup_private.json'), JSON.stringify(backup, null, 2))

  if (drift.length) {
    await writeFile(join(runDir, 'hold_drift_private.json'), JSON.stringify({ runId, drift }, null, 2))
    throw new Error(`Production drift detected for ${drift.length} field checks. No writes performed.`)
  }

  const summary = {
    runId,
    mode: applyMode ? 'apply' : 'dry-run',
    outputDirectory: runDir,
    targetEventId: CPB_EVENT_ID,
    manifestSha256: manifest.manifestSha256,
    proposalCount: proposals.length,
    fieldChangeCount: proposals.reduce((sum, proposal) => sum + proposal.changedFields.length, 0),
    changedFieldCounts,
    rawAuditRowsValidated: rawRows.length,
    highRiskCount: rawAudit.highRiskCount,
    approvalPhraseAccepted: approvalPhrase === expectedPhase23jApprovalPhrase(),
    productionDriftDetected: false,
    writesPlanned: {
      registrationUpdates: proposals.length,
      auditLogsCreated: proposals.length,
      operationsWrites: 0,
      ticketWrites: 0,
      checkInWrites: 0,
      registrationDeletes: 0,
    },
  }

  if (!applyMode) {
    await writeFile(join(runDir, 'dry_run_result_masked.json'), JSON.stringify(summary, null, 2))
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const now = new Date()
  const writes = fetched.flatMap(({ proposal }) => {
    const changedFields = proposal.changedFields
    return [
      {
        update: {
          name: docName('registrations', proposal.registrationId),
          fields: documentFields({ ...proposal.proposedValues, updatedAt: now }),
        },
        updateMask: { fieldPaths: [...changedFields, 'updatedAt'] },
      },
      auditWrite(proposal, changedFields, now),
    ]
  })

  const commitResults = []
  for (const writeChunk of chunk(writes, 100)) {
    commitResults.push(await firestoreCommit(writeChunk, token))
  }

  const verificationFailures = []
  for (const proposal of proposals) {
    const snapshot = await firestoreGet('registrations', proposal.registrationId, token)
    const data = firestoreDocument(snapshot)
    for (const field of proposal.changedFields) {
      if (data[field] !== proposal.proposedValues[field]) {
        verificationFailures.push({
          proposalId: proposal.proposalId,
          registrationId: proposal.registrationId,
          field,
          expected: proposal.proposedValues[field],
          actual: data[field],
        })
      }
    }
  }
  if (verificationFailures.length) {
    await writeFile(join(runDir, 'verification_failures_private.json'), JSON.stringify({ runId, verificationFailures }, null, 2))
    throw new Error(`Apply verification failed for ${verificationFailures.length} fields.`)
  }

  const result = {
    ...summary,
    commitBatchCount: commitResults.length,
    writesPerformed: {
      registrationUpdates: proposals.length,
      auditLogsCreated: proposals.length,
      operationsWrites: 0,
      ticketWrites: 0,
      checkInWrites: 0,
      registrationDeletes: 0,
    },
    verificationPassed: true,
  }
  await writeFile(join(runDir, 'apply_result_masked.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
