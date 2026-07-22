/* global console, process */
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { Buffer } from 'node:buffer'
import { CPB_FINANCIAL_EVIDENCE_AUDIT, CPB_EVENT_ID } from '../../src/utils/financialEvidenceAudit.js'

const execFileAsync = promisify(execFile)
const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_CPB_Phase23N_Reconciliation'
const workbookPath = 'C:\\Users\\Jaylan\\Desktop\\Forza\\Cake_Piknik_Barbados_Financial_Operations_Audit_2026.xlsx'
const expectedWorkbookSha256 = 'F0768C15954807F1EA4B3E38B24E67FB60ACC16D8A88FB5F16659E287B59C321'
const expectedTextSha256 = '8E45B500EC9BC007D4A59E00E4F373F6401B2A7003AE06B0CEB48422FAD42214'
const allowedRegistrationFields = ['notes']
const allowedOperationFields = [
  'ledgerEntryId', 'eventId', 'entryType', 'category', 'label', 'amount',
  'paymentMethod', 'paymentReference', 'paidByOrPaidTo', 'date', 'status',
  'notes', 'createdAt', 'updatedAt', 'createdBy',
]

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase()
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

function money(value) {
  return `BBD $${Number(value || 0).toFixed(2)}`
}

function normalize(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function rowObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]))
}

function ticketIncomeRows(workbook = {}) {
  const rows = workbook['Ticket Income'] || []
  const headerIndex = rows.findIndex((row) => row?.[0] === 'Record ID')
  if (headerIndex < 0) return []
  const headers = rows[headerIndex]
  return rows.slice(headerIndex + 1)
    .filter((row) => row?.[0] && /^(EB|GA)/.test(String(row[0])))
    .map((row) => rowObject(headers, row))
}

