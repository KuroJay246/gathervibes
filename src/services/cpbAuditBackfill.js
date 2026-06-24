import { normalizeTicketCode } from '../utils/ticketUtils.js'

export const CPB_AUDIT_REQUIRED_HEADERS = [
  'Ticket/Door ID',
  'Guest Name',
  'Buyer/Contact',
  'Price Tier',
  'Unit Price',
  'Amount Paid Confirmed',
  'Expected Total',
  'Balance/Due',
  'Payment Status',
  'Evidence Summary',
  'Confidence',
]

export const CPB_AUDIT_APPROVAL_TEXT = 'APPROVE CPB PAYMENT AUDIT'

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeContact(value) {
  return normalizeText(value).toLowerCase()
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function parseMoneyValue(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(String(value).replace(/[$,]/g, '').trim())
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0
}

function cell(row, header) {
  if (Array.isArray(row)) return row[header.index]
  if (Array.isArray(row?.data)) return row.data[header.index]
  return row?.[header.name]
}

function headerLookup(headers = []) {
  return headers.reduce((lookup, name, index) => {
    lookup[name] = { name, index }
    return lookup
  }, {})
}

export function workbookHeadersRecognized(headers = []) {
  const headerSet = new Set(headers.map((header) => normalizeText(header)))
  return CPB_AUDIT_REQUIRED_HEADERS.every((header) => headerSet.has(header))
}

export function normalizeAuditSheet(sheetOrRows) {
  if (Array.isArray(sheetOrRows)) {
    const [headers = [], ...rows] = sheetOrRows
    return { headers, rows }
  }
  return {
    headers: sheetOrRows?.headers || [],
    rows: sheetOrRows?.rows || [],
  }
}

function parseAuditRow(row, headers) {
  const lookup = headerLookup(headers)
  const value = (name) => normalizeText(cell(row, lookup[name] || { index: -1, name }))
  const money = (name) => parseMoneyValue(cell(row, lookup[name] || { index: -1, name }))

  return {
    sourceRegister: value('Source Register'),
    ticketDoorId: normalizeTicketCode(value('Ticket/Door ID')),
    guestName: value('Guest Name'),
    buyerContact: value('Buyer/Contact'),
    emailPhone: value('Email/Phone'),
    priceTier: value('Price Tier'),
    unitPrice: money('Unit Price'),
    amountPaidConfirmed: money('Amount Paid Confirmed'),
    expectedTotal: money('Expected Total'),
    balanceDue: money('Balance/Due'),
    paymentStatusText: value('Payment Status'),
    evidenceSummary: safeEvidenceSummary(value('Evidence Summary')),
    evidenceDate: value('Evidence Date'),
    gmailLinkPresent: Boolean(value('Gmail Link')),
    confidence: value('Confidence') || 'Low',
    notes: value('Notes'),
  }
}

export function safeEvidenceSummary(value = '') {
  return normalizeText(value)
    .replace(/https?:\/\/\S+/gi, '[link removed]')
    .replace(/\b\S+@gmail\.com\b/gi, '[gmail removed]')
    .slice(0, 500)
}

export function mapAuditPaymentStatus(statusText = '', priceTier = '') {
  const lower = statusText.toLowerCase()
  const tier = priceTier.toLowerCase()
  if (lower.includes('no gmail proof found')) return 'unknown'
  if (lower.includes('to pay at door')) return 'door-list'
  if (lower.includes('door/late paid')) return 'door'
  if (tier.includes('door') && lower.includes('paid') && lower.includes('confirmed')) return 'door'
  if (lower.includes('partial') || lower.includes('balance due')) return 'pending'
  if (lower.includes('paid') && lower.includes('confirmed')) return 'paid'
  return 'unknown'
}

export function mapAuditPaymentMethod(statusText = '', priceTier = '') {
  const lower = statusText.toLowerCase()
  const tier = priceTier.toLowerCase()
  if (lower.includes('to pay at door') || lower.includes('door/late paid')) return 'door'
  if (tier.includes('door') && lower.includes('paid') && lower.includes('confirmed')) return 'door'
  return 'unknown'
}

function confidenceRank(confidence = '') {
  const normalized = confidence.toLowerCase()
  if (normalized.includes('high')) return 'high'
  if (normalized.includes('medium')) return 'medium'
  return 'low'
}

function isExplicitCreateCandidate(auditData) {
  const guest = normalizeName(auditData.guestName)
  const buyer = normalizeName(auditData.buyerContact)
  const evidence = normalizeName(auditData.evidenceSummary)
  return guest.includes('christina morris')
    || buyer.includes('christina morris')
    || evidence.includes('gabriela') && (evidence.includes('third') || evidence.includes('guest 3') || evidence.includes('missing'))
}

function requestedReviewReasons(auditData) {
  const reasons = []
  const guest = normalizeName(auditData.guestName)
  const buyer = normalizeName(auditData.buyerContact)
  const status = auditData.paymentStatusText.toLowerCase()
  const confidence = confidenceRank(auditData.confidence)

  if (guest.includes('roger walcott') || buyer.includes('roger walcott') || status.includes('no gmail proof found')) {
    reasons.push('No Gmail proof found; organizer review required.')
  }
  if (guest.includes('tasiyah walcott') || guest.includes('janelle highland') || status.includes('price inferred')) {
    reasons.push('Price inferred; verify before applying.')
  }
  if (guest.includes('khadijah griffith') || guest.includes('shani leacock') || status.includes('partial')) {
    reasons.push('Partial payment or balance due; organizer review required.')
  }
  if (status.includes('register mismatch')) reasons.push('Register mismatch.')
  if (confidence !== 'high') reasons.push(`${confidence} confidence row.`)
  return reasons
}

function findByTicket(auditData, registrations) {
  if (!auditData.ticketDoorId) return null
  return registrations.find((registration) => normalizeTicketCode(registration.ticketCode) === auditData.ticketDoorId) || null
}

function findByName(auditData, registrations) {
  const auditName = normalizeName(auditData.guestName)
  if (!auditName) return null
  return registrations.find((registration) => normalizeName(registration.fullName) === auditName) || null
}

function findByBuyerGuest(auditData, registrations) {
  const auditBuyer = normalizeName(auditData.buyerContact)
  const auditGuest = normalizeName(auditData.guestName)
  if (!auditBuyer || !auditGuest) return null
  return registrations.find((registration) => (
    normalizeName(registration.buyerName) === auditBuyer
    && (
      normalizeName(registration.fullName) === auditGuest
      || (Array.isArray(registration.attendeeNames) && registration.attendeeNames.some((name) => normalizeName(name) === auditGuest))
    )
  )) || null
}

function findByContact(auditData, registrations) {
  const contact = normalizeContact(auditData.emailPhone)
  const contactPhone = normalizePhone(auditData.emailPhone)
  if (!contact && !contactPhone) return null
  return registrations.find((registration) => {
    const email = normalizeContact(registration.email)
    const phone = normalizePhone(registration.phone)
    return (email && contact.includes(email)) || (phone && contactPhone.includes(phone))
  }) || null
}

function findFuzzy(auditData, registrations) {
  const auditName = normalizeName(auditData.guestName)
  if (auditName.length < 5) return null
  return registrations.find((registration) => {
    const name = normalizeName(registration.fullName)
    return name.length >= 5 && (auditName.includes(name) || name.includes(auditName))
  }) || null
}

function matchAuditRow(auditData, registrations) {
  let registration = findByTicket(auditData, registrations)
  if (registration) return { registration, matchType: 'Exact ticket match', fuzzy: false }

  registration = findByName(auditData, registrations)
  if (registration) return { registration, matchType: 'Exact name match', fuzzy: false }

  registration = findByBuyerGuest(auditData, registrations)
  if (registration) return { registration, matchType: 'Buyer/guest match', fuzzy: false }

  registration = findByContact(auditData, registrations)
  if (registration) return { registration, matchType: 'Contact match', fuzzy: false }

  registration = findFuzzy(auditData, registrations)
  if (registration) return { registration, matchType: 'Needs review', fuzzy: true }

  return { registration: null, matchType: isExplicitCreateCandidate(auditData) ? 'Missing registration candidate' : 'Needs review', fuzzy: false }
}

function buildProposedUpdates(auditData, registration) {
  const updates = {
    priceTier: auditData.priceTier || registration?.priceTier || null,
    ticketPrice: auditData.unitPrice,
    amountDue: auditData.expectedTotal,
    amountPaid: auditData.amountPaidConfirmed,
    balanceDue: auditData.balanceDue,
    paymentStatus: mapAuditPaymentStatus(auditData.paymentStatusText, auditData.priceTier),
    paymentMethod: mapAuditPaymentMethod(auditData.paymentStatusText, auditData.priceTier),
    paymentReference: `PAYMENT-AUDIT:${auditData.ticketDoorId || normalizeName(auditData.guestName).replace(/\s+/g, '-').toUpperCase()}`,
  }

  if (auditData.buyerContact && (!registration || !registration.buyerName || normalizeName(registration.buyerName) === normalizeName(auditData.buyerContact))) {
    updates.buyerName = auditData.buyerContact
  }

  if (auditData.ticketDoorId && (!registration?.ticketCode || normalizeTicketCode(registration.ticketCode) === auditData.ticketDoorId)) {
    updates.ticketCode = auditData.ticketDoorId
  }

  if (auditData.evidenceSummary) {
    updates.notes = [`Payment audit evidence: ${auditData.evidenceSummary}`, 'No Gmail links stored.'].join('\n')
  }

  return updates
}

function currentValues(registration = {}) {
  registration = registration || {}
  return {
    priceTier: registration.priceTier || null,
    ticketPrice: registration.ticketPrice ?? null,
    amountDue: registration.amountDue ?? null,
    amountPaid: registration.amountPaid ?? null,
    balanceDue: registration.balanceDue ?? null,
    paymentStatus: registration.paymentStatus || null,
    paymentMethod: registration.paymentMethod || null,
    paymentReference: registration.paymentReference || null,
    ticketCode: registration.ticketCode || null,
    buyerName: registration.buyerName || null,
  }
}

function totalsComparison(rows) {
  const totals = {
    earlyBirdConfirmed: { rows: 0, amountPaid: 0 },
    generalConfirmed: { rows: 0, amountPaid: 0 },
    generalInferred: { rows: 0, amountPaid: 0 },
    partialGeneral: { rows: 0, amountPaid: 0, balanceDue: 0 },
    doorLatePaid: { rows: 0, amountPaid: 0 },
    doorToPay: { rows: 0, expectedTotal: 0 },
    all: { rows: rows.length, amountPaid: 0, expectedTotal: 0, balanceDue: 0 },
  }

  rows.forEach((auditData) => {
    const tier = auditData.priceTier.toLowerCase()
    const status = auditData.paymentStatusText.toLowerCase()
    totals.all.amountPaid += auditData.amountPaidConfirmed
    totals.all.expectedTotal += auditData.expectedTotal
    totals.all.balanceDue += auditData.balanceDue

    if (tier.includes('early') && status.includes('paid') && status.includes('confirmed')) {
      totals.earlyBirdConfirmed.rows += 1
      totals.earlyBirdConfirmed.amountPaid += auditData.amountPaidConfirmed
    } else if (tier.includes('general') && status.includes('price inferred')) {
      totals.generalInferred.rows += 1
      totals.generalInferred.amountPaid += auditData.amountPaidConfirmed
    } else if (tier.includes('general') && (status.includes('partial') || status.includes('balance due'))) {
      totals.partialGeneral.rows += 1
      totals.partialGeneral.amountPaid += auditData.amountPaidConfirmed
      totals.partialGeneral.balanceDue += auditData.balanceDue
    } else if (status.includes('door/late paid') || (tier.includes('door') && status.includes('paid') && status.includes('confirmed'))) {
      totals.doorLatePaid.rows += 1
      totals.doorLatePaid.amountPaid += auditData.amountPaidConfirmed
    } else if (status.includes('to pay at door')) {
      totals.doorToPay.rows += 1
      totals.doorToPay.expectedTotal += auditData.expectedTotal
    } else if (tier.includes('general') && status.includes('paid') && status.includes('confirmed')) {
      totals.generalConfirmed.rows += 1
      totals.generalConfirmed.amountPaid += auditData.amountPaidConfirmed
    }
  })

  return totals
}

export function generateAuditMatches(sheetOrRows, existingRegistrations = []) {
  const { headers, rows } = normalizeAuditSheet(sheetOrRows)
  if (!workbookHeadersRecognized(headers)) {
    throw new Error(`Payment Audit sheet is missing required headers: ${CPB_AUDIT_REQUIRED_HEADERS.join(', ')}`)
  }

  const results = {
    matches: [],
    unmatched: [],
    createCandidates: [],
    reviewNeeded: [],
    allRows: [],
    totals: {
      rowsProcessed: 0,
      matched: 0,
      unmatched: 0,
      reviewNeeded: 0,
      createCandidates: 0,
      amountPaid: 0,
      expectedTotal: 0,
      balanceDue: 0,
    },
    totalsComparison: null,
    writesPerformed: false,
  }

  const auditRows = rows
    .map((row) => parseAuditRow(row, headers))
    .filter((row) => row.guestName || row.ticketDoorId || row.buyerContact)

  results.totalsComparison = totalsComparison(auditRows)

  auditRows.forEach((auditData, index) => {
    const { registration, matchType, fuzzy } = matchAuditRow(auditData, existingRegistrations)
    const reviewReasons = requestedReviewReasons(auditData)

    if (fuzzy) reviewReasons.push('Fuzzy match; organizer review required.')
    if (!registration && matchType !== 'Missing registration candidate') reviewReasons.push('No matching registration found.')
    if (matchType === 'Missing registration candidate') reviewReasons.push('Missing registration candidate; do not auto-create.')

    if (registration?.ticketCode && auditData.ticketDoorId && normalizeTicketCode(registration.ticketCode) !== auditData.ticketDoorId) {
      reviewReasons.push(`Ticket conflict: current ${registration.ticketCode}, audit ${auditData.ticketDoorId}.`)
    }

    const proposedUpdates = buildProposedUpdates(auditData, registration)
    if (registration && registration.paymentStatus && proposedUpdates.paymentStatus !== 'unknown' && registration.paymentStatus !== proposedUpdates.paymentStatus) {
      reviewReasons.push(`Payment status changes from ${registration.paymentStatus} to ${proposedUpdates.paymentStatus}.`)
    }

    const item = {
      rowNumber: index + 2,
      auditData,
      matchedRegistration: registration,
      matchType,
      confidence: confidenceRank(auditData.confidence),
      needsReview: reviewReasons.length > 0 || matchType === 'Needs review' || matchType === 'Missing registration candidate',
      reviewReasons: [...new Set(reviewReasons)],
      currentValues: currentValues(registration),
      proposedUpdates,
    }

    results.allRows.push(item)
    results.totals.rowsProcessed += 1
    results.totals.amountPaid += auditData.amountPaidConfirmed
    results.totals.expectedTotal += auditData.expectedTotal
    results.totals.balanceDue += auditData.balanceDue

    if (item.needsReview) {
      results.reviewNeeded.push(item)
      results.totals.reviewNeeded += 1
    }

    if (matchType === 'Missing registration candidate') {
      results.createCandidates.push(item)
      results.totals.createCandidates += 1
    } else if (!registration) {
      results.unmatched.push(item)
      results.totals.unmatched += 1
    } else {
      results.matches.push(item)
      results.totals.matched += 1
    }
  })

  return results
}

export function buildDryRunReport(results) {
  const lines = [
    '# CPB Payment Audit Backfill Dry Run',
    '',
    'No Firestore writes were performed.',
    '',
    `Rows processed: ${results.totals.rowsProcessed}`,
    `Matched rows: ${results.totals.matched}`,
    `Unmatched rows: ${results.totals.unmatched}`,
    `Review-needed rows: ${results.totals.reviewNeeded}`,
    `Create candidates: ${results.totals.createCandidates}`,
    '',
    '## Totals Comparison',
  ]

  Object.entries(results.totalsComparison || {}).forEach(([key, value]) => {
    lines.push(`- ${key}: ${Object.entries(value).map(([field, amount]) => `${field} ${amount}`).join(', ')}`)
  })

  lines.push('', '## Review Needed')
  results.reviewNeeded.forEach((item) => {
    lines.push(`- Row ${item.rowNumber}: ${item.auditData.guestName || item.auditData.buyerContact} (${item.matchType}) - ${item.reviewReasons.join('; ')}`)
  })

  lines.push('', '## Create Candidates')
  results.createCandidates.forEach((item) => {
    lines.push(`- Row ${item.rowNumber}: ${item.auditData.guestName || item.auditData.buyerContact} - ${item.reviewReasons.join('; ')}`)
  })

  return lines.join('\n')
}

export function assertApplyApproval(confirmationText) {
  if (confirmationText !== CPB_AUDIT_APPROVAL_TEXT) {
    throw new Error(`Apply requires exact confirmation text: ${CPB_AUDIT_APPROVAL_TEXT}`)
  }
  return true
}