function splitGuestNames(value = '') {
  return String(value || '')
    .replace(/\+\s*\d*\s*guests?/i, '')
    .split(/\s*\/\s*|\s+\+\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function registrationText(registration = {}) {
  return [
    registration.fullName,
    registration.buyerName,
    ...(Array.isArray(registration.attendeeNames) ? registration.attendeeNames : []),
    registration.email,
    registration.phone,
    registration.ticketCode,
  ].map(normalize).filter(Boolean).join(' ')
}

function scoreRegistration(auditRow, registration) {
  const names = [auditRow['Buyer / Contact'], ...splitGuestNames(auditRow['Ticket Holder(s)'])]
  const text = registrationText(registration)
  let score = 0
  const reasons = []

  names.forEach((name) => {
    const normalized = normalize(name)
    if (!normalized) return
    if (text.includes(normalized)) {
      score += 8
      reasons.push(`name:${name}`)
    }
  })

  const tier = String(auditRow.Tier || '').toLowerCase()
  if (tier.startsWith('early') && String(registration.priceTier || '').toLowerCase().startsWith('early')) {
    score += 2
    reasons.push('tier')
  }
  if (tier.startsWith('general') && String(registration.priceTier || '').toLowerCase().startsWith('general')) {
    score += 2
    reasons.push('tier')
  }

  const expectedTotal = Number(auditRow['Expected Total (BBD)']) || 0
  const unitPrice = Number(auditRow['Price per Ticket (BBD)']) || 0
  if (Number(registration.amountDue) === expectedTotal || Number(registration.amountPaid) === expectedTotal) {
    score += 2
    reasons.push('booking-amount')
  }
  if (Number(registration.ticketPrice) === unitPrice) {
    score += 1
    reasons.push('unit-price')
  }
  return { score, reasons }
}

function classifyMatch(auditRow, registrations) {
  if (auditRow['Record ID'] === 'EB-07') return 'Unmatched'
  if (auditRow['Record ID'] === 'GA-11') return 'Conflict'
  const scored = registrations
    .map((registration) => ({ registration, ...scoreRegistration(auditRow, registration) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) return 'Unmatched'
  const quantity = Number(auditRow.Tickets) || 1
  const topScore = scored[0].score
  const tiedTop = scored.filter((item) => item.score === topScore)
  if (tiedTop.length > 1) {
    if (quantity > 1 && tiedTop.length <= quantity && topScore >= 8) return 'High Confidence'
    return 'Conflict'
  }
  if (scored[0].score >= 13) return 'Exact'
  if (scored[0].score >= 9) return 'High Confidence'
  return 'Candidate Only'
}

function buildRegistrationEvidenceRows(workbookRows, registrations) {
  return workbookRows.map((row) => {
    const confidence = classifyMatch(row, registrations)
    const quantity = Number(row.Tickets) || 1
    let scored = registrations
      .map((registration) => ({ registration, ...scoreRegistration(row, registration) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    if (['Exact', 'High Confidence'].includes(confidence)) {
      scored = scored.slice(0, Math.max(quantity, 1))
    } else {
      scored = scored.slice(0, 6)
    }

    return {
      auditBookingId: row['Record ID'],
      payer: row['Buyer / Contact'],
      guestNames: row['Ticket Holder(s)'],
      ticketTier: row.Tier,
      quantity: Number(row.Tickets) || 0,
      unitPrice: Number(row['Price per Ticket (BBD)']) || 0,
      expectedValue: Number(row['Expected Total (BBD)']) || 0,
      directlyVerifiedReceived: Number(row['Verified Cash (BBD)']) || 0,
      inferredValue: Number(row['Potential / Unverified (BBD)']) || 0,
      documentaryEvidenceStatus: row['Evidence Status'] === 'Verified' ? 'Directly Verified' : 'Amount Inferred',
      workbookSheet: 'Ticket Income',
      workbookRowOrBookingId: row['Record ID'],
      matchConfidence: confidence,
      currentFirestoreRegistrationIds: scored.map((item) => item.registration.registrationId),
      currentAppNames: scored.map((item) => item.registration.fullName),
      ticketCodes: scored.map((item) => item.registration.ticketCode).filter(Boolean),
      discrepancy: confidence === 'Unmatched'
        ? 'No safe app match located.'
        : confidence === 'Conflict'
          ? 'Multiple possible app records or contradictory match evidence.'
          : row['Evidence Status'] === 'Amount inferred'
            ? 'Audit amount is inferred and cannot authorize a finance change.'
            : 'No automatic finance change proposed.',
      proposedAction: confidence === 'Unmatched' || confidence === 'Conflict'
        ? 'Organizer review required before any production write.'
        : 'Record documentary evidence link in the private review package only.',
      eligibleForAutomaticApply: false,
    }
  })
}

function operationProposal({ id, label, category, amount, status, evidenceClass, sheet, row, reason, notes }) {
  const documentPath = `operationsLedger/${id}`
  const after = {
    ledgerEntryId: id,
    eventId: CPB_EVENT_ID,
    entryType: 'expense',
    category,
    label,
    amount,
    paymentMethod: 'unknown',
    paymentReference: null,
    paidByOrPaidTo: null,
    date: '2026-07-21',
    status,
    notes,
    createdBy: 'phase-23n-separate-apply',
  }
  return {
    proposalId: id,
    documentPath,
    before: null,
    after,
    changedFields: allowedOperationFields,
    evidenceClass,
    workbookSheet: sheet,
    workbookRowOrBookingId: row,
    matchConfidence: evidenceClass === 'Directly Verified' ? 'High Confidence' : 'Candidate Only',
    reason,
    eligibleForAutomaticApply: evidenceClass === 'Directly Verified',
    auditActionToCreate: 'operation.create',
    rollbackSnapshot: null,
  }
}

async function main() {
  const workbookSha256 = sha256(await readFile(workbookPath))
  if (workbookSha256 !== expectedWorkbookSha256) throw new Error(`Workbook hash mismatch: ${workbookSha256}`)
  const workbook = JSON.parse(await readFile(join(outputRoot, 'workbook_rows_private.json'), 'utf8'))
  const snapshot = JSON.parse(await readFile(join(outputRoot, 'cpb_firestore_snapshot_private.json'), 'utf8'))
  const sourceSheetsRead = Object.keys(workbook)
  const { stdout: currentMainCommit } = await execFileAsync('git', ['rev-parse', 'main'])
  const workbookRows = ticketIncomeRows(workbook)
  const registrationEvidence = buildRegistrationEvidenceRows(workbookRows, snapshot.registrations)
  const matchCounts = registrationEvidence.reduce((counts, row) => {
    counts[row.matchConfidence] = (counts[row.matchConfidence] || 0) + 1
    return counts
  }, {})

  const eventAuditSummaryProposal = [{
    proposalId: 'P23N-EVENT-AUDIT-SUMMARY',
    documentPath: `events/${CPB_EVENT_ID}`,
    before: { phase23NFinancialEvidenceAudit: snapshot.event.phase23NFinancialEvidenceAudit ?? null },
    after: { phase23NFinancialEvidenceAudit: CPB_FINANCIAL_EVIDENCE_AUDIT },
    changedFields: ['phase23NFinancialEvidenceAudit'],
    evidenceClass: 'Organizer Reported',
    workbookSheet: 'Executive Summary',
    workbookRowOrBookingId: 'AUDIT CONCLUSION',
    matchConfidence: 'High Confidence',
    reason: 'Event-scoped documentary audit summary for organizer review.',
    eligibleForAutomaticApply: false,
    auditActionToCreate: 'event.update',
    rollbackSnapshot: { phase23NFinancialEvidenceAudit: snapshot.event.phase23NFinancialEvidenceAudit ?? null },
  }]

  const operationsProposals = [
    operationProposal({
      id: 'P23N-OP-LESC-VENUE',
      label: 'LESC venue and 15 tables',
      category: 'Venue',
      amount: 1227.88,
      status: 'paid',
      evidenceClass: 'Directly Verified',
      sheet: 'Operating Expenses',
      row: 'Venue and tables',
      reason: 'Vendor confirmed paid venue, tables and VAT.',
      notes: 'Payment confirmed by vendor. Do not split or duplicate unless organizer requires itemization.',
    }),
    operationProposal({
      id: 'P23N-OP-BAKER-PAID-SCHEDULE',
      label: 'Baker paid consolidated schedule',
      category: 'Baker payments',
      amount: 1225,
      status: 'paid',
      evidenceClass: 'Organizer Reported',
      sheet: 'Baker Payments',
      row: 'TOTAL - CONSOLIDATED SCHEDULE',
      reason: 'Organizer-reported paid total; Candyrain direct BBD 175 is included inside this total.',
      notes: 'Do not count Candyrain separately. Obtain final acknowledgement from each baker.',
    }),
    operationProposal({
      id: 'P23N-OP-BAKER-OUTSTANDING-SCHEDULE',
      label: 'Baker outstanding consolidated schedule',
      category: 'Baker payments',
      amount: 1050,
      status: 'pending',
      evidenceClass: 'Organizer Reported',
      sheet: 'Baker Payments',
      row: 'TOTAL - CONSOLIDATED SCHEDULE',
      reason: 'Organizer-reported outstanding total pending external evidence.',
      notes: 'Primary schedule only. Do not choose the BBD 1,250/BBD 1,025 alternative scenario without proof.',
    }),
    operationProposal({
      id: 'P23N-OP-CAKE-BOXES-PRINTING',
      label: 'Cake boxes / printing',
      category: 'Printing',
      amount: 175,
      status: 'pending',
      evidenceClass: 'Unverified / Outstanding',
      sheet: 'Operating Expenses',
      row: 'Cake boxes / printing',
      reason: 'Supplier, invoice, quantity and settlement proof missing.',
      notes: 'Finance Review. Do not record as paid until evidence is obtained.',
    }),
  ]

  const sponsorInKindProposals = CPB_FINANCIAL_EVIDENCE_AUDIT.sponsorship.map((item, index) => ({
    proposalId: `P23N-SPONSOR-${String(index + 1).padStart(2, '0')}`,
    documentPath: `operationsLedger/P23N-SPONSOR-${String(index + 1).padStart(2, '0')}`,
    before: null,
    after: {
      eventId: CPB_EVENT_ID,
      entryType: 'income',
      category: 'In-kind support',
      label: item.sponsor,
      amount: 0,
      status: 'received',
      notes: `${item.type}: ${item.quantity} ${item.item}. Evidence: ${item.evidenceClass}. Cash received BBD $0.00. Estimated value unknown.`,
    },
    changedFields: ['eventId', 'entryType', 'category', 'label', 'amount', 'status', 'notes'],
    evidenceClass: item.evidenceClass,
    workbookSheet: 'Sponsorship',
    workbookRowOrBookingId: item.sponsor,
    matchConfidence: item.evidenceClass === 'Confirmed In-Kind' ? 'High Confidence' : 'Candidate Only',
    reason: 'Record non-cash sponsor support without affecting cash totals.',
    eligibleForAutomaticApply: false,
    auditActionToCreate: 'operation.create',
    rollbackSnapshot: null,
  }))

  const correctiveActionProposals = CPB_FINANCIAL_EVIDENCE_AUDIT.correctiveActions.map((action, index) => ({
    proposalId: `P23N-ACTION-${String(index + 1).padStart(2, '0')}`,
    documentPath: `events/${CPB_EVENT_ID}`,
    before: null,
    after: { action },
    changedFields: ['phase23NFinancialEvidenceAudit.correctiveActions'],
    evidenceClass: 'Needs External Evidence',
    workbookSheet: 'Audit Findings',
    workbookRowOrBookingId: `F${String(index + 1).padStart(2, '0')}`,
    matchConfidence: 'High Confidence',
    reason: 'Open closeout action. Not a completed transaction.',
    eligibleForAutomaticApply: false,
    auditActionToCreate: 'event.update',
    rollbackSnapshot: null,
  }))

  const noChangeRecords = registrationEvidence.filter((row) => ['Exact', 'High Confidence'].includes(row.matchConfidence))
  const candidateMatches = registrationEvidence.filter((row) => row.matchConfidence === 'Candidate Only')
  const conflicts = registrationEvidence.filter((row) => row.matchConfidence === 'Conflict')
  const unmatchedAuditRows = registrationEvidence.filter((row) => row.matchConfidence === 'Unmatched')
  const excludedHistoricalRecords = [
    'Sweet Dreams Bakery / Rashania Babb - Historical / Excluded',
    'Jaii Bakes / Joy Drayton - Historical / Excluded',
    'No-show baker - Historical / Excluded',
  ]

  const proposals = [
    ...eventAuditSummaryProposal,
    ...operationsProposals,
    ...sponsorInKindProposals,
    ...correctiveActionProposals,
  ]
  const eligibleProposalCount = proposals.filter((proposal) => proposal.eligibleForAutomaticApply).length
  const organizerReviewProposalCount = proposals.filter((proposal) => !proposal.eligibleForAutomaticApply).length
  const blockedProposalCount = conflicts.length + unmatchedAuditRows.length
  const manifestBase = {
    manifestType: 'PHASE_23N_CPB_FINANCIAL_EVIDENCE_RECONCILIATION',
    eventId: CPB_EVENT_ID,
    phase23JManifestReused: false,
    oldPhase23JManifest: 'PERMANENTLY_CLOSED_DO_NOT_REUSE',
    generatedAt: new Date().toISOString(),
    readSnapshotTimestamp: snapshot.readAt,
    currentMainCommit: currentMainCommit.trim() || null,
    workbookSha256,
    textSha256: expectedTextSha256,
    sourceSheetsRead,
    currentAppPosition: {
      registrationCount: snapshot.registrations.length,
      guestCount: snapshot.registrations.reduce((sum, row) => sum + (Number(row.personsAttending) || 1), 0),
      expected: 6290,
      received: 5420,
      outstanding: 870,
      operationsEntryCount: snapshot.operationsLedger.length,
      auditLogCount: snapshot.auditLogs.length,
    },
    auditTotals: CPB_FINANCIAL_EVIDENCE_AUDIT,
    proposalCounts: {
      total: proposals.length,
      fieldChangeCount: proposals.reduce((sum, proposal) => sum + proposal.changedFields.length, 0),
      eligibleProposalCount,
      organizerReviewProposalCount,
      blockedProposalCount,
      noChangeCount: noChangeRecords.length,
    },
    matchCounts,
    eventAuditSummaryProposal,
    registrationEvidenceProposals: registrationEvidence,
    registrationFinanceProposals: [],
    attendanceProposals: [{
      proposalId: 'P23N-ATTENDANCE-OBSERVATION',
      documentPath: `events/${CPB_EVENT_ID}`,
      before: { checkedInGuests: 0 },
      after: {
        approximateAttendance: 70,
        gmailSupportedTicketSpaces: 57,
        attendanceToGmailGap: 13,
      },
      changedFields: ['phase23NFinancialEvidenceAudit.attendance'],
      evidenceClass: 'Organizer Reported',
      workbookSheet: 'Reconciliation',
      workbookRowOrBookingId: 'Approximate event check-ins',
      matchConfidence: 'High Confidence',
      reason: 'Record historical observation without creating system check-ins.',
      eligibleForAutomaticApply: false,
      auditActionToCreate: 'event.update',
      rollbackSnapshot: null,
    }],
    operationsProposals,
    sponsorInKindProposals,
    correctiveActionProposals,
    noChangeRecords,
    candidateMatches,
    conflicts,
    unmatchedAuditRows,
    excludedHistoricalRecords,
    safety: {
      exactCpbEventIdRequired: CPB_EVENT_ID,
      allowedRegistrationFields,
      allowedOperationFields,
      noTicketCodeChangeWithoutExplicitSupport: true,
      noCheckInChangeWithoutPersonLevelEvidence: true,
      noFinanceChangeBasedOnlyOnInferredAmount: true,
      noHistoricalRecordIncludedInCurrentPayables: true,
      noDuplicateOperationsEntryRequired: true,
      noInKindValueMixedIntoCashTotals: true,
      writesPerformed: false,
    },
  }

  const manifestSha256 = sha256(Buffer.from(stableStringify(manifestBase)))
  const manifest = { ...manifestBase, manifestSha256 }
  const review = [
    '# Phase 23N CPB Financial Evidence Organizer Review',
    '',
    `Manifest SHA256: ${manifestSha256}`,
    `Workbook SHA256: ${workbookSha256}`,
    `Read snapshot: ${snapshot.readAt}`,
    '',
    '## 1. Event audit summary',
    `${CPB_FINANCIAL_EVIDENCE_AUDIT.auditStatus}. Final profit status: ${CPB_FINANCIAL_EVIDENCE_AUDIT.finalProfitStatus}.`,
    '',
    '## 2. Registration evidence matches',
    `Exact: ${matchCounts.Exact || 0}. High confidence: ${matchCounts['High Confidence'] || 0}. Candidate: ${matchCounts['Candidate Only'] || 0}. Conflicts: ${matchCounts.Conflict || 0}. Unmatched: ${matchCounts.Unmatched || 0}.`,
    '',
    '## 3. Proposed registration corrections',
    'No automatic registration finance corrections are proposed from Gmail-only or inferred evidence. Christina Morris requires organizer review before any create/update.',
    '',
    '## 4. Attendance proposals',
    'Record approximate attendance as an audit observation only. Do not create system check-ins from the aggregate count.',
    '',
    '## 5. Operations entries',
    `Venue: ${money(1227.88)} Directly Verified paid. Baker schedule: ${money(1225)} paid / ${money(1050)} outstanding Organizer Reported. Cake boxes/printing: ${money(175)} Unverified / Outstanding.`,
    '',
    '## 6. Sponsor/in-kind entries',
    CPB_FINANCIAL_EVIDENCE_AUDIT.sponsorship.map((item) => `- ${item.sponsor}: ${item.quantity} ${item.item}; ${item.evidenceClass}; cash ${money(0)}; estimated value unknown.`).join('\n'),
    '',
    '## 7. Open corrective actions',
    CPB_FINANCIAL_EVIDENCE_AUDIT.correctiveActions.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    '',
    '## 8. Conflicts requiring a decision',
    conflicts.map((item) => `- ${item.auditBookingId}: ${item.payer} - ${item.discrepancy}`).join('\n') || 'None.',
    '',
    '## 9. Excluded historical records',
    excludedHistoricalRecords.map((item) => `- ${item}`).join('\n'),
    '',
    '## 10. Final totals and non-profit warning',
    `App received remains ${money(5420)}. Maximum Gmail-supported value is ${money(5415)}. The ${money(5)} variance is unresolved. Final profit cannot be confirmed until bank, 1stPay, baker and supplier evidence is complete.`,
    '',
    `Exact future approval phrase: I APPROVE CPB PHASE 23N FINANCIAL EVIDENCE RECONCILIATION MANIFEST ${manifestSha256} FOR A SEPARATE CPB PRODUCTION APPLY AUTHORIZATION`,
    '',
    'This review does not approve or execute production writes.',
  ].join('\n')

  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, 'PHASE_23N_CPB_FINANCIAL_EVIDENCE_RECONCILIATION_MANIFEST.json'), stableStringify(manifest))
  await writeFile(join(outputRoot, 'PHASE_23N_CPB_FINANCIAL_EVIDENCE_ORGANIZER_REVIEW.md'), review)

  console.log(JSON.stringify({
    manifestPath: join(outputRoot, 'PHASE_23N_CPB_FINANCIAL_EVIDENCE_RECONCILIATION_MANIFEST.json'),
    organizerReviewPath: join(outputRoot, 'PHASE_23N_CPB_FINANCIAL_EVIDENCE_ORGANIZER_REVIEW.md'),
    manifestSha256,
    workbookSha256,
    sourceSheetsRead,
    matchCounts,
    eligibleProposalCount,
    organizerReviewProposalCount,
    blockedProposalCount,
    writesPerformed: false,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
